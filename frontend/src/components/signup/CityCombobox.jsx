import { useState, useEffect, useRef, useCallback } from "react";
import CITIES_BY_COUNTRY from "../../data/citiesData";

/**
 * CityCombobox — Searchable city field driven by selected country.
 * Supports free-text input for unlisted cities.
 * Props: country (string), value, onChange, placeholder, disabled
 */
export default function CityCombobox({ country, value, onChange, placeholder = "Type to search…", disabled = false }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const cities = country ? (CITIES_BY_COUNTRY[country] || []) : [];

  const filtered = query.trim().length === 0
    ? cities.slice(0, 60)           // show first 60 when no query
    : cities.filter((c) =>
        c.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 60);

  /* Sync query if parent resets value */
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  /* Reset when country changes */
  useEffect(() => {
    setQuery("");
    onChange?.("");
    setOpen(false);
    setHighlighted(0);
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Scroll highlighted item into view */
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted];
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange?.(val);          // propagate free-text immediately
    setOpen(true);
    setHighlighted(0);
  };

  const handleSelect = useCallback((city) => {
    setQuery(city);
    onChange?.(city);
    setOpen(false);
    setHighlighted(0);
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { setOpen(true); return; }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) handleSelect(filtered[highlighted]);
      else setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const hasCities = cities.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => hasCities && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            !country
              ? "Select a country first"
              : hasCities
              ? `Search ${cities.length} cities…`
              : placeholder
          }
          disabled={disabled || !country}
          autoComplete="off"
          className="input-dark pr-9 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {/* Chevron / clear icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); onChange?.(""); inputRef.current?.focus(); setOpen(true); }}
              className="text-zinc-600 hover:text-zinc-300 transition text-xs"
              aria-label="Clear"
            >
              ✕
            </button>
          )}
          <span className={`text-zinc-600 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            ▾
          </span>
        </div>
      </div>

      {/* Dropdown */}
      {open && hasCities && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden">
          {/* Search hint */}
          {query.trim() === "" && (
            <div className="px-3 py-1.5 flex items-center gap-2 border-b border-zinc-800">
              <span className="text-[10px] text-zinc-600">
                Showing {Math.min(60, cities.length)} of {cities.length} cities · Type to filter
              </span>
            </div>
          )}

          <ul
            ref={listRef}
            role="listbox"
            className="max-h-52 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-zinc-500 italic text-center">
                No match — your entry "{query}" will be used
              </li>
            ) : (
              filtered.map((city, idx) => {
                const isHigh = idx === highlighted;
                const lc = city.toLowerCase();
                const q = query.toLowerCase().trim();
                const matchIdx = q ? lc.indexOf(q) : -1;

                return (
                  <li
                    key={`${city}-${idx}`}
                    role="option"
                    aria-selected={isHigh}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(city); }}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={`flex cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors ${isHigh ? "bg-amber-500/15 text-amber-300" : "text-zinc-300 hover:bg-zinc-800"}`}
                  >
                    <span className="text-[10px] text-zinc-700">📍</span>
                    {matchIdx >= 0 && q ? (
                      <>
                        {city.slice(0, matchIdx)}
                        <strong className="text-amber-400 font-bold">
                          {city.slice(matchIdx, matchIdx + q.length)}
                        </strong>
                        {city.slice(matchIdx + q.length)}
                      </>
                    ) : (
                      city
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Free text hint */}
          {query.trim() && !filtered.find((c) => c.toLowerCase() === query.toLowerCase()) && (
            <div
              className="border-t border-zinc-800 px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-zinc-800 transition"
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); }}
            >
              <span className="text-xs text-zinc-500">Use</span>
              <span className="text-xs font-semibold text-amber-400">"{query}"</span>
              <span className="text-xs text-zinc-500">as entered</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
