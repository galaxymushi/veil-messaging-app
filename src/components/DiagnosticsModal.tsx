"use client";

import React from "react";
import { Activity, X, Key, AlertTriangle } from "lucide-react";

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionType: "direct-p2p" | "demo-simulation";
  connectionStatus: string;
  myFingerprint: string;
  peerFingerprint: string;
  safetyNumber: string;
  iceTransportState?: string;
  rttMs?: number;
  packetsLost?: number;
  bytesSent?: number;
  bytesReceived?: number;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`text-right font-medium text-gray-800 ${mono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function DiagnosticsModal({
  isOpen,
  onClose,
  connectionType,
  connectionStatus,
  myFingerprint,
  peerFingerprint,
  safetyNumber,
  iceTransportState = "completed",
  rttMs = 18,
  packetsLost = 0,
  bytesSent = 4280,
  bytesReceived = 3850,
}: DiagnosticsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="veil-fade-in flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Connection diagnostics</h2>
              <p className="text-[11px] text-gray-500">Live WebRTC state for this session</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn -mr-1 h-8 w-8" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="panel-muted divide-y divide-gray-200/70 px-3.5">
            <Row
              label="Channel"
              value={connectionType === "direct-p2p" ? "WebRTC DataChannel" : "Simulated sandbox"}
            />
            <Row
              label="Status"
              value={<span className="capitalize text-emerald-700">{connectionStatus}</span>}
            />
            <Row label="ICE transport" value={iceTransportState} mono />
          </div>

          <div className="panel-muted px-3.5 py-3">
            <div className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-800">Identity verification</span>
            </div>
            <div className="mt-2 rounded-lg border border-gray-200 bg-white py-2.5 text-center font-mono text-sm font-semibold tracking-[0.16em] text-gray-900">
              {safetyNumber}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                <span className="overline">Your key</span>
                <div className="mt-0.5 truncate font-mono text-[10.5px] text-gray-700">{myFingerprint}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                <span className="overline">Peer key</span>
                <div className="mt-0.5 truncate font-mono text-[10.5px] text-gray-700">
                  {peerFingerprint || "Unknown"}
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-gray-500">
              Compare this number out-of-band to rule out a man-in-the-middle.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Latency", value: `${rttMs} ms` },
              { label: "Packets lost", value: String(packetsLost) },
              {
                label: "Sent / recv",
                value: `${(bytesSent / 1024).toFixed(1)}k / ${(bytesReceived / 1024).toFixed(1)}k`,
              },
            ].map((metric) => (
              <div key={metric.label} className="panel-muted px-2 py-2.5 text-center">
                <div className="text-[10px] text-gray-400">{metric.label}</div>
                <div className="mt-1 text-xs font-semibold text-gray-800">{metric.value}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2.5 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p>
              Messages travel directly over DTLS/SCTP. Nothing is stored on the server — but the
              connection ends when either tab closes.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50/60 px-5 py-3">
          <button onClick={onClose} className="btn btn-secondary h-9">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
