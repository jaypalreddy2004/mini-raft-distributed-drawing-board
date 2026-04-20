import React, { useRef, useState, useCallback, useEffect } from "react";
import Canvas from "./components/Canvas";
import { useWebSocket } from "./hooks/useWebSocket";

// ── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  bg:        "#f8fafc",
  panel:     "#ffffff",
  primary:   "#7c3aed",
  primaryHov:"#6d28d9",
  secondary: "#06b6d4",
  secondaryH:"#0891b2",
  accent:    "#f43f5e",
  accentHov: "#e11d48",
  text:      "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border:    "#e2e8f0",
  success:   "#22c55e",
  successBg: "#f0fdf4",
  successBdr:"#bbf7d0",
  warning:   "#f59e0b",
  danger:    "#ef4444",
  dangerBg:  "#fef2f2",
};

const GATEWAY_HTTP = import.meta.env.VITE_GATEWAY_HTTP || "http://localhost:3000";

// ── Reusable button ───────────────────────────────────────────────────────────
function Btn({ onClick, disabled, children, color = T.primary, hov = T.primaryHov, outline = false }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "all 0.15s",
    border: outline ? `1.5px solid ${color}` : "none",
    background: outline ? "transparent" : color,
    color: outline ? color : "#fff",
    userSelect: "none",
  };
  return (
    <button style={base} onClick={onClick} disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = outline ? `${color}15` : hov; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = outline ? "transparent" : color; }}>
      {children}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
const Sep = () => <div style={{ width: 1, height: 24, background: T.border, flexShrink: 0 }} />;

// ═════════════════════════════════════════════════════════════════════════════
// CLUSTER PANEL
// ═════════════════════════════════════════════════════════════════════════════
function ClusterPanel({ connected }) {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    async function poll() {
      try {
        const res  = await fetch(`${GATEWAY_HTTP}/cluster-status`);
        const data = await res.json();
        setNodes(data);
      } catch { /* not ready */ }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", flexShrink: 0 }}>

      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.primary}15`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
          ⚡
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>Cluster Info</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: T.textLight,
                       background: "#f1f5f9", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
          RAFT
        </span>
      </div>

      {/* Nodes */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {nodes.length === 0 && (
          <p style={{ fontSize: 12, color: T.textLight, textAlign: "center", padding: "12px 0" }}>
            Connecting to cluster…
          </p>
        )}
        {nodes.map((node) => {
          const isLeader    = node.state === "LEADER";
          const isDown      = node.state === "UNREACHABLE";
          const isCandidate = node.state === "CANDIDATE";
          return (
            <div key={node.url} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", borderRadius: 12, transition: "all 0.2s",
              opacity: isDown ? 0.45 : 1,
              background: isLeader ? T.successBg : isCandidate ? "#fffbeb" : "#f8fafc",
              border: `1px solid ${isLeader ? T.successBdr : isCandidate ? "#fde68a" : T.border}`,
            }}>
              {/* Left */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, fontSize: 15,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isLeader ? "#dcfce7" : isDown ? "#fee2e2" : `${T.primary}10`,
                  border: `1px solid ${isLeader ? "#bbf7d0" : isDown ? "#fecaca" : `${T.primary}25`}`,
                }}>
                  {isLeader ? "👑" : isDown ? "💀" : "🖥"}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.2 }}>
                    {node.nodeId ?? "—"}
                  </p>
                  {!isDown && (
                    <p style={{ fontSize: 10, color: T.textLight, fontFamily: "monospace", marginTop: 1 }}>
                      Term {node.currentTerm} · Log {node.logLength}
                    </p>
                  )}
                </div>
              </div>

              {/* Badge */}
              {isLeader && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                               background: T.success, color: "#fff", letterSpacing: "0.05em" }}>
                  LEADER
                </span>
              )}
              {isCandidate && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                               background: T.warning, color: "#fff" }}>
                  VOTING
                </span>
              )}
              {!isLeader && !isDown && !isCandidate && (
                <span style={{ fontSize: 11, color: T.textLight, fontWeight: 500 }}>Follower</span>
              )}
              {isDown && (
                <span style={{ fontSize: 11, color: T.danger, fontWeight: 600 }}>Down</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                       background: connected ? T.success : T.danger,
                       boxShadow: connected ? `0 0 6px ${T.success}` : "none",
                       animation: connected ? "pulse 2s infinite" : "none" }} />
        <span style={{ fontSize: 12, fontWeight: 600,
                       color: connected ? T.success : T.danger }}>
          {connected ? "Connected" : "Reconnecting…"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: T.textLight }}>
          {nodes.filter(n => n.state !== "UNREACHABLE").length}/3 alive
        </span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHAT PANEL
// ═════════════════════════════════════════════════════════════════════════════
const BUBBLE_COLORS = ["#7c3aed","#06b6d4","#f43f5e","#059669","#d97706","#2563eb","#db2777"];
function bubbleColor(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return BUBBLE_COLORS[Math.abs(h) % BUBBLE_COLORS.length];
}

function ChatPanel({ messages, onSend, identity }) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text); setInput("");
  }

  const isMe = (msg) => msg.userId === identity?.userId;

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex",
                  flexDirection: "column", overflow: "hidden", maxHeight: "52%" }}>

      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.secondary}15`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
          💬
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>Chat</span>
        {messages.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700,
                         background: `${T.primary}15`, color: T.primary,
                         padding: "2px 8px", borderRadius: 99, border: `1px solid ${T.primary}30` }}>
            {messages.length}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex",
                    flexDirection: "column", gap: 10, minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>👋</div>
            <p style={{ fontSize: 12, color: T.textLight }}>No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const mine  = isMe(msg);
          const color = bubbleColor(msg.userId);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column",
                                   alignItems: mine ? "flex-end" : "flex-start", gap: 3 }}>
              {/* Sender + time */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, paddingInline: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%",
                               background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase",
                               letterSpacing: "0.04em" }}>
                  {mine ? "You" : msg.label}
                </span>
                <span style={{ fontSize: 10, color: T.textLight }}>
                  {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {/* Bubble */}
              <div style={{
                padding: "8px 12px", maxWidth: "88%", wordBreak: "break-word",
                fontSize: 13, lineHeight: 1.5,
                borderRadius: mine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                background: mine ? color : "#f1f5f9",
                color: mine ? "#fff" : T.text,
                boxShadow: mine ? `0 2px 8px ${color}30` : "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend}
        style={{ display: "flex", gap: 8, padding: "10px 12px",
                 borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a message..."
          maxLength={200}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: 10, fontSize: 13,
            color: T.text, background: "#f8fafc", outline: "none",
            border: `1.5px solid ${focused ? T.primary : T.border}`,
            transition: "border-color 0.15s",
          }}
        />
        <button type="submit" disabled={!input.trim()}
          style={{
            padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: T.secondary, color: "#fff", border: "none",
            cursor: input.trim() ? "pointer" : "not-allowed",
            opacity: input.trim() ? 1 : 0.4, transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (input.trim()) e.currentTarget.style.background = T.secondaryH; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.secondary; }}>
          Send
        </button>
      </form>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tool,      setTool]      = useState("pen");
  const [color,     setColor]     = useState("#7c3aed");
  const [brushSize, setBrushSize] = useState(4);
  const [canUndo,   setCanUndo]   = useState(false);
  const [canRedo,   setCanRedo]   = useState(false);
  const [chatMessages,  setChatMessages]  = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});

  const canvasRef     = useRef(null);
  const strokeHistory = useRef([]);

  function refreshUndoRedo() {
    setCanUndo(canvasRef.current?.canUndo() ?? false);
    setCanRedo(canvasRef.current?.canRedo() ?? false);
  }

  const handleRemoteStroke = useCallback((data) => {
    canvasRef.current?.drawRemoteStroke(data);
    strokeHistory.current.push(data);
    refreshUndoRedo();
  }, []);

  const handleCursor   = useCallback((msg) => setRemoteCursors((p) => ({ ...p, [msg.userId]: msg })), []);
  const handleChat     = useCallback((msg) => setChatMessages((p) => [...p, msg]), []);
  const handleClear    = useCallback(() => { canvasRef.current?.clear(); strokeHistory.current = []; refreshUndoRedo(); }, []);
  const handleUndo     = useCallback(() => { canvasRef.current?.undo(); refreshUndoRedo(); }, []);
  const handleRedo     = useCallback(() => { canvasRef.current?.redo(); refreshUndoRedo(); }, []);
  const handleUserLeft = useCallback((msg) => {
    setRemoteCursors((p) => { const n = { ...p }; delete n[msg.userId]; return n; });
  }, []);

  const { connected, identity, send } = useWebSocket({
    onStroke: handleRemoteStroke, onCursor: handleCursor,
    onChat: handleChat, onClear: handleClear,
    onUndo: handleUndo, onRedo: handleRedo, onUserLeft: handleUserLeft,
  });

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); doUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); doRedo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function doUndo() { if (canvasRef.current?.undo()) send({ type: "undo" }); refreshUndoRedo(); }
  function doRedo() { if (canvasRef.current?.redo()) send({ type: "redo" }); refreshUndoRedo(); }
  function doClear() { canvasRef.current?.clear(); strokeHistory.current = []; send({ type: "clear" }); refreshUndoRedo(); }
  function doSave() {
    const blob = new Blob([JSON.stringify({ strokes: strokeHistory.current }, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "drawing.json" }).click();
    URL.revokeObjectURL(url);
  }

  const TOOLS = [
    { id: "pen",       icon: "✏️", label: "Pen" },
    { id: "eraser",    icon: "🧽", label: "Eraser" },
    { id: "rectangle", icon: "⬛", label: "Rect" },
    { id: "circle",    icon: "⭕", label: "Circle" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
                  overflow: "hidden", background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}>

      {/* ── TOP TOOLBAR ───────────────────────────────────────────────────── */}
      <div style={{
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", background: T.panel, flexShrink: 0,
        borderBottom: `1px solid ${T.border}`,
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${T.primary}, #a855f7)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 12px ${T.primary}40`,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 15L6 6l5 6 2.5-3" stroke="#fff" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: T.primary, lineHeight: 1.1,
                         letterSpacing: "-0.02em" }}>DrawSync</h1>
            <p style={{ fontSize: 10, color: T.textLight, lineHeight: 1 }}>Distributed Canvas</p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

          {/* Color picker */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, overflow: "hidden", flexShrink: 0,
              border: `2px solid ${T.border}`, background: color,
              boxShadow: `0 2px 8px ${color}50`, cursor: "pointer",
            }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: T.textMuted,
                           textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {color}
            </span>
          </label>

          <Sep />

          {/* Brush size */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: T.textLight, fontWeight: 500 }}>Size</span>
            <input type="range" min="1" max="40" value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{ width: 96 }} />
            <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{
                borderRadius: "50%", background: T.primary, flexShrink: 0,
                width: Math.max(4, Math.min(brushSize * 0.55, 16)),
                height: Math.max(4, Math.min(brushSize * 0.55, 16)),
              }} />
            </div>
          </div>

          <Sep />

          {/* Action buttons */}
          <Btn onClick={doUndo} disabled={!canUndo}>↩ Undo</Btn>
          <Btn onClick={doRedo} disabled={!canRedo}>↪ Redo</Btn>
          <Btn onClick={doClear} color={T.accent} hov={T.accentHov}>✕ Clear</Btn>
          <Btn onClick={doSave}  color={T.secondary} hov={T.secondaryH}>↓ Save</Btn>

          <Sep />

          {/* Connection badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
            background: connected ? T.successBg : T.dangerBg,
            border: `1px solid ${connected ? T.successBdr : "#fecaca"}`,
            color: connected ? T.success : T.danger,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
              background: connected ? T.success : T.danger,
              animation: connected ? "pulse 2s infinite" : "none",
            }} />
            {connected ? "Connected" : "Reconnecting…"}
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        <div style={{
          width: 76, background: T.panel, flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "16px 0", gap: 6,
          boxShadow: "1px 0 4px rgba(0,0,0,0.04)",
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: T.textLight,
                         textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Tools
          </span>

          {TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                style={{
                  width: 52, height: 52, borderRadius: 14, border: "none",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 3, cursor: "pointer",
                  transition: "all 0.15s",
                  background: active ? `${T.primary}12` : "transparent",
                  outline: active ? `2px solid ${T.primary}40` : "2px solid transparent",
                  boxShadow: active ? `0 4px 12px ${T.primary}20` : "none",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f1f5f9"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
                               textTransform: "uppercase",
                               color: active ? T.primary : T.textLight }}>
                  {t.label}
                </span>
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Collaborators */}
          <button title="Collaborators"
            style={{
              width: 52, height: 52, borderRadius: 14, border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, cursor: "pointer", background: "transparent",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            👥
          </button>
        </div>

        {/* CANVAS CENTER */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 24, overflow: "hidden", background: "#f1f5f9" }}>
          <div style={{
            position: "relative", overflow: "hidden", borderRadius: 20,
            width: "100%", maxWidth: 920, aspectRatio: "16/9",
            background: "#ffffff",
            border: `1px solid ${T.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)",
          }}>
            {/* Subtle top accent line */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 10,
              background: `linear-gradient(90deg, ${T.primary}, ${T.secondary}, ${T.accent})`,
              borderRadius: "20px 20px 0 0",
            }} />
            <Canvas
              ref={canvasRef}
              tool={tool} color={color} brushSize={brushSize}
              send={send} remoteCursors={remoteCursors}
            />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          width: 292, display: "flex", flexDirection: "column", gap: 12,
          padding: 12, overflowY: "auto", flexShrink: 0,
          background: T.bg, borderLeft: `1px solid ${T.border}`,
        }}>
          <ChatPanel
            messages={chatMessages}
            onSend={(text) => send({ type: "chat", text })}
            identity={identity}
          />
          <ClusterPanel connected={connected} />
        </div>

      </div>
    </div>
  );
}
