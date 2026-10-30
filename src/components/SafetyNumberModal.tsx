"use client";

import React, { useState } from "react";
import { ShieldCheck, Copy, Check, X } from "lucide-react";

interface SafetyNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerName: string;
  safetyNumber: string;
  myFingerprint: string;
  peerFingerprint: string;
  onMarkVerified?: () => void;
  isVerified?: boolean;
}

export function SafetyNumberModal({
  isOpen,
  onClose,
  peerName,
  safetyNumber,
  myFingerprint,
  peerFingerprint,
  onMarkVerified,
  isVerified = false,
}: SafetyNumberModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="veil-fade-in w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Verify safety number</h2>
              <p className="text-[11px] text-gray-500">Confirm both devices derive the same code</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn -mr-1 h-8 w-8" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-xs leading-relaxed text-gray-600">
            Read this number aloud to <span className="font-medium text-gray-900">{peerName}</span> or
            compare screens. Both sides must show the identical value.
          </p>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-center">
            <div className="font-mono text-2xl font-semibold tracking-[0.18em] text-gray-900">
              {safetyNumber}
            </div>
            <button
              onClick={handleCopy}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="panel-muted px-3 py-2.5">
              <span className="overline">Your key</span>
              <div className="mt-1 truncate font-mono text-[11px] text-gray-700">{myFingerprint}</div>
            </div>
            <div className="panel-muted px-3 py-2.5">
              <span className="overline">{peerName}</span>
              <div className="mt-1 truncate font-mono text-[11px] text-gray-700">
                {peerFingerprint || "Ephemeral"}
              </div>
            </div>
          </div>

          <p className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-gray-500">
            If the numbers match, your keys are identical and no intermediary can read or alter the
            conversation.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
          <button onClick={onClose} className="btn btn-secondary h-9">
            Dismiss
          </button>
          <button
            onClick={() => {
              onMarkVerified?.();
              onClose();
            }}
            className="btn btn-primary h-9"
          >
            <Check className="h-3.5 w-3.5" />
            {isVerified ? "Verified" : "Mark as verified"}
          </button>
        </div>
      </div>
    </div>
  );
}
