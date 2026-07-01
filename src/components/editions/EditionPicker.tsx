"use client";

import { useEffect, useMemo, useState } from "react";
import { listCollection } from "@/lib/services/firestore";
import type { Edition } from "@/types/editions";

let cachedEditions: Edition[] | null = null;

async function loadEditions(): Promise<Edition[]> {
  if (cachedEditions) return cachedEditions;
  cachedEditions = await listCollection<Edition>("editions");
  return cachedEditions;
}

type EditionPickerProps = {
  value?: string;
  onChange: (id: string | undefined) => void;
  competitionId?: string; // filter by competition if provided
};

export function EditionPicker({ value, onChange, competitionId }: EditionPickerProps) {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadEditions().then(setEditions);
  }, []);

  const selected = editions.find((e) => e.id === value);

  const results = useMemo(() => {
    const pool = competitionId ? editions.filter((e) => e.competitionId === competitionId) : editions;
    if (!query.trim()) return pool.slice(0, 8);
    const q = query.toLowerCase();
    return pool.filter((e) => e.name.toLowerCase().includes(q) || String(e.year).includes(q)).slice(0, 8);
  }, [editions, query, competitionId]);

  if (selected) {
    return (
      <div className="person-picker-selected">
        <span>{selected.name}</span>
        <button type="button" className="btn-link" onClick={() => onChange(undefined)}>
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div className="person-picker">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar edição pelo nome ou ano..."
      />
      {open && (
        <div className="person-picker-dropdown">
          {results.map((e) => (
            <button key={e.id} type="button" className="person-picker-option"
              onClick={() => { onChange(e.id); setOpen(false); setQuery(""); }}>
              {e.name} ({e.year})
            </button>
          ))}
          {results.length === 0 && (
            <div style={{ padding: "8px 12px" }}>
              <p className="hint">Nenhuma edição encontrada. Cadastre em Edições primeiro.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
