'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { formatCount, formatPct } from '@/lib/utils/format';
import { digitalPctColor } from '@/lib/utils/colors';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  office_id: number;
  office_name: string;
  division_name: string;
  total_cnt: number | null;
  digital_pct_cnt: number | null;
}

function divisionAnchorId(divisionName: string) {
  return `division-${divisionName.toLowerCase().replace(/\s+/g, '-')}`;
}

export function OfficeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json.offices ?? []);
      setOpen(true);
      setActiveIdx(-1);
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const selectResult = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    const anchorId = divisionAnchorId(result.division_name);
    const el = document.getElementById(anchorId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-[var(--accent)]', 'ring-offset-2');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--accent)]', 'ring-offset-2'), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && activeIdx >= 0 && results[activeIdx]) { selectResult(results[activeIdx]); }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  return (
    <div className="relative w-full max-w-sm print:hidden">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--fg-muted)]" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search offices…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full pl-8 pr-8 py-2 text-sm bg-white border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent placeholder:text-[var(--fg-muted)]"
          aria-label="Search offices"
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={open}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {loading && (
            <p className="text-xs text-[var(--fg-muted)] px-3 py-2">Searching…</p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-xs text-[var(--fg-muted)] px-3 py-2">No offices found.</p>
          )}
          {!loading && results.length > 0 && (
            <ul ref={listRef} role="listbox">
              {results.map((r, i) => {
                const color = digitalPctColor(r.digital_pct_cnt);
                return (
                  <li
                    key={r.office_id}
                    role="option"
                    aria-selected={i === activeIdx}
                    onMouseDown={() => selectResult(r)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm ${i === activeIdx ? 'bg-[var(--accent-soft)]' : 'hover:bg-gray-50'} ${i < results.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.office_name}</p>
                      <p className="text-xs text-[var(--fg-muted)] truncate">{r.division_name.replace(' Division', '')} · {r.total_cnt != null ? formatCount(r.total_cnt) : '–'} txns</p>
                    </div>
                    {r.digital_pct_cnt != null && (
                      <Badge className={`${color.bg} ${color.text} border-0 font-mono text-xs ml-2 shrink-0`}>
                        {formatPct(r.digital_pct_cnt)}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
