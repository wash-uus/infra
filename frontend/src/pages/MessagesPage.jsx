import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const GROUP_ICONS = {
  youths: "\u26A1",
  women: "\uD83C\uDF38",
  worshippers: "\uD83C\uDFB5",
  preachers: "\uD83D\uDCE3",
  instrumentalists: "\uD83C\uDFB8",
  "church-workers": "\u26EA",
  intercessors: "\uD83D\uDE4F",
  discipleship: "\uD83C\uDF93",
};
function groupIcon(slug = "") { return GROUP_ICONS[slug.toLowerCase()] || "\uD83D\uDC65"; }
function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// -- Toast ---------------------------------------------------------------------
function Toast({ msg }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700
                    text-white text-sm px-5 py-2.5 rounded-full shadow-xl pointer-events-none">
      {msg}
    </div>
  );
}

// -- Typing indicator ----------------------------------------------------------
function TypingIndicator({ name }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-xs text-zinc-500 h-5">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
      <span>{name} is typing…</span>
    </div>
  );
}

// -- Message bubble with hover actions -----------------------------------------
// -- Message bubble with hover actions ----------------------------------------
function MessageBubble({ m, isMine, onDelete, onCopy, onShare }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`flex gap-2 items-end ${isMine ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800
                      text-[11px] font-bold text-zinc-400 ring-1 ring-zinc-700 mb-0.5">
        {(m.sender_email || "?")[0].toUpperCase()}
      </div>

      {/* Bubble */}
      <div className="max-w-xs lg:max-w-sm">
        <div className={`rounded-2xl px-4 py-2.5
          ${isMine ? "bg-gradient-to-br from-amber-600/80 to-orange-700/70 rounded-tr-sm"
                   : "bg-zinc-900 rounded-tl-sm"}
          ${m.optimistic ? "opacity-60" : ""}
          ${m.deleted ? "opacity-40" : ""}`}>
          {!isMine && (
            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">
              {m.sender_name || m.sender_email?.split("@")[0] || "Member"}
            </p>
          )}
          <p className="text-sm text-zinc-100 whitespace-pre-wrap break-words">
            {m.deleted ? <span className="italic opacity-60">This message was deleted.</span> : m.text}
          </p>
          <p className="text-[10px] text-zinc-400/60 mt-1 text-right">{formatTime(m.timestamp)}</p>
        </div>
      </div>

      {/* Action bar inside flex row -- mouse stays within hover boundary */}
      {hover && !m.deleted && !m.optimistic && (
        <div className="flex shrink-0 self-center items-center gap-0.5 bg-zinc-800 border
                        border-zinc-700 rounded-xl px-1.5 py-1 shadow-lg">
          <button title="Copy" onClick={() => onCopy(m.text)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button title="Share" onClick={() => onShare(m.text)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          {isMine && (
            <button title="Delete" onClick={() => onDelete(m.id)}
              className="p-1.5 rounded-lg hover:bg-red-900/60 text-zinc-500 hover:text-red-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
function DirectTab({ isAuthenticated }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const [toast, setToast] = useState(null);
  const bottomRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimerRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get("/messaging/direct/")
      .then((r) => setConversations(r.data.results || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    wsRef.current?.close();
    if (!selected || !user) return;
    const wsBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api")
      .replace(/^http/, "ws").replace(/\/api\/?$/, "");
    const ws = new WebSocket(`${wsBase}/ws/messages/direct/${selected.other_user_id || selected.sender}/`);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "typing_indicator" && data.sender_id !== user.id) {
          setTyping(data.sender_name);
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setTyping(null), 2500);
          return;
        }
        if (data.message) {
          setThread((prev) => [...prev, {
            id: data.id || Date.now(),
            text: data.message,
            sender_email: data.sender_email,
            sender_name: data.sender_email?.split("@")[0],
            timestamp: new Date().toISOString(),
          }]);
        }
      } catch { /* noop */ }
    };
    wsRef.current = ws;
    return () => { ws.close(); clearTimeout(typingTimerRef.current); };
  }, [selected, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000); };

  const openConversation = useCallback((msg) => {
    setSelected(msg);
    api.get(`/messaging/direct/?interlocutor=${msg.sender}`)
      .then((r) => setThread(r.data.results || []))
      .catch(() => setThread([]));
  }, []);

  const handleType = (e) => {
    setText(e.target.value);
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type: "typing" }));
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    setSending(true);
    const msgText = text;
    setText("");
    const optId = `opt-${Date.now()}`;
    setThread((prev) => [...prev, {
      id: optId, text: msgText,
      sender_email: user?.email,
      sender_name: user?.email?.split("@")[0],
      timestamp: new Date().toISOString(), optimistic: true,
    }]);
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "message", text: msgText }));
        setTimeout(() => setThread((p) => p.filter((m) => m.id !== optId)), 800);
      } else {
        await api.post("/messaging/direct/", { receiver: selected.sender, text: msgText });
        setThread((p) => p.map((m) => m.id === optId ? { ...m, optimistic: false } : m));
      }
    } catch { showToast("Failed to send."); }
    finally { setSending(false); }
  };

  const handleDelete = async (msgId) => {
    if (String(msgId).startsWith("opt-")) return;
    try {
      await api.delete(`/messaging/direct/${msgId}/`);
      setThread((p) => p.map((m) => m.id === msgId ? { ...m, deleted: true } : m));
    } catch { showToast("Could not delete message."); }
  };

  const handleCopy = (t) => { navigator.clipboard.writeText(t).then(() => showToast("Copied!")); };
  // Share: message text ONLY — no email or contact information passed
  const handleShare = (t) => {
    if (navigator.share) { navigator.share({ text: t }).catch(() => {}); }
    else { navigator.clipboard.writeText(t).then(() => showToast("Copied to clipboard!")); }
  };

  return (
    <>
      {toast && <Toast msg={toast} />}
      <div className="grid gap-4 lg:grid-cols-3 min-h-[560px]">
        {/* Sidebar */}
        <div className="card overflow-hidden p-0">
          <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
            <span>💬</span>
            <p className="text-sm font-semibold text-white">Direct Messages</p>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-900" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
              <p className="text-3xl">💬</p>
              <p className="text-sm font-medium text-zinc-400">No conversations yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/50">
              {conversations.map((msg) => (
                <li key={msg.id} onClick={() => openConversation(msg)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-all hover:bg-zinc-900
                    ${selected?.id === msg.id ? "bg-zinc-900 border-l-2 border-amber-500" : ""}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                                  bg-gradient-to-br from-amber-500/30 to-orange-600/20 text-sm font-bold
                                  text-amber-400 ring-1 ring-zinc-700">
                    {(msg.sender_email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Username prefix only — not full email address */}
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {msg.sender_email?.split("@")[0] || "Member"}
                    </p>
                    <p className="truncate text-xs text-zinc-600">{msg.text || "Audio message"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {!msg.is_read && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                    <span className="text-[10px] text-zinc-700">{formatTime(msg.timestamp)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Chat pane */}
        <div className="card col-span-2 flex flex-col overflow-hidden p-0">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-orange-600/20 text-sm font-bold text-amber-400 ring-1 ring-zinc-700">
                  {(selected.sender_email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selected.sender_email?.split("@")[0] || "Member"}
                  </p>
                  <p className="text-xs text-zinc-500">Direct Message</p>
                </div>
                <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-zinc-950/40">
                {thread.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-xs text-zinc-600">No messages — start the conversation!</p>
                  </div>
                )}
                {thread.map((m) => (
                  <MessageBubble key={m.id} m={m} isMine={m.sender_email === user?.email}
                    onDelete={handleDelete} onCopy={handleCopy} onShare={handleShare} />
                ))}
                <TypingIndicator name={typing} />
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-zinc-800 p-4 bg-zinc-950/60">
                <input value={text} onChange={handleType} placeholder="Type a message…" className="input-dark flex-1" />
                <button type="submit" disabled={sending || !text.trim()} className="btn-gold py-2.5 px-5 text-sm disabled:opacity-50">Send</button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-10">
              <span className="text-5xl">💬</span>
              <p className="font-semibold text-zinc-300">Select a conversation</p>
              <p className="text-sm text-zinc-600">Choose a contact from the left to open the chat.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* -- Group Chat ----------------------------------------- */
function GroupsTab({ isAuthenticated }) {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [typing, setTyping] = useState(null);
  const [toast, setToast] = useState(null);
  const bottomRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimerRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/groups/")
      .then((r) => setGroups(r.data.results || []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    wsRef.current?.close();
    if (!selected || !isAuthenticated) return;

    api.get(`/messaging/group/?group=${selected.id}`)
      .then((r) => setThread(r.data.results || []))
      .catch(() => setThread([]));

    const wsBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api")
      .replace(/^http/, "ws").replace(/\/api\/?$/, "");
    const ws = new WebSocket(`${wsBase}/ws/messages/group/${selected.id}/`);
    ws.onopen = () => setWsStatus("connected");
    ws.onclose = () => setWsStatus("disconnected");
    ws.onerror = () => setWsStatus("error");
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "typing_indicator" && data.sender_id !== user?.id) {
          setTyping(data.sender_name);
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setTyping(null), 2500);
          return;
        }
        if (data.message) {
          setThread((prev) => {
            if (data.id && prev.some((m) => m.id === data.id)) return prev;
            return [...prev, {
              id: data.id || Date.now(),
              text: data.message,
              sender_email: data.sender_email,
              sender_name: data.sender_email?.split("@")[0] || "Member",
              timestamp: new Date().toISOString(),
            }];
          });
        }
      } catch { /* noop */ }
    };
    wsRef.current = ws;
    return () => { ws.close(); clearTimeout(typingTimerRef.current); };
  }, [selected, isAuthenticated, user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000); };

  const handleType = (e) => {
    setText(e.target.value);
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type: "typing" }));
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    setSending(true);
    const msgText = text;
    setText("");
    const optId = `opt-${Date.now()}`;
    setThread((prev) => [...prev, {
      id: optId, text: msgText,
      sender_email: user?.email,
      sender_name: user?.email?.split("@")[0] || "You",
      timestamp: new Date().toISOString(), mine: true, optimistic: true,
    }]);
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "message", text: msgText }));
        setTimeout(() => setThread((p) => p.filter((m) => m.id !== optId)), 800);
      } else {
        await api.post("/messaging/group/", { group: selected.id, text: msgText });
        setThread((p) => p.map((m) => m.id === optId ? { ...m, optimistic: false } : m));
      }
    } catch { showToast("Failed to send."); }
    finally { setSending(false); }
  };

  const handleDelete = async (msgId) => {
    if (String(msgId).startsWith("opt-")) return;
    try {
      await api.delete(`/messaging/group/${msgId}/`);
      setThread((p) => p.map((m) => m.id === msgId ? { ...m, deleted: true } : m));
    } catch { showToast("Could not delete message."); }
  };

  const handleCopy = (t) => { navigator.clipboard.writeText(t).then(() => showToast("Copied!")); };
  // Share: message text ONLY — no sender email or contact information
  const handleShare = (t) => {
    if (navigator.share) { navigator.share({ text: t }).catch(() => {}); }
    else { navigator.clipboard.writeText(t).then(() => showToast("Copied to clipboard!")); }
  };

  return (
    <>
      {toast && <Toast msg={toast} />}
      <div className="grid gap-4 lg:grid-cols-3 min-h-[560px]">
        {/* Groups sidebar */}
        <div className="card overflow-hidden p-0">
          <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
            <span>👥</span>
            <p className="text-sm font-semibold text-white">Ministry Groups</p>
            <span className="ml-auto text-[10px] text-zinc-600 font-medium">{groups.length} groups</span>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-900" />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <p className="text-4xl">👥</p>
              <p className="text-sm font-medium text-zinc-400">No groups yet</p>
              <Link to="/groups" className="mt-1 text-xs font-semibold text-amber-400 hover:text-amber-300">Browse Groups â†’</Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/50 overflow-y-auto max-h-[480px]">
              {groups.map((g) => (
                <li key={g.id} onClick={() => setSelected(g)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-all hover:bg-zinc-900
                    ${selected?.id === g.id ? "bg-zinc-900 border-l-2 border-amber-500" : ""}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                                  bg-gradient-to-br from-zinc-800 to-zinc-900 text-lg ring-1 ring-zinc-700">
                    {groupIcon(g.slug || g.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-200">{g.name}</p>
                    <p className="text-xs text-zinc-600">{g.member_count || 0} members</p>
                  </div>
                  {g.is_private && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-500">Private</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Group chat pane */}
        <div className="card col-span-2 flex flex-col overflow-hidden p-0">
          {!isAuthenticated ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-10">
              <span className="text-5xl">ðŸ”’</span>
              <p className="font-semibold text-zinc-300">Sign in to chat</p>
              <Link to="/login" className="btn-gold py-2 px-5 text-sm mt-1">Sign In</Link>
            </div>
          ) : selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-xl ring-1 ring-zinc-700">
                  {groupIcon(selected.slug || selected.name)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selected.name}</p>
                  <p className="text-xs text-zinc-500">{selected.member_count || 0} members</p>
                </div>
                <div className="ml-auto">
                  <span className={`flex items-center gap-1.5 text-xs
                    ${wsStatus === "connected" ? "text-emerald-400" : wsStatus === "error" ? "text-red-400" : "text-zinc-500"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full
                      ${wsStatus === "connected" ? "bg-emerald-400 animate-pulse" : wsStatus === "error" ? "bg-red-400" : "bg-zinc-600"}`} />
                    {wsStatus === "connected" ? "Live" : wsStatus === "error" ? "Error" : "Connecting…"}
                  </span>
                </div>
              </div>

              {selected.description && (
                <div className="border-b border-zinc-800/60 bg-zinc-900/40 px-5 py-2">
                  <p className="text-xs text-zinc-500 line-clamp-1">{selected.description}</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-zinc-950/40">
                {thread.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <p className="text-3xl">{groupIcon(selected.slug || selected.name)}</p>
                    <p className="text-xs text-zinc-600">No messages yet — be the first to say something!</p>
                  </div>
                )}
                {thread.map((m) => (
                  <MessageBubble key={m.id} m={m} isMine={m.sender_email === user?.email || !!m.mine}
                    onDelete={handleDelete} onCopy={handleCopy} onShare={handleShare} />
                ))}
                <TypingIndicator name={typing} />
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="flex gap-2 border-t border-zinc-800 p-4 bg-zinc-950/60">
                <input value={text} onChange={handleType}
                  placeholder={`Message ${selected.name}…`} className="input-dark flex-1" />
                <button type="submit" disabled={sending || !text.trim()}
                  className="btn-gold py-2.5 px-5 text-sm disabled:opacity-50">Send</button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-10">
              <span className="text-5xl">👥</span>
              <p className="font-semibold text-zinc-300">Select a group to chat</p>
              <p className="text-sm text-zinc-600">Pick a ministry group from the left panel.</p>
              <Link to="/groups" className="mt-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition">
                Browse & Join Groups â†’
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* -- Main MessagesPage ---------------------------------- */
export default function MessagesPage() {
  const [tab, setTab] = useState("groups");
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-500">Communicate</p>
            <h1 className="text-3xl font-black text-white">Messages</h1>
            <p className="mt-1 text-zinc-500">Real-time direct and group messaging across the movement.</p>
          </div>
          {!isAuthenticated && (
            <Link to="/login" className="btn-gold py-2.5 px-5 text-sm self-start sm:self-auto">Sign In to Chat</Link>
          )}
        </div>

        <div className="mb-6 flex gap-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-1 w-fit">
          {[
            { key: "groups", label: "Group Chats", icon: "👥" },
            { key: "direct", label: "Direct Messages", icon: "💬" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all
                ${tab === t.key
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-900/30"
                  : "text-zinc-500 hover:text-zinc-300"}`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {tab === "direct" ? (
          <DirectTab isAuthenticated={isAuthenticated} />
        ) : (
          <GroupsTab isAuthenticated={isAuthenticated} />
        )}
      </div>
    </div>
  );
}
