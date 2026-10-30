import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomInt } from "node:crypto";
import { db } from "@/db";
import { signalingSessions } from "@/db/schema";
import { eq, lt } from "drizzle-orm";

// 10 minutes session TTL
const SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_SDP_LENGTH = 200_000;
const MAX_CANDIDATE_LENGTH = 8_000;
const MAX_CANDIDATES = 200;
// Unambiguous alphabet: no 0/O or 1/I.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function createSessionId(): string {
  return `veil-sess-${randomBytes(9).toString("hex")}`;
}

function sanitizeText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function parseSdp(value: unknown): { type: string; sdp: string } | null {
  if (!value || typeof value !== "object") return null;
  const { type, sdp } = value as { type?: unknown; sdp?: unknown };
  if (typeof type !== "string" || typeof sdp !== "string") return null;
  if (!sdp || sdp.length > MAX_SDP_LENGTH) return null;
  return { type, sdp };
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseCandidates(value: string | null): unknown[] {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Signaling is not configured on this server (DATABASE_URL is missing)." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
    }

    const { action, inviteCode, sessionId, profile, offerSdp, answerSdp, candidate, role } = body as Record<
      string,
      unknown
    >;
    const now = new Date();

    // Best-effort cleanup of expired envelopes on every request.
    try {
      await db.delete(signalingSessions).where(lt(signalingSessions.expiresAt, now));
    } catch {
      // If cleanup fails, the action below will surface any real DB problem.
    }

    // 1. CREATE SESSION: Initiator creates an invite and WebRTC offer
    if (action === "create") {
      const offer = parseSdp(offerSdp);
      if (!offer) {
        return NextResponse.json({ error: "A valid WebRTC offer is required" }, { status: 400 });
      }

      const profileObj = (profile && typeof profile === "object" ? profile : {}) as Record<string, unknown>;
      const creatorFingerprint = sanitizeText(profileObj.fingerprint, 64) || "0000:0000:0000:0000";
      const creatorSafetyNumber = sanitizeText(profileObj.safetyNumber, 64);
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

      // Invite codes are generated server-side from a CSPRNG. Retry on the
      // (rare) unique-constraint collision instead of failing the request.
      for (let attempt = 0; attempt < 5; attempt++) {
        const newSessionId = createSessionId();
        const generatedCode = generateInviteCode();

        try {
          await db.insert(signalingSessions).values({
            id: newSessionId,
            inviteCode: generatedCode,
            creatorFingerprint,
            creatorSafetyNumber,
            status: "waiting",
            offerSdp: JSON.stringify(offer),
            answerSdp: null,
            creatorIceCandidates: "[]",
            peerIceCandidates: "[]",
            expiresAt,
            createdAt: now,
            updatedAt: now,
          });

          return NextResponse.json({
            success: true,
            sessionId: newSessionId,
            inviteCode: generatedCode,
            expiresAt: expiresAt.toISOString(),
          });
        } catch (error) {
          if (isUniqueViolation(error) && attempt < 4) continue;
          throw error;
        }
      }

      return NextResponse.json({ error: "Could not allocate an invite code" }, { status: 500 });
    }

    // 2. JOIN SESSION: Recipient uses invite code to fetch the offer
    if (action === "join") {
      const cleanCode = sanitizeText(inviteCode, 16).trim().toUpperCase();
      if (!/^[A-Z0-9]{4,16}$/.test(cleanCode)) {
        return NextResponse.json({ error: "Enter a valid invitation code." }, { status: 400 });
      }

      const sessions = await db
        .select()
        .from(signalingSessions)
        .where(eq(signalingSessions.inviteCode, cleanCode))
        .limit(1);

      const session = sessions[0];
      if (!session) {
        return NextResponse.json({ error: "Invalid or expired invitation code." }, { status: 404 });
      }

      if (new Date(session.expiresAt).getTime() <= now.getTime()) {
        return NextResponse.json({ error: "This invitation code has expired (10m TTL)." }, { status: 410 });
      }

      if (session.status === "paired") {
        return NextResponse.json(
          { error: "This invitation has already been used. Ask your peer for a new code." },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        inviteCode: session.inviteCode,
        status: session.status,
        offerSdp: parseJson<unknown>(session.offerSdp, null),
        creatorFingerprint: session.creatorFingerprint,
        creatorSafetyNumber: session.creatorSafetyNumber,
      });
    }

    // 3. SUBMIT ANSWER: Recipient submits WebRTC answer SDP
    if (action === "submit_answer") {
      const answer = parseSdp(answerSdp);
      if (typeof sessionId !== "string" || !sessionId || !answer) {
        return NextResponse.json({ error: "Session ID and a valid answer SDP are required" }, { status: 400 });
      }

      const sessions = await db
        .select()
        .from(signalingSessions)
        .where(eq(signalingSessions.id, sessionId))
        .limit(1);
      const session = sessions[0];
      if (!session) {
        return NextResponse.json({ error: "Session not found or expired" }, { status: 404 });
      }
      if (session.status === "paired") {
        return NextResponse.json({ error: "This invitation has already been used." }, { status: 409 });
      }

      const profileObj = (profile && typeof profile === "object" ? profile : {}) as Record<string, unknown>;

      await db
        .update(signalingSessions)
        .set({
          answerSdp: JSON.stringify(answer),
          peerFingerprint: sanitizeText(profileObj.fingerprint, 64) || "PEER-FINGERPRINT",
          peerSafetyNumber: sanitizeText(profileObj.safetyNumber, 64),
          status: "paired",
          updatedAt: now,
        })
        .where(eq(signalingSessions.id, sessionId));

      return NextResponse.json({ success: true, message: "Answer SDP registered" });
    }

    // 4. ADD ICE CANDIDATE
    if (action === "ice_candidate") {
      if (typeof sessionId !== "string" || !sessionId) {
        return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
      }
      if (role !== "creator" && role !== "peer") {
        return NextResponse.json({ error: 'role must be "creator" or "peer"' }, { status: 400 });
      }
      if (!candidate || typeof candidate !== "object") {
        return NextResponse.json({ error: "A valid ICE candidate is required" }, { status: 400 });
      }

      let serializedCandidate: string;
      try {
        serializedCandidate = JSON.stringify(candidate);
      } catch {
        return NextResponse.json({ error: "ICE candidate could not be serialized" }, { status: 400 });
      }
      if (serializedCandidate.length > MAX_CANDIDATE_LENGTH) {
        return NextResponse.json({ error: "ICE candidate is too large" }, { status: 413 });
      }

      const sessions = await db
        .select()
        .from(signalingSessions)
        .where(eq(signalingSessions.id, sessionId))
        .limit(1);
      const session = sessions[0];
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const isCreator = role === "creator";
      const currentList = parseCandidates(isCreator ? session.creatorIceCandidates : session.peerIceCandidates);

      if (currentList.length >= MAX_CANDIDATES) {
        return NextResponse.json({ success: true, message: "Candidate limit reached; ignored" });
      }

      currentList.push(candidate);

      await db
        .update(signalingSessions)
        .set({
          [isCreator ? "creatorIceCandidates" : "peerIceCandidates"]: JSON.stringify(currentList),
          updatedAt: now,
        })
        .where(eq(signalingSessions.id, sessionId));

      return NextResponse.json({ success: true });
    }

    // 5. POLL STATE: Check for answer SDP and the other side's ICE candidates
    if (action === "poll") {
      if (typeof sessionId !== "string" || !sessionId) {
        return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
      }
      if (role !== "creator" && role !== "peer") {
        return NextResponse.json({ error: 'role must be "creator" or "peer"' }, { status: 400 });
      }

      const sessions = await db
        .select()
        .from(signalingSessions)
        .where(eq(signalingSessions.id, sessionId))
        .limit(1);
      const session = sessions[0];
      if (!session) {
        return NextResponse.json({ error: "Session ended or not found" }, { status: 404 });
      }

      const isCreator = role === "creator";

      return NextResponse.json({
        success: true,
        status: session.status,
        answerSdp: parseJson<unknown>(session.answerSdp, null),
        remoteCandidates: parseCandidates(isCreator ? session.peerIceCandidates : session.creatorIceCandidates),
        peerFingerprint: session.peerFingerprint,
        peerSafetyNumber: session.peerSafetyNumber,
      });
    }

    // 6. CLOSE SESSION: Destroy the temporary signaling envelope
    if (action === "close") {
      if (typeof sessionId === "string" && sessionId) {
        await db.delete(signalingSessions).where(eq(signalingSessions.id, sessionId));
      }
      return NextResponse.json({ success: true, message: "Signaling envelope deleted." });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    // Log details server-side but do not leak internals to clients.
    console.error("Signaling API error:", error);
    return NextResponse.json({ error: "Internal signaling error" }, { status: 500 });
  }
}
