"use client";

import { useEffect, useMemo, useState } from "react";
import { createDocument, listCollection } from "@/lib/services/firestore";
import type { Competition } from "@/types/competitions";

let cachedCompetitions: Competition[] | null = null;

async function loadCompetitions(): Promise<Competition[]> {
  if (cachedCompetitions) return cachedCompetitions;
  cachedCompetitions = await listCollection<Competition>("competitions");
  return cachedCompetitions;
}

export function invalidateCompetitionsCache() {
  cachedCompetitions = null;
}

type CompetitionPickerProps = {
  value?: string;
  onChange: (id: string | undefined) => void;
};

export function CompetitionPicker({ value, onChange }: CompetitionPickerProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadCompetitions().then(setCompetitions);
  }, []);

  const selected = competitions.find((c) => c.id === value);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return competitions
      .filter((c) => c.name.toLowerCase().includes(q) || c.shortName?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [competitions, query]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const ref = await createDocument("competitions", {
      name: newName.trim(),
      shortName: newName.trim(),
      competitionType: "league",
      sport: "futsal",
      level: "national",
      country: "Brasil",
      active: true,
      slug: newName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    }, newName.trim());
    invalidateCompetitionsCache();
    setCompetitions(await loadCompetitions());
    onChange(ref.id);
    setCreating(false);
    setOpen(false);
    setQuery("");
    setNewName("");
  }

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
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setCreating(false); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar competição pelo nome..."
      />
      {open && query.trim() && (
        <div className="person-picker-dropdown">
          {results.map((c) => (
            <button key={c.id} type="button" className="person-picker-option"
              onClick={() => { onChange(c.id); setOpen(false); setQuery(""); }}>
              {c.name}
            </button>
          ))}
          {results.length === 0 && !creating && (
            <button type="button" className="person-picker-option"
              onClick={() => { setCreating(true); setNewName(query); }}>
              + Cadastrar competição nova: &quot;{query}&quot;
            </button>
          )}
          {creating && (
            <div className="person-picker-create">
              <label>
                Nome
                <input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
              <p className="hint">Cadastro provisório — complete depois em Competições.</p>
              <button type="button" className="btn-secondary" onClick={handleCreate}>
                Criar e selecionar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
