"use client";

import React, { useState } from "react";
import { ArrowLeft, Lock, Clock, Bell, BellOff, Trash2, Check, Shield } from "lucide-react";

interface SettingsScreenProps {
  onBack: () => void;
  onClearAllMemory: () => void;
  defaultTimer: number;
  setDefaultTimer: (s: number) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  fingerprint: string;
  safetyNumber: string;
}

const TIMERS = [
  { label: "Off", val: 0 },
  { label: "30s", val: 30 },
  { label: "5m", val: 300 },
  { label: "1h", val: 3600 },
];

export function SettingsScreen({
  onBack,
  onClearAllMemory,
  defaultTimer,
  setDefaultTimer,
  notificationsEnabled,
  setNotificationsEnabled,
  fingerprint,
  safetyNumber,
}: SettingsScreenProps) {
  const [clearedConfirm, setClearedConfirm] = useState(false);

  const handleClear = () => {
    onClearAllMemory();
    setClearedConfirm(true);
    setTimeout(() => setClearedConfirm(false), 2500);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="app-header shrink-0">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <button onClick={onBack} className="icon-btn" aria-label="Back to inbox">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Settings</h1>
            <p className="text-[11px] text-gray-500">Privacy and session controls</p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
          <div className="panel overflow-hidden">
            {/* Identity */}
            <section className="border-b border-gray-100 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">Session identity</h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                Generated for this tab. A new fingerprint appears every time you return.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="panel-muted px-3.5 py-3">
                  <span className="overline">Fingerprint</span>
                  <div className="mt-1 font-mono text-xs font-medium text-gray-800">{fingerprint}</div>
                </div>
                <div className="panel-muted px-3.5 py-3">
                  <span className="overline">Default safety number</span>
                  <div className="mt-1 font-mono text-xs font-medium tracking-wider text-gray-800">
                    {safetyNumber}
                  </div>
                </div>
              </div>
            </section>

            {/* Timer */}
            <section className="border-b border-gray-100 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">Disappearing messages</h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                How long new messages stay in browser memory after being read.
              </p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {TIMERS.map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setDefaultTimer(item.val)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      defaultTimer === item.val
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Notifications */}
            <section className="flex items-center justify-between gap-4 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  {notificationsEnabled ? (
                    <Bell className="h-4 w-4 text-gray-400" />
                  ) : (
                    <BellOff className="h-4 w-4 text-gray-400" />
                  )}
                  <h2 className="text-sm font-semibold text-gray-900">Sounds and alerts</h2>
                </div>
                <p className="mt-1 text-xs text-gray-500">Audio feedback when a peer message arrives.</p>
              </div>

              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label="Toggle sounds and alerts"
                className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
                  notificationsEnabled ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    notificationsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </section>
          </div>

          {/* Disclosures */}
          <div className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">What this app does and doesn&apos;t do</h2>
            </div>

            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-gray-600">
              <li>
                <span className="font-medium text-gray-900">No message database.</span> Message contents travel
                browser-to-browser over WebRTC. The server never sees, relays, or stores them.
              </li>
              <li>
                <span className="font-medium text-gray-900">Signaling is required.</span> A lightweight server and
                STUN relays negotiate the connection; peer IP addresses may be visible to them.
              </li>
              <li>
                <span className="font-medium text-gray-900">No offline delivery.</span> With zero retention,
                messages cannot arrive if the other tab is closed.
              </li>
              <li>
                <span className="font-medium text-gray-900">Screenshots still exist.</span> Disappearing messages
                clear browser memory, not external captures.
              </li>
            </ul>
          </div>

          {/* Panic wipe */}
          <div className="panel border-rose-200/70 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-semibold text-rose-700">Panic wipe</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Instantly wipe all conversations, message queues, and peer connections from memory.
            </p>

            <button onClick={handleClear} className="btn btn-danger mt-4 h-9 w-full sm:w-auto">
              {clearedConfirm ? (
                <>
                  <Check className="h-4 w-4" />
                  Memory wiped
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Wipe all chat memory
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
