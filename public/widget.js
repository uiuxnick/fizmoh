/**
 * Fizmoh Live Chat & WhatsApp Website Widget
 * Embedded via: <script src="https://app.fizmoh.cloud/widget.js" data-widget-id="..."></script>
 * Uses Shadow DOM for 100% CSS style isolation.
 */
(function () {
  if (window.__FIZMOH_WIDGET_LOADED__) return;

  // Do not render floating visitor widget inside the admin dashboard or platform panel
  if (
    typeof window !== "undefined" &&
    (window.location.pathname.startsWith("/dashboard") ||
     window.location.pathname.startsWith("/platform") ||
     window.location.pathname.startsWith("/admin"))
  ) {
    return;
  }

  window.__FIZMOH_WIDGET_LOADED__ = true;

  // Locate current script and attributes
  const currentScript =
    document.currentScript ||
    document.querySelector('script[src*="widget.js"]') ||
    document.querySelector('script[data-widget-id]') ||
    document.querySelector('script[data-tenant]');

  const scriptUrl = currentScript ? new URL(currentScript.src, window.location.href) : new URL(window.location.href);
  const baseUrl = scriptUrl.origin || "https://app.fizmoh.cloud";
  const widgetId = currentScript ? currentScript.getAttribute("data-widget-id") : null;
  const tenantSlug = currentScript ? (currentScript.getAttribute("data-tenant") || "fizmoh-support") : "fizmoh-support";

  // Generate or retrieve persistent visitor UUID
  let visitorId = "";
  try {
    visitorId = localStorage.getItem("fizmoh_chat_visitor_id");
    if (!visitorId) {
      visitorId = "vis_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem("fizmoh_chat_visitor_id", visitorId);
    }
  } catch (e) {
    visitorId = "vis_" + Math.random().toString(36).substring(2, 12);
  }

  // Create host element and attach Shadow DOM
  const host = document.createElement("div");
  host.id = "fizmoh-chat-widget-root";
  const shadow = host.attachShadow({ mode: "open" });

  // Mount to body safely after React finishes initial hydration
  function mountHost() {
    if (!document.getElementById("fizmoh-chat-widget-root") && document.body) {
      document.body.appendChild(host);
    }
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setTimeout(mountHost, 200));
    } else {
      setTimeout(mountHost, 200);
    }
  }

  let config = {
    id: widgetId || "default",
    primaryColor: "#00E785",
    position: "bottom-right",
    headerTitle: "Customer Support",
    headerSubtitle: "Typically replies in under 5 minutes",
    agentName: "Support Specialist",
    agentRole: "Customer Care",
    avatarUrl: null,
    welcomeMessage: "Hi there! 👋 How can we help you today?",
    proactivePrompt: "Need help? Chat with our team!",
    proactiveDelay: 5,
    whatsappEnabled: true,
    whatsappNumber: "+96890000000",
    whatsappMessage: "Hello! I have a question about your services.",
    webChatEnabled: true,
    requireLeadForm: true,
    requirePhone: false,
    enableAiAgent: true,
  };

  let state = {
    isOpen: false,
    activeTab: "chat", // "chat" | "whatsapp"
    sessionId: null,
    visitorName: "",
    visitorEmail: "",
    visitorPhone: "",
    leadCaptured: false,
    messages: [],
    unreadCount: 0,
    isTyping: false,
    eventSource: null,
    pollInterval: null,
  };

  // Restore stored lead info
  try {
    const savedName = localStorage.getItem("fizmoh_chat_visitor_name");
    const savedEmail = localStorage.getItem("fizmoh_chat_visitor_email");
    const savedPhone = localStorage.getItem("fizmoh_chat_visitor_phone");
    if (savedName) state.visitorName = savedName;
    if (savedEmail) state.visitorEmail = savedEmail;
    if (savedPhone) state.visitorPhone = savedPhone;
    if (savedName || savedEmail) state.leadCaptured = true;
  } catch (e) {}

  // Fetch remote widget configuration
  async function fetchConfig() {
    try {
      const query = new URLSearchParams();
      if (widgetId) query.set("widgetId", widgetId);
      if (tenantSlug) query.set("tenant", tenantSlug);
      const res = await fetch(`${baseUrl}/api/widget/config?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        config = { ...config, ...data };
        if (!config.webChatEnabled && config.whatsappEnabled) {
          state.activeTab = "whatsapp";
        }
        render();
        initProactivePrompt();
      }
    } catch (e) {
      console.warn("[Fizmoh LiveChat] Using fallback configuration:", e);
      render();
    }
  }

  function initProactivePrompt() {
    if (!config.proactivePrompt) return;
    const delay = (config.proactiveDelay || 5) * 1000;
    setTimeout(() => {
      const promptEl = shadow.querySelector(".fzm-proactive-bubble");
      if (promptEl && !state.isOpen) {
        promptEl.classList.add("visible");
      }
    }, delay);
  }

  // Audio chime for inbound message
  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  // Initialize or resume Live Chat session
  async function initSession() {
    if (state.sessionId) return;
    try {
      const res = await fetch(`${baseUrl}/api/widget/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetId: config.id,
          visitorId,
          name: state.visitorName,
          email: state.visitorEmail,
          phone: state.visitorPhone,
          currentUrl: window.location.href,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        state.sessionId = data.sessionId;
        state.messages = data.messages || [];
        renderMessages();
        startRealtimeStream();
      }
    } catch (err) {
      console.error("[Fizmoh LiveChat] Failed to init session:", err);
    }
  }

  // Helper to append or update message without creating duplicates
  function appendOrUpdateMessage(newMsg) {
    if (!newMsg || !newMsg.content) return false;

    // 1. Match by real ID
    if (newMsg.id && !String(newMsg.id).startsWith("tmp_")) {
      const existingIdx = state.messages.findIndex((m) => m.id === newMsg.id);
      if (existingIdx !== -1) {
        state.messages[existingIdx] = { ...state.messages[existingIdx], ...newMsg };
        return false;
      }

      // If this is an INBOUND message, replace any temporary optimistic message with matching content
      if (newMsg.direction === "INBOUND") {
        const tmpIdx = state.messages.findIndex(
          (m) => String(m.id).startsWith("tmp_") && m.content.trim() === newMsg.content.trim()
        );
        if (tmpIdx !== -1) {
          state.messages[tmpIdx] = newMsg;
          return true;
        }
      }
    }

    // 2. Prevent duplicate by content & direction within recent timeframe
    const isDuplicate = state.messages.some((m) => {
      if (m.direction !== newMsg.direction || m.content.trim() !== newMsg.content.trim()) {
        return false;
      }
      if (String(m.id).startsWith("tmp_") && String(newMsg.id).startsWith("tmp_")) {
        return true;
      }
      if (m.createdAt && newMsg.createdAt) {
        const diff = Math.abs(new Date(m.createdAt).getTime() - new Date(newMsg.createdAt).getTime());
        if (diff < 15000) return true;
      }
      return false;
    });

    if (isDuplicate) return false;

    state.messages.push(newMsg);
    return true;
  }

  // Real-time updates via SSE stream
  function startRealtimeStream() {
    if (!state.sessionId) return;
    if (state.eventSource) {
      state.eventSource.close();
    }

    if (window.EventSource) {
      try {
        const sse = new EventSource(`${baseUrl}/api/widget/stream?sessionId=${state.sessionId}`);
        state.eventSource = sse;

        sse.addEventListener("message", (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.messages && Array.isArray(data.messages)) {
              let added = false;
              data.messages.forEach((newMsg) => {
                if (appendOrUpdateMessage(newMsg)) {
                  added = true;
                  if (newMsg.direction === "OUTBOUND" || newMsg.direction === "BOT") {
                    playNotificationSound();
                  }
                }
              });
              if (added) renderMessages();
            }
          } catch (err) {}
        });

        sse.onerror = () => {
          sse.close();
          startGentlePolling();
        };
        return;
      } catch (e) {}
    }
    startGentlePolling();
  }

  function startGentlePolling() {
    if (state.pollInterval) clearInterval(state.pollInterval);
    state.pollInterval = setInterval(async () => {
      if (!state.sessionId || !state.isOpen) return;
      try {
        const lastMsg = state.messages[state.messages.length - 1];
        const afterQuery = lastMsg ? `&after=${encodeURIComponent(lastMsg.createdAt)}` : "";
        const res = await fetch(`${baseUrl}/api/widget/messages?sessionId=${state.sessionId}${afterQuery}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            let added = false;
            data.messages.forEach((newMsg) => {
              if (appendOrUpdateMessage(newMsg)) {
                added = true;
                if (newMsg.direction === "OUTBOUND" || newMsg.direction === "BOT") {
                  playNotificationSound();
                }
              }
            });
            if (added) renderMessages();
          }
        }
      } catch (e) {}
    }, 4000);
  }

  // Send visitor message
  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    const clean = text.trim();

    // Optimistic message append
    const tempId = "tmp_" + Date.now();
    const optimisticMsg = {
      id: tempId,
      direction: "INBOUND",
      content: clean,
      createdAt: new Date().toISOString(),
    };
    state.messages.push(optimisticMsg);
    renderMessages();

    // Show typing state for bot
    state.isTyping = true;
    renderTyping();

    try {
      const res = await fetch(`${baseUrl}/api/widget/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          visitorId,
          content: clean,
        }),
      });

      state.isTyping = false;
      renderTyping();

      if (res.ok) {
        const data = await res.json();
        // Remove or replace optimistic temp message
        if (data.message) {
          appendOrUpdateMessage(data.message);
        }
        state.messages = state.messages.filter((m) => m.id !== tempId);
        if (data.aiResponse) {
          if (appendOrUpdateMessage(data.aiResponse)) {
            playNotificationSound();
          }
        }
        renderMessages();
      }
    } catch (e) {
      state.isTyping = false;
      renderTyping();
      console.error("[Fizmoh LiveChat] Failed to send message:", e);
    }
  }

  // Request live human agent handoff
  async function requestHumanHandoff() {
    if (!state.sessionId) return;
    try {
      const res = await fetch(`${baseUrl}/api/widget/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          visitorId,
          requestHumanHandoff: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.aiResponse) {
          if (appendOrUpdateMessage(data.aiResponse)) {
            playNotificationSound();
          }
          renderMessages();
        }
      }
    } catch (e) {}
  }

  // Render Widget UI & Styles
  function render() {
    const isLeft = config.position === "bottom-left";
    const primary = config.primaryColor || "#00E785";

    shadow.innerHTML = `
      <style>
        :host {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.45;
          color: #1e293b;
          -webkit-font-smoothing: antialiased;
          z-index: 999999;
          position: fixed;
          bottom: 24px;
          ${isLeft ? "left: 24px;" : "right: 24px;"}
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Floating Trigger Button */
        .fzm-launcher {
          width: 60px;
          height: 60px;
          border-radius: 30px;
          background: ${primary};
          color: #ffffff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
          position: relative;
          user-select: none;
        }
        .fzm-launcher:hover {
          transform: scale(1.06);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
        }
        .fzm-launcher:active { transform: scale(0.96); }
        .fzm-launcher svg { width: 28px; height: 28px; fill: currentColor; }

        /* Proactive Bubble */
        .fzm-proactive-bubble {
          position: absolute;
          bottom: 74px;
          ${isLeft ? "left: 0;" : "right: 0;"}
          background: #ffffff;
          border-radius: 16px;
          padding: 12px 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
          display: none;
          align-items: center;
          gap: 10px;
          width: 260px;
          cursor: pointer;
          animation: fzmSlideUp 0.3s ease forwards;
        }
        .fzm-proactive-bubble.visible { display: flex; }
        .fzm-proactive-bubble-avatar {
          width: 36px;
          height: 36px;
          border-radius: 18px;
          background: #f1f5f9;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #0f172a;
          overflow: hidden;
        }
        .fzm-proactive-bubble-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .fzm-proactive-text { font-size: 13px; font-weight: 500; color: #1e293b; flex: 1; }
        .fzm-proactive-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 16px;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .fzm-proactive-close:hover { color: #0f172a; background: #f1f5f9; }

        /* Main Chat Window */
        .fzm-window {
          position: absolute;
          bottom: 76px;
          ${isLeft ? "left: 0;" : "right: 0;"}
          width: 380px;
          height: 580px;
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 100px);
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 45px -8px rgba(0, 0, 0, 0.22), 0 0 1px rgba(0,0,0,0.12);
          display: none;
          flex-direction: column;
          overflow: hidden;
          animation: fzmWindowOpen 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          border: 1px solid #e2e8f0;
        }
        .fzm-window.open { display: flex; }

        /* Header */
        .fzm-header {
          background: linear-gradient(135deg, ${primary} 0%, #064e3b 100%);
          color: #ffffff;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
        }
        .fzm-avatar-wrap { position: relative; }
        .fzm-avatar {
          width: 44px;
          height: 44px;
          border-radius: 22px;
          background: #ffffff;
          color: #0f172a;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.8);
        }
        .fzm-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .fzm-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background: #22c55e;
          border: 2px solid #ffffff;
          position: absolute;
          bottom: 0;
          right: 0;
        }
        .fzm-header-info { flex: 1; min-width: 0; }
        .fzm-header-title { font-size: 15px; font-weight: 700; truncate; }
        .fzm-header-agent { font-size: 12px; opacity: 0.95; font-weight: 500; display: flex; align-items: center; gap: 4px; }
        .fzm-header-sub { font-size: 11px; opacity: 0.85; }
        .fzm-header-actions { display: flex; align-items: center; gap: 6px; }
        .fzm-btn-icon {
          background: rgba(255,255,255,0.15);
          border: none;
          color: #ffffff;
          width: 28px;
          height: 28px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .fzm-btn-icon:hover { background: rgba(255,255,255,0.25); }

        /* Tabs */
        .fzm-tabs {
          display: flex;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 6px;
          gap: 6px;
        }
        .fzm-tab {
          flex: 1;
          padding: 7px 10px;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
          border: none;
          background: none;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .fzm-tab.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        /* Views */
        .fzm-view-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fafafa; }

        /* WhatsApp Card */
        .fzm-wa-view {
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
          flex: 1;
          justify-content: center;
        }
        .fzm-wa-icon {
          width: 58px;
          height: 58px;
          border-radius: 29px;
          background: #25d366;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 16px rgba(37, 211, 102, 0.3);
        }
        .fzm-wa-icon svg { width: 34px; height: 34px; fill: currentColor; }
        .fzm-wa-title { font-size: 17px; font-weight: 700; color: #0f172a; }
        .fzm-wa-desc { font-size: 13px; color: #64748b; line-height: 1.5; }
        .fzm-wa-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-size: 13px;
          resize: none;
          height: 76px;
          outline: none;
          font-family: inherit;
        }
        .fzm-wa-input:focus { border-color: #25d366; }
        .fzm-wa-btn {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          background: #25d366;
          color: #ffffff;
          font-weight: 600;
          font-size: 14px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.15s;
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.28);
        }
        .fzm-wa-btn:hover { opacity: 0.94; }

        /* Lead Form */
        .fzm-lead-form {
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
          justify-content: center;
        }
        .fzm-lead-title { font-size: 16px; font-weight: 700; color: #0f172a; text-align: center; }
        .fzm-lead-sub { font-size: 12px; color: #64748b; text-align: center; margin-bottom: 6px; }
        .fzm-lead-input {
          padding: 11px 13px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }
        .fzm-lead-input:focus { border-color: ${primary}; }
        .fzm-lead-btn {
          padding: 12px;
          border-radius: 10px;
          background: ${primary};
          color: #ffffff;
          font-weight: 600;
          border: none;
          cursor: pointer;
          margin-top: 4px;
        }

        /* Message Thread */
        .fzm-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .fzm-msg {
          max-width: 82%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.45;
          word-break: break-word;
          position: relative;
        }
        .fzm-msg.inbound {
          align-self: flex-end;
          background: ${primary};
          color: #ffffff;
          border-bottom-right-radius: 4px;
        }
        .fzm-msg.outbound, .fzm-msg.bot {
          align-self: flex-start;
          background: #ffffff;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .fzm-msg-time {
          font-size: 10px;
          opacity: 0.7;
          margin-top: 4px;
          text-align: right;
        }
        .fzm-badge-bot {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          background: #e2e8f0;
          color: #475569;
          padding: 1px 5px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 4px;
        }

        /* Typing indicator */
        .fzm-typing {
          align-self: flex-start;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 14px;
          display: none;
          align-items: center;
          gap: 4px;
        }
        .fzm-typing.visible { display: flex; }
        .fzm-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 3px;
          background: #94a3b8;
          animation: fzmBounce 1.2s infinite ease-in-out;
        }
        .fzm-typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .fzm-typing-dot:nth-child(3) { animation-delay: 0.3s; }

        /* Handoff Bar */
        .fzm-handoff-bar {
          background: #fffbeb;
          border-top: 1px solid #fef3c7;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: #92400e;
        }
        .fzm-handoff-btn {
          background: #fde68a;
          border: none;
          color: #78350f;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 11px;
          cursor: pointer;
        }
        .fzm-handoff-btn:hover { background: #fcd34d; }

        /* Composer */
        .fzm-composer {
          padding: 12px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fzm-input {
          flex: 1;
          padding: 9px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
        }
        .fzm-input:focus { border-color: ${primary}; }
        .fzm-send-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: ${primary};
          color: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .fzm-send-btn svg { width: 16px; height: 16px; fill: currentColor; }

        @keyframes fzmSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fzmWindowOpen {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fzmBounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        /* Mobile full screen overlay */
        @media (max-width: 640px) {
          .fzm-window {
            width: 100vw;
            height: 100vh;
            max-width: 100vw;
            max-height: 100vh;
            bottom: 0;
            right: 0;
            left: 0;
            border-radius: 0;
          }
        }
      </style>

      <!-- Proactive Welcome Bubble -->
      <div class="fzm-proactive-bubble">
        <div class="fzm-proactive-bubble-avatar">
          ${config.avatarUrl ? `<img src="${config.avatarUrl}" alt="Avatar" />` : (config.agentName ? config.agentName[0] : "S")}
        </div>
        <div class="fzm-proactive-text">${config.proactivePrompt || "Need help? Chat with our team!"}</div>
        <button class="fzm-proactive-close" title="Dismiss">×</button>
      </div>

      <!-- Main Widget Window -->
      <div class="fzm-window ${state.isOpen ? "open" : ""}">
        <!-- Header -->
        <div class="fzm-header">
          <div class="fzm-avatar-wrap">
            <div class="fzm-avatar">
              ${config.avatarUrl ? `<img src="${config.avatarUrl}" alt="Avatar" />` : (config.agentName ? config.agentName[0] : "S")}
            </div>
            <div class="fzm-status-dot"></div>
          </div>
          <div class="fzm-header-info">
            <div class="fzm-header-title">${config.headerTitle || "Fizmoh Support"}</div>
            ${
              config.agentRole || (config.agentName && config.agentName.trim().toLowerCase() !== (config.headerTitle || "").trim().toLowerCase())
                ? `<div class="fzm-header-agent">
                    ${config.agentName && config.agentName.trim().toLowerCase() !== (config.headerTitle || "").trim().toLowerCase() ? `<span>${config.agentName}</span> • ` : ""}
                    <span>${config.agentRole || "Support & Customer Success"}</span>
                  </div>`
                : ""
            }
            <div class="fzm-header-sub">${config.headerSubtitle || "Typically replies in under 5 minutes"}</div>
          </div>
          <div class="fzm-header-actions">
            <button class="fzm-btn-icon fzm-close-btn" title="Close">✕</button>
          </div>
        </div>

        <!-- Channel Switcher Tabs -->
        ${
          config.webChatEnabled && config.whatsappEnabled
            ? `
          <div class="fzm-tabs">
            <button class="fzm-tab ${state.activeTab === "chat" ? "active" : ""}" data-tab="chat">
              💬 Web Live Chat
            </button>
            <button class="fzm-tab ${state.activeTab === "whatsapp" ? "active" : ""}" data-tab="whatsapp">
              <svg style="width:14px;height:14px;fill:#25d366;" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM16.56 14.37C16.31 14.25 15.09 13.65 14.86 13.56C14.63 13.48 14.47 13.44 14.3 13.69C14.14 13.94 13.67 14.49 13.53 14.65C13.38 14.82 13.24 14.84 12.99 14.71C12.74 14.59 11.95 14.33 11.01 13.49C10.28 12.84 9.78 12.03 9.64 11.78C9.5 11.53 9.62 11.4 9.75 11.27C9.86 11.16 10 10.98 10.12 10.84C10.25 10.7 10.29 10.59 10.37 10.43C10.45 10.26 10.41 10.12 10.35 10C10.29 9.88 9.79 8.65 9.59 8.14C9.39 7.65 9.18 7.72 9.03 7.71C8.89 7.7 8.72 7.7 8.56 7.7C8.39 7.7 8.12 7.76 7.89 8.01C7.66 8.26 7.02 8.86 7.02 10.08C7.02 11.3 7.91 12.47 8.03 12.64C8.16 12.81 9.77 15.28 12.24 16.35C12.83 16.6 13.28 16.75 13.64 16.87C14.23 17.06 14.77 17.03 15.2 16.97C15.68 16.9 16.67 16.37 16.88 15.79C17.08 15.22 17.08 14.73 17.02 14.63C16.96 14.53 16.81 14.49 16.56 14.37Z"/></svg>
              WhatsApp
            </button>
          </div>
        `
            : ""
        }

        <!-- View Body -->
        <div class="fzm-view-body">
          ${
            state.activeTab === "whatsapp"
              ? `
            <div class="fzm-wa-view">
              <div class="fzm-wa-icon">
                <svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM16.56 14.37C16.31 14.25 15.09 13.65 14.86 13.56C14.63 13.48 14.47 13.44 14.3 13.69C14.14 13.94 13.67 14.49 13.53 14.65C13.38 14.82 13.24 14.84 12.99 14.71C12.74 14.59 11.95 14.33 11.01 13.49C10.28 12.84 9.78 12.03 9.64 11.78C9.5 11.53 9.62 11.4 9.75 11.27C9.86 11.16 10 10.98 10.12 10.84C10.25 10.7 10.29 10.59 10.37 10.43C10.45 10.26 10.41 10.12 10.35 10C10.29 9.88 9.79 8.65 9.59 8.14C9.39 7.65 9.18 7.72 9.03 7.71C8.89 7.7 8.72 7.7 8.56 7.7C8.39 7.7 8.12 7.76 7.89 8.01C7.66 8.26 7.02 8.86 7.02 10.08C7.02 11.3 7.91 12.47 8.03 12.64C8.16 12.81 9.77 15.28 12.24 16.35C12.83 16.6 13.28 16.75 13.64 16.87C14.23 17.06 14.77 17.03 15.2 16.97C15.68 16.9 16.67 16.37 16.88 15.79C17.08 15.22 17.08 14.73 17.02 14.63C16.96 14.53 16.81 14.49 16.56 14.37Z"/></svg>
              </div>
              <div class="fzm-wa-title">Chat on WhatsApp</div>
              <div class="fzm-wa-desc">Connect directly with our support team on WhatsApp for instant replies and media sharing.</div>
              <textarea class="fzm-wa-input" placeholder="Type your message here...">${config.whatsappMessage || "Hello! I have a question."}</textarea>
              <button class="fzm-wa-btn">
                <span>Start WhatsApp Chat</span>
                <span>➔</span>
              </button>
            </div>
          `
              : !state.leadCaptured && config.requireLeadForm
              ? `
            <form class="fzm-lead-form">
              <div class="fzm-lead-title">Welcome to Live Support 👋</div>
              <div class="fzm-lead-sub">Please introduce yourself to start chatting</div>
              <input type="text" class="fzm-lead-input fzm-in-name" placeholder="Your Name" required value="${state.visitorName}" />
              <input type="email" class="fzm-lead-input fzm-in-email" placeholder="Email Address" required value="${state.visitorEmail}" />
              ${
                config.requirePhone
                  ? `<input type="tel" class="fzm-lead-input fzm-in-phone" placeholder="Phone Number" required value="${state.visitorPhone}" />`
                  : ""
              }
              <button type="submit" class="fzm-lead-btn">Start Chat</button>
            </form>
          `
              : `
            <div class="fzm-handoff-bar">
              <span>🤖 AI Assistant Active</span>
              <button class="fzm-handoff-btn" title="Talk to a human representative">Chat with Human</button>
            </div>
            <div class="fzm-messages-container"></div>
            <div class="fzm-typing">
              <div class="fzm-typing-dot"></div>
              <div class="fzm-typing-dot"></div>
              <div class="fzm-typing-dot"></div>
            </div>
            <div class="fzm-composer">
              <input type="text" class="fzm-input" placeholder="Type a message..." />
              <button class="fzm-send-btn" title="Send message">
                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          `
          }
        </div>
      </div>

      <!-- Floating Launcher Button -->
      <div class="fzm-launcher">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
      </div>
    `;

    bindEvents();
    if (state.leadCaptured || !config.requireLeadForm) {
      renderMessages();
    }
  }

  function bindEvents() {
    const launcher = shadow.querySelector(".fzm-launcher");
    const closeBtn = shadow.querySelector(".fzm-close-btn");
    const proactiveBubble = shadow.querySelector(".fzm-proactive-bubble");
    const proactiveClose = shadow.querySelector(".fzm-proactive-close");

    const toggleOpen = () => {
      state.isOpen = !state.isOpen;
      const win = shadow.querySelector(".fzm-window");
      if (win) {
        if (state.isOpen) {
          win.classList.add("open");
          if (proactiveBubble) proactiveBubble.classList.remove("visible");
          if (!state.sessionId && (state.leadCaptured || !config.requireLeadForm)) {
            initSession();
          }
        } else {
          win.classList.remove("open");
        }
      }
    };

    if (launcher) launcher.onclick = toggleOpen;
    if (closeBtn) closeBtn.onclick = () => toggleOpen();
    if (proactiveBubble) {
      proactiveBubble.onclick = (e) => {
        if (e.target === proactiveClose) return;
        if (!state.isOpen) toggleOpen();
      };
    }
    if (proactiveClose) {
      proactiveClose.onclick = (e) => {
        e.stopPropagation();
        proactiveBubble.classList.remove("visible");
      };
    }

    // Tabs
    const tabs = shadow.querySelectorAll(".fzm-tab");
    tabs.forEach((tab) => {
      tab.onclick = () => {
        state.activeTab = tab.getAttribute("data-tab");
        render();
      };
    });

    // WhatsApp Action
    const waBtn = shadow.querySelector(".fzm-wa-btn");
    if (waBtn) {
      waBtn.onclick = () => {
        const textEl = shadow.querySelector(".fzm-wa-input");
        const msg = textEl ? textEl.value : config.whatsappMessage || "";
        const cleanNumber = (config.whatsappNumber || "").replace(/[^0-9]/g, "");
        const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, "_blank");
      };
    }

    // Lead Form Submission
    const leadForm = shadow.querySelector(".fzm-lead-form");
    if (leadForm) {
      leadForm.onsubmit = (e) => {
        e.preventDefault();
        const inName = shadow.querySelector(".fzm-in-name");
        const inEmail = shadow.querySelector(".fzm-in-email");
        const inPhone = shadow.querySelector(".fzm-in-phone");

        state.visitorName = inName ? inName.value.trim() : "";
        state.visitorEmail = inEmail ? inEmail.value.trim() : "";
        state.visitorPhone = inPhone ? inPhone.value.trim() : "";
        state.leadCaptured = true;

        try {
          localStorage.setItem("fizmoh_chat_visitor_name", state.visitorName);
          localStorage.setItem("fizmoh_chat_visitor_email", state.visitorEmail);
          if (state.visitorPhone) localStorage.setItem("fizmoh_chat_visitor_phone", state.visitorPhone);
        } catch (err) {}

        render();
        initSession();
      };
    }

    // Chat Composer
    const composerInput = shadow.querySelector(".fzm-input");
    const sendBtn = shadow.querySelector(".fzm-send-btn");
    const handoffBtn = shadow.querySelector(".fzm-handoff-btn");

    if (handoffBtn) {
      handoffBtn.onclick = () => requestHumanHandoff();
    }

    if (sendBtn && composerInput) {
      const handleSend = () => {
        const val = composerInput.value;
        if (val.trim()) {
          composerInput.value = "";
          sendMessage(val);
        }
      };
      sendBtn.onclick = handleSend;
      composerInput.onkeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      };
    }
  }

  function renderMessages() {
    const container = shadow.querySelector(".fzm-messages-container");
    if (!container) return;

    // Filter duplicates
    const seenIds = new Set();
    const seenKeys = new Set();
    state.messages = state.messages.filter((m) => {
      if (!m || !m.content) return false;
      const id = String(m.id || "");
      if (id && !id.startsWith("tmp_")) {
        if (seenIds.has(id)) return false;
        seenIds.add(id);
      }
      const timeKey = m.createdAt ? Math.floor(new Date(m.createdAt).getTime() / 15000) : "now";
      const key = `${m.direction}:${m.content.trim()}:${timeKey}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    if (state.messages.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:24px 12px;color:#94a3b8;font-size:12px;">
          ${config.welcomeMessage || "Hi there! 👋 How can we help you today?"}
        </div>
      `;
      return;
    }

    container.innerHTML = state.messages
      .map((m) => {
        const isUser = m.direction === "INBOUND";
        const isBot = m.direction === "BOT" || m.isAiGenerated;
        const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

        return `
          <div class="fzm-msg ${isUser ? "inbound" : isBot ? "bot" : "outbound"}">
            ${!isUser && isBot ? `<div class="fzm-badge-bot">AI Assistant</div>` : ""}
            <div>${escapeHtml(m.content || "")}</div>
            ${timeStr ? `<div class="fzm-msg-time">${timeStr}</div>` : ""}
          </div>
        `;
      })
      .join("");

    container.scrollTop = container.scrollHeight;
  }

  function renderTyping() {
    const typing = shadow.querySelector(".fzm-typing");
    if (!typing) return;
    if (state.isTyping) {
      typing.classList.add("visible");
    } else {
      typing.classList.remove("visible");
    }
    const container = shadow.querySelector(".fzm-messages-container");
    if (container) container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initial load
  fetchConfig();
})();
