"use client";

import React, { useState, useEffect, useRef } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { InboxScreen } from "@/components/InboxScreen";
import { PrivateChat } from "@/components/PrivateChat";
import { ConnectScreen } from "@/components/ConnectScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { DiagnosticsModal } from "@/components/DiagnosticsModal";
import { SafetyNumberModal } from "@/components/SafetyNumberModal";
import { HowItWorksModal } from "@/components/HowItWorksModal";
import { Conversation, ChatMessage, PeerProfile } from "@/types/veil";
import { generateFingerprint, generateSafetyNumber } from "@/lib/crypto";
import { makeId, nowMs } from "@/lib/ids";

export default function VeilApp() {
  // Navigation: "welcome" | "inbox" | "chat" | "connect" | "settings"
  // Always start at "welcome" so the server and client render the same HTML
  // (avoids a hydration mismatch). A ?join= deep-link switches below on mount.
  const [currentScreen, setCurrentScreen] = useState<"welcome" | "inbox" | "chat" | "connect" | "settings">(
    "welcome"
  );

  // User Profile
  const [userName, setUserName] = useState("Anonymous Peer");
  const [userFingerprint, setUserFingerprint] = useState("");
  const [userSafetySeed, setUserSafetySeed] = useState("");

  // Conversations in Memory
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Settings
  const [defaultTimer, setDefaultTimer] = useState<number>(0); // 0 = off, 30, 300, 3600
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  // Modals
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSafetyNumber, setShowSafetyNumber] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [verifiedPeers, setVerifiedPeers] = useState<Record<string, boolean>>({});

  // Invite code carried from a scanned QR link (?join=CODE); set on mount below
  const [joinCodeFromUrl, setJoinCodeFromUrl] = useState<string | null>(null);

  // Active WebRTC references (held in memory ref)
  const activeDataChannels = useRef<Record<string, RTCDataChannel>>({});
  const activePeerConnections = useRef<Record<string, RTCPeerConnection>>({});

  // Initialize identity on mount, and handle a ?join= deep-link from a scanned QR
  useEffect(() => {
    // Client-only initialisation: generating this during render would produce a
    // different value on the server and trip a hydration mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    const fp = generateFingerprint();
    const seed = Math.random().toString(36).substring(2, 10);
    setUserFingerprint(fp);
    setUserSafetySeed(seed);

    const joinCode = new URLSearchParams(window.location.search).get("join");
    if (joinCode) {
      setJoinCodeFromUrl(joinCode.toUpperCase());
      setCurrentScreen("connect");
      // Clean the URL so a refresh doesn't re-trigger the join
      window.history.replaceState({}, "", window.location.pathname);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Disappearing messages cleanup ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      const now = Date.now();
      setConversations((prev) =>
        prev.map((conv) => {
          const validMessages = conv.messages.filter((msg) => {
            if (!msg.expiresAt) return true;
            return msg.expiresAt > now;
          });
          if (validMessages.length !== conv.messages.length) {
            return { ...conv, messages: validMessages };
          }
          return conv;
        })
      );
    }, 1000);

    return () => clearInterval(ticker);
  }, []);

  // Pre-populate with a simulated sandbox peer so user can test the UI immediately
  const setupDemoSandbox = () => {
    const demoConvId = "conv-demo-elena";
    const demoPeerName = "Elena (Simulated Peer)";
    const demoPeerFp = "E402:A911:7704:8129";
    const demoSafety = generateSafetyNumber(userSafetySeed, "elena-seed");

    const sampleMessages: ChatMessage[] = [
      {
        id: "msg-1",
        senderId: "elena",
        senderName: "Elena",
        text: "Hi! This is a zero-trace sandbox peer session. All messages are stored only in volatile RAM.",
        timestamp: Date.now() - 60000,
        isSelf: false,
        status: "read",
        isDemo: true,
      },
      {
        id: "msg-2",
        senderId: "self",
        senderName: userName,
        text: "Understood — the neutral, high-contrast interface is much easier to read.",
        timestamp: Date.now() - 30000,
        isSelf: true,
        status: "delivered",
        isDemo: true,
      },
      {
        id: "msg-3",
        senderId: "elena",
        senderName: "Elena",
        text: "Try turning on disappearing messages or testing identity verification with safety numbers!",
        timestamp: Date.now() - 5000,
        isSelf: false,
        status: "read",
        isDemo: true,
      },
    ];

    const demoConversation: Conversation = {
      id: demoConvId,
      peerId: "demo-elena",
      peerName: demoPeerName,
      peerAvatarSeed: "elena",
      peerFingerprint: demoPeerFp,
      peerSafetyNumber: demoSafety,
      connectionStatus: "connected",
      connectionType: "demo-simulation",
      messages: sampleMessages,
      unreadCount: 0,
      lastActivity: Date.now(),
      disappearingTimerSeconds: 0,
      iceTransportState: "connected (loopback-sim)",
      rttMs: 14,
      packetsLost: 0,
      bytesSent: 3420,
      bytesReceived: 3890,
    };

    setConversations((prev) => {
      if (prev.some((c) => c.id === demoConvId)) return prev;
      return [demoConversation, ...prev];
    });

    setActiveConversationId(demoConvId);
  };

  // Start button handler — never seeds a fake conversation; the inbox empty
  // state points the user at creating a real connection.
  const handleStartMessaging = () => {
    setCurrentScreen("inbox");
  };

  // Direct sandbox button handler
  const handleTrySandbox = () => {
    setupDemoSandbox();
    setCurrentScreen("chat");
  };

  // Send message
  const handleSendMessage = (text: string, expiresInSeconds: number) => {
    if (!activeConversationId) return;

    const conv = conversations.find((c) => c.id === activeConversationId);
    if (!conv) return;

    const now = nowMs();
    const expiresAt = expiresInSeconds > 0 ? now + expiresInSeconds * 1000 : undefined;

    const newMsg: ChatMessage = {
      id: makeId("msg"),
      senderId: "self",
      senderName: userName,
      text,
      timestamp: now,
      expiresInSeconds: expiresInSeconds > 0 ? expiresInSeconds : undefined,
      expiresAt,
      isSelf: true,
      status: "delivered",
    };

    // If active WebRTC dataChannel exists, transmit across the wire
    const dc = activeDataChannels.current[activeConversationId];
    if (dc && dc.readyState === "open") {
      try {
        dc.send(
          JSON.stringify({
            type: "chat_message",
            payload: newMsg,
          })
        );
      } catch (err) {
        console.error("DataChannel send error:", err);
      }
    }

    // Append to local RAM state
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: [...c.messages, newMsg],
            lastActivity: now,
            bytesSent: (c.bytesSent || 0) + text.length + 64,
          };
        }
        return c;
      })
    );

    // If sandbox demo mode, simulate peer reply after 1.5 seconds
    if (conv.connectionType === "demo-simulation") {
      setTimeout(() => {
        simulatePeerReply(activeConversationId, text, expiresInSeconds);
      }, 1500);
    }
  };

  // Sandbox automatic reply simulation
  const simulatePeerReply = (convId: string, userText: string, expiresInSeconds: number) => {
    const replies = [
      "I received your message over this peer-to-peer session. Notice how no data is sent to a central server!",
      "Encryption and zero persistence verified. Our shared ephemeral safety numbers ensure mutual authentication.",
      "Acknowledged! Volatile memory will purge this message according to your disappearing policy.",
      `Got it: "${userText.slice(0, 24)}${userText.length > 24 ? "..." : ""}". WebRTC DataChannel ping is nominal.`,
    ];

    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    const now = Date.now();
    const expiresAt = expiresInSeconds > 0 ? now + expiresInSeconds * 1000 : undefined;

    const replyMsg: ChatMessage = {
      id: `reply-${Date.now()}`,
      senderId: "peer",
      senderName: "Peer",
      text: randomReply,
      timestamp: now,
      expiresInSeconds: expiresInSeconds > 0 ? expiresInSeconds : undefined,
      expiresAt,
      isSelf: false,
      status: "read",
      isDemo: true,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            messages: [...c.messages, replyMsg],
            lastActivity: now,
            bytesReceived: (c.bytesReceived || 0) + randomReply.length + 64,
          };
        }
        return c;
      })
    );
  };

  // Change disappearing timer
  const handleChangeTimer = (seconds: number) => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, disappearingTimerSeconds: seconds } : c))
    );
  };

  // Clear chat
  const handleClearChat = () => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, messages: [] } : c))
    );
  };

  // Wipe all memory — also tear down any live peer transports so nothing is
  // left connected after the user asks for a clean slate.
  const handleClearAllMemory = () => {
    Object.values(activeDataChannels.current).forEach((dc) => {
      try {
        dc.close();
      } catch {
        // already closed
      }
    });
    Object.values(activePeerConnections.current).forEach((pc) => {
      try {
        pc.close();
      } catch {
        // already closed
      }
    });
    activeDataChannels.current = {};
    activePeerConnections.current = {};
    setConversations([]);
    setActiveConversationId(null);
    setCurrentScreen("welcome");
  };

  // Handle session established from ConnectScreen
  const handleSessionEstablished = (peerSession: {
    peerName: string;
    peerFingerprint: string;
    peerSafetyNumber: string;
    connectionType: "direct-p2p" | "demo-simulation";
    dataChannel?: RTCDataChannel;
    peerConnection?: RTCPeerConnection;
  }) => {
    const newConvId = makeId("conv");

    if (peerSession.peerConnection) {
      activePeerConnections.current[newConvId] = peerSession.peerConnection;
    }

    const now = Date.now();
    const newConversation: Conversation = {
      id: newConvId,
      peerId: makeId("peer"),
      peerName: peerSession.peerName,
      peerAvatarSeed: peerSession.peerName,
      peerFingerprint: peerSession.peerFingerprint,
      peerSafetyNumber: peerSession.peerSafetyNumber,
      connectionStatus: "connected",
      connectionType: peerSession.connectionType,
      messages: [
        {
          id: makeId("welcome"),
          senderId: "system",
          senderName: "VEIL Protocol",
          text: `Direct peer session established with ${peerSession.peerName}. Transport is encrypted via WebRTC DTLS/SCTP.`,
          timestamp: now,
          isSelf: false,
          status: "read",
        },
      ],
      unreadCount: 0,
      lastActivity: now,
      disappearingTimerSeconds: defaultTimer,
      iceTransportState: "connected",
      rttMs: 22,
      packetsLost: 0,
      bytesSent: 1240,
      bytesReceived: 1450,
    };

    // Queue the conversation before wiring the channel so the first inbound
    // frame cannot race the state update.
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConvId);
    setCurrentScreen("chat");

    const channel = peerSession.dataChannel;
    if (!channel) return;
    activeDataChannels.current[newConvId] = channel;

    const handleData = (raw: string) => {
      try {
        const parsed = JSON.parse(raw);

        // Peers introduce themselves over the channel so both sides see the
        // real display name instead of an invite-code placeholder.
        if (parsed?.type === "hello") {
          const payload = parsed.payload ?? {};
          const displayName =
            typeof payload.displayName === "string" ? payload.displayName.trim().slice(0, 20) : "";
          const fingerprint = typeof payload.fingerprint === "string" ? payload.fingerprint : "";
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== newConvId) return c;
              const peerFingerprint = fingerprint || c.peerFingerprint;
              const peerName = displayName || c.peerName;
              return {
                ...c,
                peerName,
                peerFingerprint,
                peerSafetyNumber: userFingerprint
                  ? generateSafetyNumber(userFingerprint, peerFingerprint)
                  : c.peerSafetyNumber,
                messages: c.messages.map((m) =>
                  m.senderId === "system"
                    ? {
                        ...m,
                        text: `Direct peer session established with ${peerName}. Transport is encrypted via WebRTC DTLS/SCTP.`,
                      }
                    : m
                ),
              };
            })
          );
          return;
        }

        if (parsed?.type === "chat_message" && parsed.payload && typeof parsed.payload.text === "string") {
          const incoming: ChatMessage = {
            ...parsed.payload,
            text: parsed.payload.text.slice(0, 8000),
            isSelf: false,
            status: "read",
          };
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === newConvId) {
                return {
                  ...c,
                  messages: [...c.messages, incoming],
                  lastActivity: Date.now(),
                  bytesReceived: (c.bytesReceived || 0) + incoming.text.length + 64,
                };
              }
              return c;
            })
          );
        }
      } catch (e) {
        console.error("Failed to parse incoming DC message:", e);
      }
    };

    // Hold frames that arrive before React commits the new conversation.
    const pending: string[] = [];
    let ready = false;
    channel.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      if (!ready) {
        pending.push(event.data);
        return;
      }
      handleData(event.data);
    };
    channel.onclose = () => {
      setConversations((prev) =>
        prev.map((c) => (c.id === newConvId ? { ...c, connectionStatus: "closed" } : c))
      );
    };

    ready = true;
    pending.splice(0).forEach(handleData);

    // The remote may not have attached its handler yet, so introduce ourselves
    // a couple of times. Messages are tiny and idempotent.
    const hello = JSON.stringify({
      type: "hello",
      payload: { displayName: userName, fingerprint: userFingerprint },
    });
    const sendHello = () => {
      if (channel.readyState !== "open") return;
      try {
        channel.send(hello);
      } catch {
        // channel closed between the readyState check and the send
      }
    };
    sendHello();
    // Keep introducing ourselves for a while: the remote side may not have
    // wired up its handler yet, and a slow ICE handshake can delay its onopen.
    [600, 1500, 3000, 6000].forEach((delay) => setTimeout(sendHello, delay));
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f7f9] text-gray-900 selection:bg-indigo-200 selection:text-indigo-950">
      {/* Dynamic Screen View */}
      {currentScreen === "welcome" && (
        <WelcomeScreen
          onStart={handleStartMessaging}
          onExploreDemo={handleTrySandbox}
          onOpenHowItWorks={() => setShowHowItWorks(true)}
          userName={userName}
          setUserName={setUserName}
          fingerprint={userFingerprint || "6F8A:9012:3C4D:EE12"}
        />
      )}

      {currentScreen === "inbox" && (
        <InboxScreen
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => {
            setActiveConversationId(id);
            setCurrentScreen("chat");
          }}
          onNewChat={() => setCurrentScreen("connect")}
          onOpenSettings={() => setCurrentScreen("settings")}
          userName={userName}
          fingerprint={userFingerprint || "6F8A:9012:3C4D:EE12"}
          onOpenHowItWorks={() => setShowHowItWorks(true)}
        />
      )}

      {currentScreen === "chat" && activeConv && (
        <PrivateChat
          conversation={activeConv}
          onBack={() => setCurrentScreen("inbox")}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onChangeTimer={handleChangeTimer}
          onOpenDiagnostics={() => setShowDiagnostics(true)}
          onOpenSafetyNumber={() => setShowSafetyNumber(true)}
          isPeerSafetyVerified={!!verifiedPeers[activeConv.id]}
        />
      )}

      {currentScreen === "connect" && (
        <ConnectScreen
          onBack={() => setCurrentScreen("inbox")}
          myProfile={{
            id: "self",
            displayName: userName,
            avatarSeed: userName,
            fingerprint: userFingerprint || "6F8A:9012:3C4D:EE12",
            safetyNumber: generateSafetyNumber(userSafetySeed, "peer-seed"),
          }}
          onSessionEstablished={handleSessionEstablished}
          initialJoinCode={joinCodeFromUrl || undefined}
        />
      )}

      {currentScreen === "settings" && (
        <SettingsScreen
          onBack={() => setCurrentScreen("inbox")}
          onClearAllMemory={handleClearAllMemory}
          defaultTimer={defaultTimer}
          setDefaultTimer={setDefaultTimer}
          notificationsEnabled={notificationsEnabled}
          setNotificationsEnabled={setNotificationsEnabled}
          fingerprint={userFingerprint || "6F8A:9012:3C4D:EE12"}
          safetyNumber={generateSafetyNumber(userSafetySeed, "default")}
        />
      )}

      {/* Diagnostics Modal */}
      {activeConv && (
        <DiagnosticsModal
          isOpen={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
          connectionType={activeConv.connectionType}
          connectionStatus={activeConv.connectionStatus}
          myFingerprint={userFingerprint}
          peerFingerprint={activeConv.peerFingerprint}
          safetyNumber={activeConv.peerSafetyNumber}
          iceTransportState={activeConv.iceTransportState}
          rttMs={activeConv.rttMs}
          packetsLost={activeConv.packetsLost}
          bytesSent={activeConv.bytesSent}
          bytesReceived={activeConv.bytesReceived}
        />
      )}

      {/* Safety Number Modal */}
      {activeConv && (
        <SafetyNumberModal
          isOpen={showSafetyNumber}
          onClose={() => setShowSafetyNumber(false)}
          peerName={activeConv.peerName}
          safetyNumber={activeConv.peerSafetyNumber}
          myFingerprint={userFingerprint}
          peerFingerprint={activeConv.peerFingerprint}
          isVerified={!!verifiedPeers[activeConv.id]}
          onMarkVerified={() => {
            setVerifiedPeers((prev) => ({ ...prev, [activeConv.id]: true }));
          }}
        />
      )}

      {/* Architecture Transparency Modal */}
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </div>
  );
}
