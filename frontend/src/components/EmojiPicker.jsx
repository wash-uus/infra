/**
 * EmojiPicker — WhatsApp-style emoji selector with categories + search.
 *
 * Props:
 *   onSelect   (emoji: string) => void   — called when user taps an emoji
 *   onClose    () => void                — called when picker should close
 *   className  string                    — extra classes on the wrapper
 */
import { useEffect, useMemo, useRef, useState } from "react";

// ─── Emoji data ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "recent",
    label: "Recently Used",
    icon: "🕐",
    emojis: [], // populated from localStorage
  },
  {
    id: "smileys",
    label: "Smileys & Emotion",
    icon: "😊",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇",
      "🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝",
      "🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄",
      "😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧",
      "🥵","🥶","🥴","😵","🤯","🤠","🥸","😎","🤓","🧐","😕","😟","🙁",
      "😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱",
      "😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿",
      "💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹",
      "😻","😼","😽","🙀","😿","😾","🙈","🙉","🙊",
      "💋","💌","💘","💝","💖","💗","💓","💞","💕","💟","❣️","💔","❤️",
      "🧡","💛","💚","💙","💜","🖤","🤍","🤎","💯","💢","💥","💫","💦",
      "💨","🕳️","💬","🗨️","🗯️","💭","💤","‼️","⁉️","❓","❔","❕","❗",
    ],
  },
  {
    id: "people",
    label: "People & Body",
    icon: "👋",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙",
      "👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏",
      "🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","🦻",
      "👃","👀","👁️","🫀","🫁","🧠","🦷","🦴","👅","👄",
      "👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵",
      "🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷",
      "👮","🕵️","💂","🥷","👷","🎅","🤶","🦸","🦹","🧙","🧝","🧛",
      "🧟","🧞","🧜","🧚","👼","🤰","🤱","🙇","💆","💇","🚶","🧍",
      "🧎","🏃","💃","🕺","🕴️","👯","🧖","🧗","🏇","⛷️","🏂","🪂",
      "🏋️","🤼","🤸","⛹️","🤺","🤾","🏌️","🏄","🚣","🧘","🛀","🛌",
      "👫","👬","👭","💏","💑","👪",
      "👤","👥","🫂",
    ],
  },
  {
    id: "animals",
    label: "Animals & Nature",
    icon: "🐶",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁",
      "🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇",
      "🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪲",
      "🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐",
      "🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆",
      "🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬",
      "🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩",
      "🦮","🐕‍🦺","🐈","🐈‍⬛","🪶","🐓","🦃","🦤","🦚","🦜","🦢","🦩",
      "🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔",
      "🌵","🎄","🌲","🌳","🌴","🪵","🌱","🌿","☘️","🍀","🎍","🪴","🎋",
      "🍃","🍂","🍁","🍄","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼",
      "🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒",
      "🌓","🌔","🌙","🌟","⭐","🌠","🌌","☀️","⛅","🌤️","🌈","☁️",
      "🌧️","⛈️","🌩️","🌨️","❄️","🌬️","💨","💧","💦","🌊","🌀","🌫️",
      "🔥","🌋","⛰️","🏔️","🗻",
    ],
  },
  {
    id: "food",
    label: "Food & Drink",
    icon: "🍔",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒",
      "🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️",
      "🫑","🧄","🧅","🥔","🍠","🫚","🥐","🥯","🍞","🥖","🥨","🧀",
      "🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟",
      "🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍝",
      "🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥",
      "🥮","🍢","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪",
      "🌰","🥜","🍯","🧃","🥤","🧋","🍵","☕","🍺","🍻","🥂","🍷",
      "🥃","🍸","🍹","🧉","🍾","🧊","🥄","🍴","🍽️","🥣","🥗","🥘",
    ],
  },
  {
    id: "travel",
    label: "Travel & Places",
    icon: "✈️",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚",
      "🚛","🚜","🏍️","🛵","🛺","🚲","🛴","🛹","🛼","🚏","🛣️","🛤️",
      "⛽","🚧","⚓","🛟","⛵","🚤","🛥️","🛳️","⛴️","🚢","✈️","🛩️",
      "🛫","🛬","🪂","💺","🚁","🚟","🚠","🚡","🛰️","🚀","🛸","🎑",
      "🌁","🗼","🏰","🏯","🏟️","🎠","🎡","🎢","⛲","⛺","🌃","🌉",
      "🌄","🌅","🌆","🌇","🌉","🌌","🌠","🎆","🎇","🗺️","🧭",
      "🏔️","⛰️","🌋","🗻","🏕️","🏖️","🏜️","🏝️","🏞️","🏗️","🏘️","🏚️",
      "🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬",
      "🏭","🏯","🏰","💒","🗽","⛪","🕌","🛕","🕍","⛩️","🕋",
    ],
  },
  {
    id: "activities",
    label: "Activities",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓",
      "🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿",
      "🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂",
      "🏋️","🤼","🤸","⛹️","🤺","🤾","🏇","🧘","🏄","🧗","🚵","🚴",
      "🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎫","🎟️","🎪",
      "🤹","🎭","🎨","🖼️","🎰","🎲","🎯","🎳","🎮","🕹️","🎸","🎹",
      "🎷","🎺","🎻","🪕","🥁","🪘","🎤","🎧","📻","🎼","🎵","🎶",
      "🎙️","🎚️","🎛️","📺","📷","📸","📹","🎥","📽️","🎞️",
      "🎠","🎡","🎢","🎪","🎭","🎬",
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: "💡",
    emojis: [
      "⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","🖲️","💽","💾","💿","📀",
      "🎥","📷","📸","📹","📼","☎️","📞","📟","📠","📺","📻","🧭",
      "⏰","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯️","🪔","🧯","💊",
      "💉","🩸","🩺","🩹","🩻","🔬","🔭","🩼","🩽","⚗️","🌡️","🧲",
      "🪛","🔧","🪚","🔨","⚒️","🛠️","⛏️","🔩","🪤","🪜","🧱","🔗",
      "⛓️","🧲","🔫","💣","🪃","🏹","🛡️","🪞","🪟","🚪","🪑","🛋️",
      "🛏️","🛁","🪴","🚿","🧴","🪥","🧹","🧺","🧻","🧼","🪣","🧽",
      "🪒","🪮","💈","🛁","🚰","🪠","🪤","🧲","💈","🔑","🗝️","🔐",
      "🔒","🔓","🔏","📝","✏️","🖊️","🖋️","📌","📍","📎","🖇️","📐",
      "📏","🔖","🗒️","📔","📒","📕","📗","📘","📙","📚","📖","🔖",
      "🏷️","💰","🪙","💴","💵","💶","💷","💸","💳","🧾","📊","📈",
      "📉","📋","📌","📍","📁","📂","🗂️","🗃️","🗄️","🗑️","🔐","💼",
      "👝","👛","👜","🎒","🧳","📦","📫","📪","📬","📭","📮","📯","📃",
      "📜","📄","📑","🗞️","📰","📓","📔","📒","📕","📗","📘","📙",
      "📚","📖","🔖","✉️","📧","📨","📩","📤","📥","📦","📫","📪",
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "🔣",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕",
      "💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","✡️",
      "🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍",
      "♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴",
      "📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️",
      "🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕",
      "🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞",
      "📵","🔕","🔇","📺","📻","🔈","🔉","🔊","📢","📣","🔔","🔕",
      "🎵","🎶","🎼","🎤","⬆️","↗️","➡️","↘️","⬇️","↙️","⬅️","↖️",
      "↕️","↔️","↩️","↪️","⤴️","⤵️","🔃","🔄","🔙","🔚","🔛","🔜",
      "🔝","🔱","⚜️","〽️","✳️","✴️","❇️","💠","🔰","♻️","✅","❎",
      "🔲","🔳","▪️","▫️","◾","◽","◼️","◻️","🟥","🟧","🟨","🟩",
      "🟦","🟪","⬛","⬜","🟫","🔶","🔷","🔸","🔹","🔺","🔻","💠",
      "🔘","🔲","🔳","▪️","▫️","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣",
      "8️⃣","9️⃣","🔟","🔠","🔡","🔢","🔣","🔤","🅰️","🆎","🆑","🆘",
      "#️⃣","*️⃣","ℹ️","🔁","🔂","▶️","⏩","⏭️","⏯️","◀️","⏪","⏮️",
      "🔼","⏫","🔽","⏬","⏸️","⏹️","⏺️","🎦","📶","📳","📴","♀️","♂️",
      "✖️","➕","➖","➗","♾️","‼️","⁉️","❓","❔","❗","❕","〰️","➰","➿",
    ],
  },
  {
    id: "flags",
    label: "Flags",
    icon: "🏁",
    emojis: [
      "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️",
      "🇦🇫","🇦🇱","🇩🇿","🇦🇴","🇦🇷","🇦🇺","🇦🇹","🇧🇩",
      "🇧🇪","🇧🇴","🇧🇷","🇧🇬","🇨🇦","🇨🇱","🇨🇳","🇨🇴","🇨🇩",
      "🇨🇬","🇨🇷","🇨🇮","🇨🇺","🇩🇰","🇩🇴","🇪🇨","🇪🇬",
      "🇿🇦","🇿🇲","🇿🇼","🇸🇳","🇸🇱","🇸🇴","🇸🇩","🇹🇿",
      "🇺🇬","🇳🇬","🇬🇭","🇰🇪","🇪🇹","🇩🇪","🇫🇷","🇬🇧","🇺🇸",
      "🇷🇺","🇮🇳","🇯🇵","🇰🇷","🇮🇹","🇪🇸","🇵🇹","🇳🇱","🇧🇪",
      "🇸🇪","🇳🇴","🇫🇮","🇨🇭","🇦🇹","🇵🇱","🇨🇿","🇭🇺",
      "🇷🇴","🇬🇷","🇹🇷","🇸🇦","🇦🇪","🇮🇱","🇮🇷","🇮🇶",
      "🇵🇰","🇦🇫","🇧🇩","🇱🇰","🇲🇲","🇹🇭","🇻🇳","🇵🇭",
      "🇮🇩","🇲🇾","🇸🇬","🇳🇿","🇲🇽","🇸🇻","🇬🇹","🇭🇳",
    ],
  },
];

const RECENT_KEY = "sra_recent_emojis";
const MAX_RECENT = 32;

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(emoji) {
  try {
    const prev = getRecent().filter((e) => e !== emoji);
    const next = [emoji, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* silent */ }
}

export default function EmojiPicker({ onSelect, onClose, className = "" }) {
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);

  // Populate recent on mount
  const categories = useMemo(() => {
    const recent = getRecent();
    return CATEGORIES.map((c) =>
      c.id === "recent" ? { ...c, emojis: recent } : c
    ).filter((c) => c.id !== "recent" || c.emojis.length > 0);
  }, []);

  // Auto-focus search input
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSelect = (emoji) => {
    saveRecent(emoji);
    onSelect(emoji);
  };

  // Search filter
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const all = CATEGORIES.flatMap((c) => c.emojis);
    // Simple: show all emojis (emoji text search isn't possible without metadata)
    // So we just show all when searching until user picks
    return all;
  }, [search]);

  const displayCategory = categories.find((c) => c.id === activeCategory) || categories[0];
  const displayEmojis = searchResults ?? displayCategory?.emojis ?? [];

  return (
    <div
      ref={wrapperRef}
      className={`absolute bottom-full mb-2 left-0 z-50 w-[320px] sm:w-[360px]
                  rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl
                  flex flex-col overflow-hidden ${className}`}
      style={{ maxHeight: "360px" }}
    >
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2">
          <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji…"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="text-zinc-500 hover:text-zinc-300 transition text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 border-b border-zinc-800 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              title={cat.label}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-lg p-1.5 text-base transition-all
                          ${activeCategory === cat.id
                            ? "bg-amber-500/20 ring-1 ring-amber-500/40"
                            : "hover:bg-zinc-800"}`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Category label */}
      {!search && (
        <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          {displayCategory?.label}
        </p>
      )}
      {search && (
        <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          All Emojis
        </p>
      )}

      {/* Emoji grid */}
      <div className="overflow-y-auto flex-1 px-2 pb-2">
        {displayEmojis.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-sm">
            No emojis yet
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {displayEmojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                onClick={() => handleSelect(emoji)}
                title={emoji}
                className="flex items-center justify-center rounded-lg p-1.5 text-xl
                           transition hover:bg-zinc-700 active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
