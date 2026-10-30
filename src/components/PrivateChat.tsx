"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Shield,
  Clock,
  Trash2,
  Send,
  Sparkles,
  Wifi,
  Activity,
  Smile,
  Check,
  CheckCheck,
  Flame,
} from "lucide-react";
import { Conversation } from "@/types/veil";

interface PrivateChatProps {
  conversation: Conversation;
  onBack: () => void;
  onSendMessage: (text: string, expiresInSeconds: number) => void;
  onClearChat: () => void;
  onChangeTimer: (seconds: number) => void;
  onOpenDiagnostics: () => void;
  onOpenSafetyNumber: () => void;
  isPeerSafetyVerified: boolean;
}

const TIMER_OPTIONS = [
  { label: "Off", seconds: 0 },
  { label: "30s", seconds: 30 },
  { label: "5m", seconds: 300 },
  { label: "1h", seconds: 3600 },
];

const QUICK_EMOJIS = ["🔒", "✨", "👋", "🛡️", "🔥", "🤝", "🚀", "⚡"];

function timerLabel(seconds: number) {
  if (seconds === 0) return "Timer";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${seconds / 60}m`;
  return "1h";
}

export function PrivateChat({
  conversation,
  onBack,
  onSendMessage,
  onClearChat,
  onChangeTimer,
  onOpenDiagnostics,
  onOpenSafetyNumber,
  isPeerSafetyVerified,
}: PrivateChatProps) {
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), conversation.disappearingTimerSeconds);
    setInputText("");
  };

  const isConnected = conversation.connectionStatus === "connected";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="app-header shrink-0">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button onClick={onBack} className="icon-btn" aria-label="Back to conversations">
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                {conversation.peerName.slice(0, 1).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  isConnected ? "bg-emerald-500" : "bg-amber-400 status-dot-pulse"
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-gray-900">{conversation.peerName}</h1>
                {conversation.connectionType === "demo-simulation" && (
                  <span className="hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500 sm:inline">
                    Sandbox
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 whitespace-nowrap text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  {isConnected ? (
                    <>
                      <Wifi className="h-3 w-3 text-emerald-600" />
                      <span className="font-medium text-emerald-700">Connected</span>
                    </>
                  ) : (
                    <>
                      <Activity className="h-3 w-3 animate-spin text-amber-600" />
                      <span className="font-medium text-amber-700">Handshaking</span>
                    </>
                  )}
                </span>
                <span className="text-gray-300">·</span>
                <button
                  onClick={onOpenSafetyNumber}
                  aria-label={isPeerSafetyVerified ? "Verified identity" : "Verify identity"}
                  title={isPeerSafetyVerified ? "Verified identity" : "Verify identity"}
                  className={`flex items-center gap-1 font-medium underline-offset-2 hover:underline ${
                    isPeerSafetyVerified ? "text-emerald-700" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  <span className="hidden sm:inline">{isPeerSafetyVerified ? "Verified" : "Verify identity"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowTimerMenu(!showTimerMenu)}
                className={`btn h-9 border px-2.5 ${
                  conversation.disappearingTimerSeconds > 0
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
                title="Disappearing messages timer"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden text-[11px] sm:inline">
                  {timerLabel(conversation.disappearingTimerSeconds)}
                </span>
              </button>

              {showTimerMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowTimerMenu(false)} />
                  <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg veil-fade-in">
                    <div className="overline px-2 py-1.5">Disappearing messages</div>
                    {TIMER_OPTIONS.map((opt) => (
                      <button
                        key={opt.seconds}
                        onClick={() => {
                          onChangeTimer(opt.seconds);
                          setShowTimerMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                          conversation.disappearingTimerSeconds === opt.seconds
                            ? "bg-indigo-50 font-medium text-indigo-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <span>{opt.label === "Off" ? "Off (manual clear)" : `After ${opt.label}`}</span>
                        {conversation.disappearingTimerSeconds === opt.seconds && (
                          <Check className="h-3.5 w-3.5 text-indigo-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={onOpenDiagnostics} className="icon-btn" title="Connection diagnostics">
              <Activity className="h-4 w-4" />
            </button>

            <button onClick={onClearChat} className="icon-btn icon-btn-danger" title="Wipe chat memory">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {conversation.disappearingTimerSeconds > 0 && (
        <div className="shrink-0 border-b border-amber-100 bg-amber-50/70">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-1.5 text-[11px] text-amber-800 sm:px-6">
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-600" />
              Disappearing mode: messages are removed {timerLabel(conversation.disappearingTimerSeconds)} after receipt.
            </span>
            <span className="hidden font-mono text-[10px] text-amber-600/80 sm:inline">RAM purge</span>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9]">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-5 sm:px-6">
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-[11px] leading-relaxed text-gray-500">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            <p>
              Direct peer-to-peer channel protected by DTLS/SCTP. Messages never reach a chat
              database. Deletion cannot erase screenshots already taken by the recipient.
            </p>
          </div>

          {conversation.messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <Sparkles className="mb-2 h-5 w-5 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">No messages yet</p>
              <p className="mt-1 text-xs text-gray-400">Send a message to start the direct exchange.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {conversation.messages.map((msg) => {
                const isSystem = msg.senderId === "system";
                if (isSystem) {
                  return (
                    <div key={msg.id} className="my-2 flex justify-center">
                      <p className="max-w-md text-center text-[10.5px] leading-relaxed text-gray-400">
                        {msg.text}
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"} veil-fade-in`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm sm:max-w-[72%] ${
                        msg.isSelf
                          ? "rounded-br-md bg-indigo-600 text-white"
                          : "rounded-bl-md border border-gray-200 bg-white text-gray-800"
                      }`}
                    >
                      <p className="select-text whitespace-pre-wrap break-words">{msg.text}</p>
                      <div
                        className={`mt-1 flex items-center justify-end gap-1.5 font-mono text-[9.5px] ${
                          msg.isSelf ? "text-indigo-200" : "text-gray-400"
                        }`}
                      >
                        {msg.expiresInSeconds ? (
                          <span className="flex items-center gap-0.5">
                            <Flame className="h-2.5 w-2.5" />
                            {msg.expiresInSeconds}s
                          </span>
                        ) : null}
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.isSelf && <CheckCheck className="h-3 w-3 text-indigo-200" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {showEmojiPicker && (
        <div className="shrink-0 border-t border-gray-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="rounded-lg p-1.5 text-lg transition-colors hover:bg-gray-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-gray-200 bg-white">
        <form
          onSubmit={handleSend}
          className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3 sm:px-6"
        >
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn btn-ghost h-10 w-10 shrink-0 p-0"
            title="Insert emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${conversation.peerName}…`}
            className="field h-10 flex-1 px-3.5 text-sm"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="btn btn-primary h-10 w-10 shrink-0 p-0"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
