"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import { CanvasQr } from "./CanvasQr";
import { PeerProfile } from "@/types/veil";
import { generateSafetyNumber } from "@/lib/crypto";

interface ConnectScreenProps {
  onBack: () => void;
  myProfile: PeerProfile;
  onSessionEstablished: (peerSession: {
    peerName: string;
    peerFingerprint: string;
    peerSafetyNumber: string;
    connectionType: "direct-p2p" | "demo-simulation";
    dataChannel?: RTCDataChannel;
    peerConnection?: RTCPeerConnection;
  }) => void;
  /** Invite code carried in from a scanned QR link (?join=CODE). */
  initialJoinCode?: string;
}

export function ConnectScreen({
  onBack,
  myProfile,
  onSessionEstablished,
  initialJoinCode,
}: ConnectScreenProps) {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  // Create Invite State
  const [inviteCode, setInviteCode] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [pairingStatus, setPairingStatus] = useState<"idle" | "listening" | "paired" | "failed">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("Ready to create invitation.");

  // Join State
  const [inputCode, setInputCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  // Set once the peer has accepted an invite, so we can poll for the
  // creator's trickle ICE candidates (see the join poll effect below).
  const [joinSessionId, setJoinSessionId] = useState<string | null>(null);

  // WebRTC References
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  // Mutable mirror of sessionId so ICE handlers created before the session
  // exists can still upload candidates once it is created.
  const sessionIdRef = useRef<string>("");
  // Latest fingerprint advertised by the joining peer, captured from polling.
  const peerFingerprintRef = useRef<string>("");

  // Once the DataChannel is open the ephemeral signaling row has served its
  // purpose, so delete it immediately instead of waiting for the TTL.
  const closeSignalingSession = (id: string | null) => {
    if (!id) return;
    void fetch("/api/signaling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", sessionId: id }),
    }).catch(() => {});
  };

  // Generate Invite
  const handleCreateInvite = async () => {
    setIsGenerating(true);
    setStatusMessage("Initializing WebRTC peer offer & STUN ICE discovery...");

    try {
      // Setup WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      // Initiator creates data channel
      const dc = pc.createDataChannel("veil-secure-channel", {
        ordered: true,
      });

      setPeerConnection(pc);

      // Collect ICE candidates.
      // NOTE: sessionId state is stale inside this closure (it is still "" when
      // the handler is created), so we read it from a ref instead. Without this,
      // every candidate after session creation fell into the buffer below and was
      // never uploaded — leaving peerIceCandidates/creatorIceCandidates empty and
      // the DataChannel unable to open.
      const pendingCandidates: RTCIceCandidate[] = [];
      sessionIdRef.current = "";
      const uploadCandidate = async (sid: string, cand: RTCIceCandidate) => {
        try {
          await fetch("/api/signaling", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "ice_candidate",
              sessionId: sid,
              role: "creator",
              candidate: cand,
            }),
          });
        } catch {
          // non-fatal candidate upload
        }
      };

      pc.onicecandidate = async (event) => {
        if (!event.candidate) return;
        const sid = sessionIdRef.current;
        if (sid) {
          await uploadCandidate(sid, event.candidate);
        } else {
          pendingCandidates.push(event.candidate);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Post offer to ephemeral signaling
      const res = await fetch("/api/signaling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          profile: myProfile,
          offerSdp: offer,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setInviteCode(data.inviteCode);
        setSessionId(data.sessionId);
        setPairingStatus("listening");
        setStatusMessage("Waiting for peer to scan QR or enter code...");
        setTimeLeft(600);

        // The ref must be set BEFORE flushing: any candidate arriving in the
        // meantime now uploads directly instead of falling back into the buffer.
        sessionIdRef.current = data.sessionId;

        // Upload any buffered candidates gathered before the session existed
        const buffered = pendingCandidates.splice(0, pendingCandidates.length);
        for (const cand of buffered) {
          await uploadCandidate(data.sessionId, cand);
        }

        // Setup DC callbacks
        dc.onopen = async () => {
          setPairingStatus("paired");
          setStatusMessage("Direct WebRTC DataChannel established!");

          // The poll that delivered the answer also carried the peer's
          // fingerprint, so it is normally already cached. Only fall back to a
          // fresh request if it is missing — awaiting here would delay wiring
          // up the channel and could drop the peer's introductory message.
          let remoteFingerprint = peerFingerprintRef.current;
          if (!remoteFingerprint) {
            try {
              const infoRes = await fetch("/api/signaling", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "poll",
                  sessionId: data.sessionId,
                  role: "creator",
                }),
              });
              if (infoRes.ok) {
                const info = await infoRes.json();
                if (info?.success && typeof info.peerFingerprint === "string") {
                  remoteFingerprint = info.peerFingerprint;
                }
              }
            } catch {
              // fall back to the placeholder below
            }
          }

          if (!remoteFingerprint) remoteFingerprint = "0000:0000:0000:0000";

          onSessionEstablished({
            peerName: `Peer ${data.inviteCode.slice(0, 4)}`,
            peerFingerprint: remoteFingerprint,
            peerSafetyNumber: generateSafetyNumber(myProfile.fingerprint, remoteFingerprint),
            connectionType: "direct-p2p",
            dataChannel: dc,
            peerConnection: pc,
          });

          closeSignalingSession(data.sessionId);
        };

        // Do not sit on "Exchanging keys..." forever if the peer never connects
        setTimeout(() => {
          if (dc.readyState !== "open") {
            setStatusMessage("Still waiting for your peer to accept — code expires soon.");
          }
        }, 30000);
      } else {
        setStatusMessage("Signaling error: " + (data.error || "Failed to initialize"));
      }
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage("WebRTC error or network restricted. Sandbox mode available.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Poll for Answer SDP if waiting
  useEffect(() => {
    if (pairingStatus !== "listening" || !sessionId) return;

    // Candidates are returned in full on every poll, so track what we have
    // already applied instead of re-adding them each cycle.
    const added = new Set<string>();

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/signaling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "poll",
            sessionId,
            role: "creator",
          }),
        });

        if (res.status === 404) {
          clearInterval(interval);
          peerConnection?.close();
          setPairingStatus("failed");
          setStatusMessage("This invite expired or was closed. Create a new invite to try again.");
          return;
        }

        const data = await res.json();
        if (!data.success) return;

        if (typeof data.peerFingerprint === "string") {
          peerFingerprintRef.current = data.peerFingerprint;
        }

        if (data.answerSdp && peerConnection) {
          if (peerConnection.signalingState === "have-local-offer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answerSdp));
            setStatusMessage("Exchanging direct peer cryptographic keys...");
          }

          if (data.remoteCandidates && Array.isArray(data.remoteCandidates)) {
            for (const c of data.remoteCandidates) {
              const key = JSON.stringify(c);
              if (added.has(key)) continue;
              added.add(key);
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(c));
              } catch {
                // ignore malformed or duplicate candidate
              }
            }
          }
        }
      } catch {
        // ignore polling network errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pairingStatus, sessionId, peerConnection]);

  // Poll for the CREATOR's ICE candidates while we are the joining peer.
  // Without this, only one side ever learns the other's candidates, so ICE
  // cannot form a working pair and the DataChannel never opens.
  useEffect(() => {
    if (!joinSessionId || !peerConnection) return;

    const added = new Set<string>();

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/signaling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "poll",
            sessionId: joinSessionId,
            role: "peer",
          }),
        });

        const data = await res.json();
        if (!data.success || !Array.isArray(data.remoteCandidates)) return;

        for (const c of data.remoteCandidates) {
          const key = JSON.stringify(c);
          if (added.has(key)) continue;
          added.add(key);
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(c));
          } catch {
            // ignore malformed or duplicate candidate
          }
        }
      } catch {
        // ignore polling network errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [joinSessionId, peerConnection]);

  // Timer countdown
  useEffect(() => {
    if (pairingStatus !== "listening" || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [pairingStatus, timeLeft]);

  // Join Existing Invite
  const joinWithCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code || isJoining) return;
    setIsJoining(true);
    setJoinError(null);

    try {
      const res = await fetch("/api/signaling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          inviteCode: code,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setJoinError(data.error || "Could not find invitation. Check code or expiration.");
        setIsJoining(false);
        return;
      }

      // Initialize peer connection to answer offer
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      const creatorFingerprint =
        typeof data.creatorFingerprint === "string" && data.creatorFingerprint
          ? data.creatorFingerprint
          : "0000:0000:0000:0000";

      let receivedChannel: RTCDataChannel | null = null;
      pc.ondatachannel = (ev) => {
        receivedChannel = ev.channel;
        receivedChannel.onopen = () => {
          onSessionEstablished({
            peerName: `Peer ${code.slice(0, 4)}`,
            peerFingerprint: creatorFingerprint,
            // Both sides derive this from the same fingerprint pair, so the
            // numbers actually match when read aloud.
            peerSafetyNumber: generateSafetyNumber(myProfile.fingerprint, creatorFingerprint),
            connectionType: "direct-p2p",
            dataChannel: receivedChannel || undefined,
            peerConnection: pc,
          });
          closeSignalingSession(data.sessionId);
        };
      };

      pc.onicecandidate = async (ev) => {
        if (ev.candidate) {
          await fetch("/api/signaling", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "ice_candidate",
              sessionId: data.sessionId,
              role: "peer",
              candidate: ev.candidate,
            }),
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(data.offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Expose this connection so the join poll effect can apply the
      // creator's ICE candidates as they trickle in.
      setPeerConnection(pc);
      setJoinSessionId(data.sessionId);

      // Submit answer
      await fetch("/api/signaling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_answer",
          sessionId: data.sessionId,
          answerSdp: answer,
          profile: myProfile,
        }),
      });

      // Wait for the STUN handshake. If the DataChannel never opens we must
      // NOT claim success: the previous fallback reported connectionType
      // "direct-p2p" with no channel, so messages silently went nowhere.
      setTimeout(() => {
        if (receivedChannel && receivedChannel.readyState === "open") {
          // ondatachannel.onopen already handled the success path
          return;
        }
        setJoinError(
          "Direct connection could not be established within 15s. Your network may block P2P traffic. " +
            "Ask your peer to retry, or use Sandbox Mode to explore the app."
        );
        setStatusMessage("Handshake incomplete — no data channel opened.");
        setIsJoining(false);
      }, 15000);
    } catch (err: unknown) {
      console.error(err);
      setJoinError("Connection handshake timed out or network blocked direct P2P. Try Sandbox Mode.");
      setIsJoining(false);
    }
  };

  const handleJoinInvite = (e: React.FormEvent) => {
    e.preventDefault();
    joinWithCode(inputCode);
  };

  // Auto-join when arriving from a scanned QR link (?join=CODE)
  const autoJoinAttempted = React.useRef(false);
  useEffect(() => {
    const code = initialJoinCode?.trim().toUpperCase();
    if (!code || autoJoinAttempted.current) return;
    autoJoinAttempted.current = true;
    setActiveTab("join");
    setInputCode(code);
    joinWithCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJoinCode]);

  const handleCancel = () => {
    peerConnection?.close();
    closeSignalingSession(sessionId || joinSessionId);
    onBack();
  };

  const handleNewInvite = () => {
    peerConnection?.close();
    setPeerConnection(null);
    sessionIdRef.current = "";
    peerFingerprintRef.current = "";
    setInviteCode("");
    setSessionId("");
    setPairingStatus("idle");
    setStatusMessage("Ready to create invitation.");
    setTimeLeft(600);
    void handleCreateInvite();
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatMinutes = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // QR payload: a full link so scanning with any phone camera opens the app
  // with the invite code pre-filled on the peer's device.
  const qrPayload =
    typeof window !== "undefined" && inviteCode
      ? `${window.location.origin}/?join=${inviteCode}`
      : inviteCode;

  const openSandbox = () => {
    onSessionEstablished({
      peerName: "Alex (Sandbox)",
      peerFingerprint: "F7A1:88B2:3490:0021",
      peerSafetyNumber: "9182 3019 4482",
      connectionType: "demo-simulation",
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="app-header shrink-0">
        <div className="mx-auto flex min-h-16 w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={handleCancel} className="icon-btn" aria-label="Back to inbox">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Connect</h1>
              <p className="text-[11px] text-gray-500">Direct WebRTC pairing</p>
            </div>
          </div>

          <div className="segmented">
            <button data-active={activeTab === "create"} onClick={() => setActiveTab("create")}>
              Create invite
            </button>
            <button data-active={activeTab === "join"} onClick={() => setActiveTab("join")}>
              Enter code
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <div className="panel overflow-hidden">
            {activeTab === "create" ? (
              inviteCode ? (
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="overline">Step 1 · Invite ready</div>
                      <h2 className="mt-1 text-base font-semibold text-gray-900">
                        Share this code with your peer
                      </h2>
                    </div>
                    <div
                      className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        pairingStatus === "failed"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <span
                        className={`status-dot ${
                          pairingStatus === "failed" ? "bg-rose-500" : "bg-emerald-500 status-dot-pulse"
                        }`}
                      />
                      {pairingStatus === "failed" ? "Invite closed" : "Listening for peer"}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
                    <CanvasQr text={qrPayload} size={168} />

                    <div className="min-w-0 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center font-mono text-2xl font-semibold tracking-[0.2em] text-gray-900">
                          {inviteCode}
                        </div>
                        <button
                          onClick={handleCopyCode}
                          className="icon-btn h-[46px] w-[46px]"
                          title="Copy invite code"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          Expires in
                          <span className="font-mono font-medium text-gray-700">{formatMinutes(timeLeft)}</span>
                        </span>
                        <span className="font-mono">single use</span>
                      </div>

                      <p className="text-[11px] leading-relaxed text-gray-500">{statusMessage}</p>

                      {pairingStatus === "failed" && (
                        <button onClick={handleNewInvite} className="btn btn-secondary h-9">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Create a new invite
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center sm:p-10">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-gray-900">Create a single-use invite</h2>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
                    Generates an ephemeral WebRTC offer. Share the code or QR with your peer — the
                    handshake expires after ten minutes.
                  </p>

                  <button
                    onClick={handleCreateInvite}
                    disabled={isGenerating}
                    className="btn btn-primary mt-6 h-10 px-5"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Creating session…
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        Create invite
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-[11px] text-gray-400">No account. No history. One peer only.</p>
                </div>
              )
            ) : (
              <div className="p-6 sm:p-8">
                <div className="text-center">
                  <h2 className="text-base font-semibold text-gray-900">Enter your peer&apos;s code</h2>
                  <p className="mt-1 text-xs text-gray-500">Six characters, provided by the host.</p>
                </div>

                <form onSubmit={handleJoinInvite} className="mx-auto mt-5 max-w-sm space-y-3">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="7K4MZP"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    autoComplete="off"
                    spellCheck={false}
                    className="field h-12 px-4 text-center font-mono text-xl font-semibold uppercase tracking-[0.25em]"
                  />

                  {joinError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700">
                      {joinError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isJoining || !inputCode.trim()}
                    className="btn btn-primary h-11 w-full"
                  >
                    {isJoining ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Connect
                      </>
                    )}
                  </button>
                </form>

                <div className="mx-auto mt-4 flex max-w-sm items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                  <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  Keep this tab open — the direct channel only exists while both browsers are
                  connected.
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-2.5 text-[11px] leading-relaxed text-gray-500 sm:px-6">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
              <p>
                Only ephemeral SDP handshakes pass through signaling. Message content travels
                browser to browser and is never recorded.
              </p>
            </div>
          </div>

          <div className="panel mt-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-gray-900">Testing on one device?</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Open a simulated peer to explore the interface.
                </p>
              </div>
              <button onClick={openSandbox} className="btn btn-secondary h-9">
                <Sparkles className="h-3.5 w-3.5" />
                Open sandbox peer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
