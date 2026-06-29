"use client";

import { useEffect, useMemo, useState } from "react";
import { createDocument, listCollection } from "@/lib/services/firestore";
import { deriveOpponentSlug } from "@/lib/schemas/opponents";
import type { Opponent } from "@/types/opponents";

let cachedOpponents: Opponent[] | null = null;

async function loadOpponents(): Promise<Opponent[]> {
  if (cachedOpponents) return cachedOpponents;
  cachedOpponents = await listCollection<Opponent>("opponents");
  return cachedOpponents;
}

function invalidateOpponentsCache() {
  cachedOpponents = null;
}

type OpponentPickerProps = {
  value?: string;
  onChange: (opponentId: string | undefined) => void;
};

export function OpponentPicker({ value, onChange }: OpponentPickerProps) {
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadOpponents().then(setOpponents);
  }, []);

  const selected = opponents.find((o) => o.id === value);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return opponents
      .filter((o) => o.name.toLowerCase().includes(q) || o.shortName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [opponents, query]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const ref = await createDocument(
      "opponents",
      {
        name: newName.trim(),
        shortName: newName.trim(),
        sport: "futsal",
        country: "Brasil",
        active: true,
        identificationStatus: "unknown",
        slug: deriveOpponentSlug(newName.trim()),
      },
      newName.trim()
    );
    invalidateOpponentsCache();
    setOpponents(await loadOpponents());
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
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setCreating(false);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar adversário pelo nome..."
      />
      {open && query.trim() && (
        <div className="person-picker-dropdown">
          {results.map((o) => (
            <button
              key={o.id}
              type="button"
              className="person-picker-option"
              onClick={() => {
                onChange(o.id);
                setOpen(false);
                setQuery("");
              }}
            >
              {o.name}
            </button>
          ))}
          {results.length === 0 && !creating && (
            <button type="button" className="person-picker-option" onClick={() => { setCreating(true); setNewName(query); }}>
              + Cadastrar adversário novo: &quot;{query}&quot;
            </button>
          )}
          {creating && (
            <div className="person-picker-create">
              <label>
                Nome
                <input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
              <p className="hint">Cadastro provisório — pode ser completado depois em Adversários.</p>
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
