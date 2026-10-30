"use client";

import React, { useState } from "react";
import { Search, Plus, Info, Settings, Clock, ChevronRight, Shield, Lock } from "lucide-react";
import { Conversation } from "@/types/veil";

interface InboxScreenProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  userName: string;
  fingerprint: string;
  onOpenHowItWorks: () => void;
}

export function InboxScreen({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onOpenSettings,
  userName,
  fingerprint,
  onOpenHowItWorks,
}: InboxScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const initial = userName.trim().slice(0, 1).toUpperCase() || "?";

  const filteredConversations = conversations.filter((c) =>
    c.peerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="app-header shrink-0">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="brand-mark">
              <Lock className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-semibold tracking-[0.16em] text-gray-900">VEIL</span>
            <span className="hidden border-l border-gray-200 pl-3 text-xs text-gray-400 sm:inline">
              Inbox
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onOpenHowItWorks} className="icon-btn" title="How it works">
              <Info className="h-4 w-4" />
            </button>
            <button onClick={onOpenSettings} className="icon-btn" title="Settings and privacy">
              <Settings className="h-4 w-4" />
            </button>
            <button onClick={onNewChat} aria-label="New conversation" className="btn btn-primary h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New chat</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col px-4 pb-6 pt-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Conversations</h1>
            <p className="mt-1 text-xs text-gray-500">Ephemeral sessions held in this tab only.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">
              {initial}
            </span>
            <span className="max-w-[140px] truncate text-xs font-medium text-gray-700">{userName}</span>
            <span className="status-dot bg-emerald-500" title="Session active" />
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field h-10 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">
                {conversations.length === 0 ? "No active conversations" : "No matches found"}
              </h3>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-500">
                {conversations.length === 0
                  ? "Create a single-use invite or enter a peer's code to open a direct, zero-trace channel."
                  : "Try a different name — sessions are only visible while this tab is open."}
              </p>
              {conversations.length === 0 && (
                <button onClick={onNewChat} className="btn btn-primary mt-5">
                  <Plus className="h-4 w-4" />
                  Start a direct connection
                </button>
              )}
            </div>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
              {filteredConversations.map((conv) => {
                const lastMessage = conv.messages[conv.messages.length - 1];
                const isConnected = conv.connectionStatus === "connected";
                const isConnecting =
                  conv.connectionStatus === "connecting" || conv.connectionStatus === "waiting_for_peer";
                const isActive = activeConversationId === conv.id;

                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5 ${
                        isActive ? "bg-indigo-50/50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                          {conv.peerName.slice(0, 1).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                            isConnected
                              ? "bg-emerald-500"
                              : isConnecting
                                ? "bg-amber-400"
                                : "bg-gray-300"
                          }`}
                          title={`Status: ${conv.connectionStatus}`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-gray-900">{conv.peerName}</h4>
                          {conv.connectionType === "demo-simulation" && (
                            <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                              Sandbox
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {lastMessage ? (
                            <>
                              {lastMessage.isSelf ? "You: " : ""}
                              {lastMessage.text}
                            </>
                          ) : (
                            <span className="italic text-gray-400">Channel open. Say hello…</span>
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="font-mono text-[10px] text-gray-400">
                          {lastMessage
                            ? new Date(lastMessage.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Active"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {conv.disappearingTimerSeconds > 0 && (
                            <span className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500">
                              <Clock className="h-2.5 w-2.5" />
                              {conv.disappearingTimerSeconds < 60
                                ? `${conv.disappearingTimerSeconds}s`
                                : conv.disappearingTimerSeconds < 3600
                                  ? `${conv.disappearingTimerSeconds / 60}m`
                                  : "1h"}
                            </span>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-2 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-gray-400" />
              Messages live in this tab&apos;s memory only.
            </span>
            <span className="hidden font-mono text-gray-400 sm:inline">ID {fingerprint.slice(0, 9)}…</span>
          </div>
        </div>
      </main>
    </div>
  );
}
