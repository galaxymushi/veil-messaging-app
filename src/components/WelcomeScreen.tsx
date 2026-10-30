"use client";

import React, { useState } from "react";
import { Lock, ArrowRight, Info, Check, Code2, ArrowUpRight } from "lucide-react";

interface WelcomeScreenProps {
  onStart: () => void;
  onExploreDemo: () => void;
  onOpenHowItWorks: () => void;
  userName: string;
  setUserName: (name: string) => void;
  fingerprint: string;
}

const FEATURES = [
  { title: "No message database", body: "the server only brokers the handshake." },
  { title: "Single-use invites", body: "codes expire after ten minutes." },
  { title: "Ephemeral by default", body: "closing the tab wipes the conversation." },
];

export function WelcomeScreen({
  onStart,
  onExploreDemo,
  onOpenHowItWorks,
  userName,
  setUserName,
  fingerprint,
}: WelcomeScreenProps) {
  const [showIdentityHelp, setShowIdentityHelp] = useState(false);
  const initial = userName.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-5 sm:px-8">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200/80">
          <div className="flex items-center gap-2.5">
            <span className="brand-mark">
              <Lock className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-semibold tracking-[0.16em] text-gray-900">VEIL</span>
            <span className="hidden border-l border-gray-200 pl-3 text-xs text-gray-400 sm:inline">
              Private peer-to-peer messaging
            </span>
          </div>
          <button onClick={onOpenHowItWorks} className="btn btn-ghost text-xs">
            <Info className="h-3.5 w-3.5" />
            How it works
          </button>
        </header>

        <main className="grid flex-1 items-start gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-14">
          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-600">
              <span className="status-dot bg-emerald-500" />
              End-to-end encrypted · Nothing stored
            </div>

            <h1 className="mt-5 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-gray-900 sm:text-5xl">
              Private conversations,
              <br />
              <span className="text-gray-400">directly between browsers.</span>
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-600 sm:text-[15px]">
              VEIL opens a direct WebRTC channel between you and one peer. Messages live in this
              tab&apos;s memory and disappear when it closes — there is no chat database behind it.
            </p>
          </section>

          <section className="panel p-6 sm:p-7 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <div className="overline">Session identity</div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-gray-900">
              Set up your display name
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Shown only to the peer you pair with. Nothing is persisted.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-700">Display name</span>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                    {initial}
                  </div>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    maxLength={20}
                    placeholder="Choose a name"
                    className="field h-10 px-3 text-sm font-medium"
                  />
                </div>
              </label>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-gray-500">Session fingerprint</span>
                  <button
                    onClick={() => setShowIdentityHelp((v) => !v)}
                    className="font-mono text-[11px] text-gray-600 underline decoration-gray-300 underline-offset-2 hover:text-gray-900"
                  >
                    {fingerprint}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
                  {showIdentityHelp
                    ? "Derived from this session's keys, so it changes each time you return. Read it aloud to your peer to confirm you're talking to the right person."
                    : "Shared only with the peer you pair with."}
                </p>
              </div>

              <button onClick={onStart} className="btn btn-primary h-11 w-full">
                Enter secure session
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={onExploreDemo} className="btn btn-secondary h-10 w-full">
                Try the sandbox
              </button>
            </div>
          </section>

          <ul className="grid max-w-md gap-2.5 text-sm text-gray-600 sm:gap-3 lg:col-start-1 lg:row-start-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span>
                  <span className="font-medium text-gray-900">{feature.title}</span> — {feature.body}
                </span>
              </li>
            ))}
          </ul>
        </main>

        <footer className="flex shrink-0 flex-col gap-4 border-t border-gray-200/80 py-5 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://github.com/galaxymushi"
            target="_blank"
            rel="noreferrer"
            aria-label="Galaxy Mushi on GitHub"
            className="group flex items-center gap-2.5 self-start rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold tracking-wide text-white">
              GM
            </span>
            <span className="leading-tight">
              <span className="block text-xs font-medium text-gray-800 transition group-hover:text-indigo-700">
                Designed &amp; built by Galaxy Mushi
              </span>
              <span className="block text-[11px] text-gray-400">Independent project</span>
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 transition group-hover:text-indigo-500" />
          </a>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-400">
            <span>Signaling only sets up the connection. Message content never reaches it.</span>
            <a
              href="https://github.com/galaxymushi/veil-messaging-app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-gray-500 transition hover:text-gray-900"
            >
              <Code2 className="h-3.5 w-3.5" />
              Source
            </a>
            <span className="font-mono">DTLS/SCTP · WebRTC</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
