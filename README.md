<div align="center">

# VEIL

**End-to-end encrypted, peer-to-peer messaging.**

Messages travel **directly between two devices** over a WebRTC DataChannel.
The signaling server brokers the initial handshake and then gets out of the way —
it never sees, forwards, or stores message content.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://veil-messaging.vercel.app)

**▶ [Live demo](https://veil-messaging.vercel.app)**

</div>

---

## Table of contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Privacy model](#privacy-model)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Deployment](#deployment)
- [Signaling API](#signaling-api)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What it does

VEIL is a browser-based messenger with no accounts, no phone numbers, and no
message history on any server.

- **Pair in seconds.** One person creates an invite, the other scans a QR code
  or types a six-character code. The QR encodes a deep link, so scanning it on a
  phone joins the session automatically.
- **True peer-to-peer.** Once paired, messages flow over a WebRTC DataChannel
  directly between the two browsers. The server is not in the path.
- **Ephemeral by design.** Signaling envelopes live for 10 minutes and are
  deleted the moment the channel opens — and again automatically when they
  expire.
- **Verifiable safety numbers.** Each session shows a key fingerprint and safety
  number so both sides can confirm they are talking to the right person.
- **Sandbox Mode.** Explore the entire interface with a simulated conversation —
  useful for demos and for testing without a second participant.

---

## How it works

```
   Device A                          Server                         Device B
  (creator)                      (signaling only)                    (peer)
     │                                │                                │
     │  1. create ──────────────────► │  store offer + invite code     │
     │  ◄──────── sessionId, code ─── │                                │
     │                                │                                │
     │                    2. join ◄───┼────────────────────────────────│
     │  ◄──────────── offer SDP ──────┼──────── offer ────────────────►│
     │                                │                                │
     │  ◄── answer SDP + candidates ──┼──── 3. submit_answer ─────────►│
     │     4. poll ◄──────────────────┼──────────────────────────────► │
     │                                │                                │
     │ ══════════════════ 5. direct WebRTC DataChannel ═══════════════ │
     │      (messages never touch the server again)                    │
     │                                │                                │
     │  6. close ────────────────────►│  DELETE the signaling row      │
```

1. **Creator** generates an SDP offer and posts it to `/api/signaling` with
   `action: "create"`. The server returns a session ID and a short invite code.
2. **Peer** enters or scans the code (`action: "join"`) and receives the offer.
3. **Peer** generates an SDP answer and posts it back
   (`action: "submit_answer"`).
4. **Both sides** trickle ICE candidates (`action: "ice_candidate"`) and poll
   for the other side's (`action: "poll"`). The creator applies the peer's
   candidates; the peer applies the creator's. Both directions are required for
   ICE to negotiate a working path.
5. A **DataChannel opens** directly between the two browsers, DTLS-encrypted end
   to end. Every message after this point bypasses the server entirely.
6. Either side calls `action: "close"`, which deletes the signaling row
   immediately.

Expired sessions are also purged on every API request, so rows do not
accumulate.

---

## Privacy model

This section states plainly what VEIL does and does **not** protect.

| | |
|---|---|
| **Message content** | Never sent to the server. Encrypted end-to-end by DTLS over the DataChannel. |
| **Message history** | Not stored. No database table holds messages. |
| **Account** | None. No email, phone number, or username. |
| **Signaling data** | The server temporarily holds SDP blobs and ICE candidates. These contain network addresses, which reveal roughly where each participant is. They are deleted on `close` and automatically after 10 minutes. |
| **Metadata** | The server can observe that a handshake occurred and the IP addresses involved. It cannot read what is said. |
| **Identity** | Derived per session. Safety numbers are ephemeral, so there is no long-term identity to correlate across sessions. |

**Being honest about the limits:** VEIL uses STUN only, with no TURN relay. STUN
discovers your public address so peers can reach you directly. On networks with
symmetric NAT (common on some mobile carriers), no direct path exists and the
connection will not establish — roughly 10–15% of real-world pairs. Adding TURN
would fix that at the cost of routing through a third-party relay that can
observe connection metadata. That trade-off is deliberately left to the
operator rather than being made silently.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript 5.9](https://www.typescriptlang.org/) |
| UI | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Lucide](https://lucide.dev/) icons |
| Transport | WebRTC DataChannel (browser-native) |
| Signaling store | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/) |
| QR codes | [`qrcode.react`](https://github.com/zpao/qrcode.react) |
| Hosting | [Vercel](https://vercel.com/) + [Neon](https://neon.tech/) Postgres |

---

## Getting started

### Prerequisites

- Node.js **20+**
- A PostgreSQL database (any will do — [Neon](https://neon.tech) has a free tier)

### 1. Clone and install

```bash
git clone https://github.com/galaxymushi/veil-messaging-app.git
cd veil-messaging-app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Then set `DATABASE_URL` in `.env.local`. See [.env.example](.env.example).

### 3. Create the schema

```bash
npx drizzle-kit push
```

This creates the single `signaling_sessions` table.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check without emitting |

---

## Deployment

### Vercel + Neon

1. Push this repository to GitHub.
2. In Vercel, **Import** the repository — the Next.js preset is detected automatically.
3. Add the **Neon** integration from the Vercel Marketplace, or attach an existing Postgres database.
4. Set `DATABASE_URL` for the **Production** environment.
5. Push the schema once: `npx drizzle-kit push` against the production database.
6. Deploy.

Check the deployment with:

```bash
curl https://<your-domain>/api/health
# => {"ok":true}
```

No other environment variables are required.

---

## Signaling API

A single route, `POST /api/signaling`, dispatching on an `action` field.
It returns JSON and uses HTTP status codes for errors.

| Action | Purpose | Required fields | Notable responses |
|---|---|---|---|
| `create` | Create a session and store the SDP offer | `profile`, `offerSdp` | `sessionId`, `inviteCode`, `expiresAt` |
| `join` | Retrieve the offer for an invite code | `inviteCode` | `offerSdp`, `creatorFingerprint`, `creatorSafetyNumber` |
| `submit_answer` | Store the peer's SDP answer and mark the session paired | `sessionId`, `answerSdp`, `profile` | — |
| `ice_candidate` | Append a trickle ICE candidate | `sessionId`, `role`, `candidate` | — |
| `poll` | Fetch the answer and the **other** side's candidates | `sessionId`, `role` | `answerSdp`, `remoteCandidates` |
| `close` | Delete the session immediately | `sessionId` | — |

Errors: `400` malformed request · `404` unknown session or code ·
`409` invite already used · `410` invite code expired · `503` database not
configured · `500` internal error.

Invite codes are generated on the server with a CSPRNG. A code is single-use:
once a peer submits an answer, further joins are rejected with `409`.

`GET /api/health` returns `200 {"ok":true}` for liveness checks.

> `role` determines which side you are — `"creator"` or `"peer"`. On `poll`, the
> server returns the *opposite* side's candidate list, which is why both roles
> must poll.

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── health/route.ts        Liveness probe
│   │   └── signaling/route.ts     WebRTC signaling (the only backend logic)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   Screen routing, chat state, DataChannel wiring
├── components/
│   ├── ConnectScreen.tsx          Invite creation, QR, code entry, ICE handling
│   ├── CanvasQr.tsx               QR rendering
│   └── ...                        Inbox, chat, settings, diagnostics, welcome
├── db/
│   ├── index.ts                   Lazy Postgres connection
│   └── schema.ts                  signaling_sessions table
└── types/
    └── veil.ts                    Shared types
```

---

## Known limitations

- **No TURN relay.** Symmetric-NAT networks cannot be traversed. See the
  [privacy model](#privacy-model) for why this is currently deliberate.
- **Single device pairing is not possible.** Peer-to-peer requires two distinct
  network endpoints. Use **Sandbox Mode** to explore the app alone.
- **Session-scoped identity.** Safety numbers change between sessions by design,
  so there is no persistent identity to verify across conversations.

---

## Roadmap

- [ ] Delivery receipts and typing indicators over the existing DataChannel
- [ ] Message reactions and threaded replies
- [ ] Ephemeral file and image transfer, still peer-to-peer
- [ ] Vanishing messages with a configurable timer
- [ ] Optional TURN relay behind an explicit, operator-controlled toggle

---

## Contributing

Contributions are welcome. Please fork the repository and open a pull request
against `main`.

Before submitting:

```bash
npm run lint
npm run typecheck
npm run build
```

Bug reports and feature requests go in [Issues](https://github.com/galaxymushi/veil-messaging-app/issues).

---

## License

Distributed under the [MIT License](LICENSE).

---

<div align="center">
<sub>Built with WebRTC. No accounts. No servers in the message path.</sub>
</div>
