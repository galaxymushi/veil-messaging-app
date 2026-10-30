"use client";

import React from "react";
import { X, ShieldCheck, AlertTriangle } from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Invite",
    body: "You make a six-character code or QR. It carries a WebRTC offer — no messages, no address book, no history.",
  },
  {
    title: "Handshake",
    body: "The server relays the offer, answer and ICE candidates so the two browsers can find each other. It never receives message content.",
  },
  {
    title: "Direct",
    body: "The browsers connect over DTLS/SCTP and the signaling record is deleted. Everything sent after that skips the server entirely.",
  },
];

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="veil-fade-in flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">How it works</h2>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Where your messages travel — and where they don&apos;t.
            </p>
          </div>
          <button onClick={onClose} className="icon-btn -mr-1 h-8 w-8" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 text-xs leading-relaxed text-gray-600">
          <ol className="relative space-y-4 border-l border-gray-200 pl-5 ml-1.5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <span className="absolute -left-[30.5px] top-0 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-semibold text-gray-600">
                  {i + 1}
                </span>
                <div className="text-sm font-semibold text-gray-900">{step.title}</div>
                <p className="mt-1">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p>
              <span className="font-medium text-gray-900">Safety numbers.</span> Every session shows
              a twelve-digit number derived from both keys. Read it to each other over the phone or
              in person — that is what proves nobody is sitting in the middle.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-amber-950">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Where this falls short
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[11px]">
              <li>
                A signaling service and STUN servers are required to set up the connection, so this
                is not &quot;zero servers&quot;.
              </li>
              <li>
                There is no TURN relay. On networks that block direct connections, pairing will
                fail rather than fall back to a third-party relay.
              </li>
              <li>
                Nothing is stored or forwarded — the other person needs their tab open to receive
                anything.
              </li>
              <li>
                Deleting a message clears memory on both devices, but it cannot erase a photo of
                the screen.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50/60 px-5 py-3">
          <button onClick={onClose} className="btn btn-primary h-9">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
