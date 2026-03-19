import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import messaging from "../api/messaging";
import { useAuth } from "../context/AuthContext";
import useMessagePolling from "../hooks/useMessagePolling";

// ─── Constants ────────────────────────────────────────────────────────────────
const POLL_INTERVAL = 4000; // ms between polls (4 s)

const GROUP_ICONS = {
  youths: "⚡",
  women: "🌸",
  worshippers: "🎵",
  preachers: "📣",
  instrumentalists: "🎸",
  "church-workers": "⛪",
  intercessors: "🙏",
  discipleship: "🎓",
};
const groupIcon = (slug = "") => GROUP_ICONS[slug?.toLowerCase()] ?? "👥";
const formatTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border
                    border-zinc-700 text-white text-sm px-5 py-2.5 rounded-full shadow-xl
                    pointer-events-none">
      {msg}
    </div>
  );
}

/** Animated "polling" status dot — replaces the old WebSocket "Live" indicator. */
function PollIndicator({ active }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs ${active ? "text-emerald-400" : "text-zinc-500"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
      {active ? "Live" : "Reconnecting…"}
    </span>
  );
}

/** Read-status tick (✓ sent, ✓✓ read). */
function ReadTick({ isRead, isMine }) {
  if (!isMine) return null;
  return (
    <span className={`text-[10px] ml-1 ${isRead ? "text-sky-400" : "text-zinc-600"}`}>
      {isRead ? "✓✓" : "✓"}
    </span>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ m, isMine, onDelete, onCopy, onShare }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`flex gap-2 items-end ${isMine ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                      bg-zinc-800 text-[11px] font-bold text-zinc-400 ring-1 ring-zinc-700 mb-0.5">
        {(m.sender_email || "?")[0].toUpperCase()}
      </div>

      {/* Bubble */}
      <div className="max-w-xs lg:max-w-sm">
        <div className={`rounded-2xl px-4 py-2.5
          ${isMine
            ? "bg-gradient-to-br from-amber-600/80 to-orange-700/70 rounded-tr-sm"
            : "bg-zinc-900 rounded-tl-sm"}
          ${m.optimistic ? "opacity-60" : ""}
          ${m.is_deleted ? "opacity-40" : ""}`}>
          {!isMine && (
            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">
              {m.sender_name || m.sender_email?.split("@")[0] || "Member"}
            </p>
          )}
          <p className="text-sm text-zinc-100 whitespace-pre-wrap break-words">
            {m.is_deleted
              ? <span className="italic opacity-60">This message was deleted.</span>
              : m.text}
          </p>
          {m.audio_file && !m.is_deleted && (
            <audio controls src={m.audio_file} className="mt-2 w-full h-8" />
          )}
          <div className="flex items-center justify-end gap-0.5 mt-1">
            <span className="text-[10px] text-zinc-400/60">{formatTime(m.timestamp)}</span>
            <ReadTick isRead={m.is_read} isMine={isMine} />
          </div>
        </div>
      </div>

      {/* Hover actions */}
      {hover && !m.is_deleted && !m.optimistic && (
        <div className="flex shrink-0 self-center items-center gap-0.5 bg-zinc-800 border
                        border-zinc-700 rounded-xl px-1.5 py-1 shadow-lg">
          <button title="Copy" onClick={() => onCopy(m.text)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 002 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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

// ─── Direct Messages Tab ──────────────────────────────────────────────────────
function DirectTab({ isAuthenticated }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);   // full conversation object
  const [thread, setThread] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [showNewDm, setShowNewDm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pollActive, setPollActive] = useState(false);
  const [unreadMap, setUnreadMap] = useState({}); // partnerId → unread count
  const bottomRef = useRef(null);
  const searchDebounce = useRef(null);

  // ── Load conversation list ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    messaging.getConversations()
      .then((r) => {
        const convs = r.data.results || [];
        setConversations(convs);
        // Build unread map from is_read flag
        const map = {};
        convs.forEach((c) => {
          if (!c.is_read && c.sender !== user?.id) {
            const partnerId = c.sender === user?.id ? c.receiver : c.sender;
            map[partnerId] = (map[partnerId] || 0) + 1;
          }
        });
        setUnreadMap(map);
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user?.id]);

  // ── Load full thread when a conversation is opened ─────────────────────
  const openConversation = useCallback((conv) => {
    setSelected(conv);
    setThread([]);
    const partnerId = conv.sender === user?.id ? conv.receiver : conv.sender;
    messaging.getThread(partnerId)
      .then((r) => setThread(r.data.results || []))
      .catch(() => setThread([]));
    // Mark messages from this partner as read
    messaging.markDirectRead(partnerId).catch(() => {});
    // Clear unread badge
    setUnreadMap((prev) => { const n = { ...prev }; delete n[partnerId]; return n; });
  }, [user?.id]);

  // ── Polling: only when a conversation is open ──────────────────────────
  const partnerId = selected
    ? (selected.sender === user?.id ? selected.receiver : selected.sender)
    : null;

  const handleNewDMs = useCallback((msgs) => {
    setPollActive(true);
    setThread((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const fresh = msgs.filter((m) => !existingIds.has(m.id));
      if (fresh.length === 0) return prev;
      // Auto mark as read since the pane is open
      messaging.markDirectRead(partnerId).catch(() => {});
      return [...prev, ...fresh];
    });
  }, [partnerId]);

  useMessagePolling({
    endpoint: "/messaging/direct/",
    params: partnerId ? { interlocutor: partnerId } : {},
    conversationKey: String(partnerId ?? "none"),
    interval: POLL_INTERVAL,
    enabled: !!selected && isAuthenticated,
    onMessages: handleNewDMs,
    onError: () => setPollActive(false),
  });

  // ── Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // ── Send ───────────────────────────────────────────────────────────────
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected || !partnerId) return;
    setSending(true);
    const msgText = text;
    const optId = `opt-${Date.now()}`;
    setText("");
    setThread((prev) => [
      ...prev,
      {
        id: optId, text: msgText,
        sender: user?.id, sender_email: user?.email,
        sender_name: user?.email?.split("@")[0],
        receiver: partnerId, timestamp: new Date().toISOString(),
        optimistic: true, is_read: false,
      },
    ]);
    try {
      const res = await messaging.sendDirect(partnerId, msgText);
      setThread((prev) =>
        prev.map((m) => (m.id === optId ? { ...res.data, optimistic: false } : m))
      );
    } catch {
      setThread((prev) => prev.filter((m) => m.id !== optId));
      showToast("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (msgId) => {
    if (String(msgId).startsWith("opt-")) return;
    try {
      await messaging.deleteDirect(msgId);
      setThread((prev) => prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true } : m)));
    } catch { showToast("Could not delete message."); }
  };

  const handleCopy = (t) => navigator.clipboard.writeText(t).then(() => showToast("Copied!"));
  const handleShare = (t) => {
    if (navigator.share) navigator.share({ text: t }).catch(() => {});
    else navigator.clipboard.writeText(t).then(() => showToast("Copied to clipboard!"));
  };

  // ── User search (new DM) ───────────────────────────────────────────────
  const handleUserSearch = (q) => {
    setSearchQuery(q);
    clearTimeout(searchDebounce.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { default: api } = await import("../api/client");
        const r = await api.get("/accounts/users/search/", { params: { q } });
        setSearchResults(r.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  };

  const startDm = (person) => {
    setShowNewDm(false);
    setSearchQuery("");
    setSearchResults([]);
    const fake = {
      id: `new-${person.id}`,
      sender: person.id, sender_email: person.email,
      sender_name: person.full_name || person.username,
      receiver: user?.id, text: "",
      timestamp: new Date().toISOString(), is_read: true,
    };
    setConversations((prev) => [fake, ...prev.filter((c) => c.sender !== person.id)]);
    openConversation(fake);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {toast && <Toast msg={toast} />}

      {/* New DM modal */}
      {showNewDm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShowNewDm(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-white">New Message</h3>
              <button onClick={() => setShowNewDm(false)}
                className="text-zinc-500 hover:text-white transition text-lg">×</button>
            </div>
            <input type="search" autoFocus value={searchQuery}
              onChange={(e) => handleUserSearch(e.target.value)}
              placeholder="Search by name or username…"
              className="input-dark w-full mb-3" />
            {searching && <p className="text-xs text-zinc-500 text-center py-3">Searching…</p>}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-3">No users found.</p>
            )}
            {searchResults.length > 0 && (
              <ul className="space-y-1 max-h-52 overflow-y-auto">
                {searchResults.map((person) => (
                  <li key={person.id}>
                    <button onClick={() => startDm(person)}
                      className="flex items-center gap-3 w-full rounded-xl p-2.5 hover:bg-zinc-900 transition text-left">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                                      bg-gradient-to-br from-amber-500/30 to-orange-600/20 text-sm
                                      font-bold text-amber-400 ring-1 ring-zinc-700">
                        {(person.full_name || person.username || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {person.full_name || person.username}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">@{person.username}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 min-h-[560px]">
        {/* Sidebar: conversations list */}
        <div className="card overflow-hidden p-0">
          <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
            <span>💬</span>
            <p className="text-sm font-semibold text-white">Direct Messages</p>
            {isAuthenticated && (
              <button onClick={() => setShowNewDm(true)}
                className="ml-auto flex items-center gap-1 rounded-lg border border-amber-500/40
                           px-2.5 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-950/30 transition">
                + New
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-900" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
              <p className="text-3xl">💬</p>
              <p className="text-sm font-medium text-zinc-400">No conversations yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/50">
              {conversations.map((conv) => {
                const pid = conv.sender === user?.id ? conv.receiver : conv.sender;
                const displayName = conv.sender === user?.id
                  ? (conv.receiver_name || conv.receiver_email?.split("@")[0] || "Member")
                  : (conv.sender_name || conv.sender_email?.split("@")[0] || "Member");
                const hasUnread = !!unreadMap[pid];

                return (
                  <li key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-all
                                hover:bg-zinc-900
                                ${selected?.id === conv.id ? "bg-zinc-900 border-l-2 border-amber-500" : ""}`}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                                    bg-gradient-to-br from-amber-500/30 to-orange-600/20 text-sm font-bold
                                    text-amber-400 ring-1 ring-zinc-700">
                      {displayName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">{displayName}</p>
                      <p className="truncate text-xs text-zinc-600">{conv.text || "Start a conversation"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {hasUnread && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                      <span className="text-[10px] text-zinc-700">{formatTime(conv.timestamp)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Chat pane */}
        <div className="card col-span-2 flex flex-col overflow-hidden p-0">
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full
                                bg-gradient-to-br from-amber-500/30 to-orange-600/20 text-sm font-bold
                                text-amber-400 ring-1 ring-zinc-700">
                  {(() => {
                    const n = selected.sender === user?.id
                      ? (selected.receiver_name || selected.receiver_email || "?")
                      : (selected.sender_name || selected.sender_email || "?");
                    return n[0].toUpperCase();
                  })()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selected.sender === user?.id
                      ? (selected.receiver_name || selected.receiver_email?.split("@")[0] || "Member")
                      : (selected.sender_name || selected.sender_email?.split("@")[0] || "Member")}
                  </p>
                  <p className="text-xs text-zinc-500">Direct Message</p>
                </div>
                <div className="ml-auto">
                  <PollIndicator active={pollActive} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-zinc-950/40">
                {thread.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-xs text-zinc-600">No messages — start the conversation!</p>
                  </div>
                )}
                {thread.map((m) => (
                  <MessageBubble
                    key={m.id} m={m}
                    isMine={m.sender === user?.id || m.sender_email === user?.email}
                    onDelete={handleDelete} onCopy={handleCopy} onShare={handleShare}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send}
                className="flex gap-2 border-t border-zinc-800 p-4 bg-zinc-950/60">
                <input value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…" className="input-dark flex-1" />
                <button type="submit" disabled={sending || !text.trim()}
                  className="btn-gold py-2.5 px-5 text-sm disabled:opacity-50">
                  {sending ? "…" : "Send"}
                </button>
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

// ─── Group Chat Tab ───────────────────────────────────────────────────────────
function GroupsTab({ isAuthenticated }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pollActive, setPollActive] = useState(false);
  const [toast, setToast] = useState(null);
  const bottomRef = useRef(null);

  // Load groups
  useEffect(() => {
    import("../api/client").then(({ default: api }) => {
      api.get("/groups/")
        .then((r) => setGroups(r.data.results || []))
        .catch(() => setGroups([]))
        .finally(() => setLoading(false));
    });
  }, []);

  // Load initial thread when a group is selected
  useEffect(() => {
    if (!selected || !isAuthenticated) return;
    setThread([]);
    messaging.getGroupThread(selected.id)
      .then((r) => setThread(r.data.results || []))
      .catch(() => setThread([]));
    messaging.markGroupRead(selected.id).catch(() => {});
  }, [selected, isAuthenticated]);

  // Polling for group messages
  const handleNewGroupMsgs = useCallback((msgs) => {
    setPollActive(true);
    setThread((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const fresh = msgs.filter((m) => !existingIds.has(m.id));
      if (fresh.length === 0) return prev;
      messaging.markGroupRead(selected?.id).catch(() => {});
      return [...prev, ...fresh];
    });
  }, [selected?.id]);

  useMessagePolling({
    endpoint: "/messaging/group/",
    params: selected ? { group: selected.id } : {},
    conversationKey: String(selected?.id ?? "none"),
    interval: POLL_INTERVAL,
    enabled: !!selected && isAuthenticated,
    onMessages: handleNewGroupMsgs,
    onError: () => setPollActive(false),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    setSending(true);
    const msgText = text;
    const optId = `opt-${Date.now()}`;
    setText("");
    setThread((prev) => [
      ...prev,
      {
        id: optId, text: msgText, group: selected.id,
        sender: user?.id, sender_email: user?.email,
        sender_name: user?.email?.split("@")[0] || "You",
        timestamp: new Date().toISOString(), optimistic: true,
      },
    ]);
    try {
      const res = await messaging.sendGroup(selected.id, msgText);
      setThread((prev) =>
        prev.map((m) => (m.id === optId ? { ...res.data, optimistic: false } : m))
      );
    } catch {
      setThread((prev) => prev.filter((m) => m.id !== optId));
      showToast("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (msgId) => {
    if (String(msgId).startsWith("opt-")) return;
    try {
      await messaging.deleteGroup(msgId);
      setThread((prev) => prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true } : m)));
    } catch { showToast("Could not delete message."); }
  };

  const handleCopy = (t) => navigator.clipboard.writeText(t).then(() => showToast("Copied!"));
  const handleShare = (t) => {
    if (navigator.share) navigator.share({ text: t }).catch(() => {});
    else navigator.clipboard.writeText(t).then(() => showToast("Copied to clipboard!"));
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
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-900" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <p className="text-4xl">👥</p>
              <p className="text-sm font-medium text-zinc-400">No groups yet</p>
              <Link to="/groups" className="mt-1 text-xs font-semibold text-amber-400 hover:text-amber-300">
                Browse Groups →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/50 overflow-y-auto max-h-[480px]">
              {groups.map((g) => (
                <li key={g.id} onClick={() => setSelected(g)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-all
                              hover:bg-zinc-900
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
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800
                                     border border-zinc-700 text-zinc-500">Private</span>
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
              <span className="text-5xl">🔒</span>
              <p className="font-semibold text-zinc-300">Sign in to chat</p>
              <Link to="/login" className="btn-gold py-2 px-5 text-sm mt-1">Sign In</Link>
            </div>
          ) : selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full
                                bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-xl ring-1 ring-zinc-700">
                  {groupIcon(selected.slug || selected.name)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selected.name}</p>
                  <p className="text-xs text-zinc-500">{selected.member_count || 0} members</p>
                </div>
                <div className="ml-auto">
                  <PollIndicator active={pollActive} />
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
                  <MessageBubble
                    key={m.id} m={m}
                    isMine={m.sender === user?.id || m.sender_email === user?.email}
                    onDelete={handleDelete} onCopy={handleCopy} onShare={handleShare}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send}
                className="flex gap-2 border-t border-zinc-800 p-4 bg-zinc-950/60">
                <input value={text} onChange={(e) => setText(e.target.value)}
                  placeholder={`Message ${selected.name}…`} className="input-dark flex-1" />
                <button type="submit" disabled={sending || !text.trim()}
                  className="btn-gold py-2.5 px-5 text-sm disabled:opacity-50">
                  {sending ? "…" : "Send"}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-10">
              <span className="text-5xl">👥</span>
              <p className="font-semibold text-zinc-300">Select a group to chat</p>
              <p className="text-sm text-zinc-600">Pick a ministry group from the left panel.</p>
              <Link to="/groups"
                className="mt-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition">
                Browse & Join Groups →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const [tab, setTab] = useState("groups");
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-500">
              Communicate
            </p>
            <h1 className="text-3xl font-black text-white">Messages</h1>
            <p className="mt-1 text-zinc-500">
              Direct and group messaging across the movement.
            </p>
          </div>
          {!isAuthenticated && (
            <Link to="/login" className="btn-gold py-2.5 px-5 text-sm self-start sm:self-auto">
              Sign In to Chat
            </Link>
          )}
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-1 w-fit">
          {[
            { key: "groups", label: "Group Chats", icon: "👥" },
            { key: "direct", label: "Direct Messages", icon: "💬" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold
                          transition-all
                          ${tab === t.key
                            ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-900/30"
                            : "text-zinc-500 hover:text-zinc-300"}`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {tab === "direct"
          ? <DirectTab isAuthenticated={isAuthenticated} />
          : <GroupsTab isAuthenticated={isAuthenticated} />}
      </div>
    </div>
  );
}
