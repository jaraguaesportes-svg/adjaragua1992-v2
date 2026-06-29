"use client";

import { useEffect, useMemo, useState } from "react";
import { createDocument, listCollection } from "@/lib/services/firestore";
import { deriveVenueSlug } from "@/lib/schemas/venues";
import type { Venue } from "@/types/venues";

let cachedVenues: Venue[] | null = null;

async function loadVenues(): Promise<Venue[]> {
  if (cachedVenues) return cachedVenues;
  cachedVenues = await listCollection<Venue>("venues");
  return cachedVenues;
}

function invalidateVenuesCache() {
  cachedVenues = null;
}

type VenuePickerProps = {
  value?: string;
  onChange: (venueId: string | undefined) => void;
};

export function VenuePicker({ value, onChange }: VenuePickerProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCityId, setNewCityId] = useState("");

  useEffect(() => {
    loadVenues().then(setVenues);
  }, []);

  const selected = venues.find((v) => v.id === value);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return venues.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 8);
  }, [venues, query]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const ref = await createDocument(
      "venues",
      {
        name: newName.trim(),
        cityId: newCityId.trim(),
        country: "Brasil",
        venueType: "gymnasium",
        active: true,
        slug: deriveVenueSlug(newName.trim()),
      },
      newName.trim()
    );
    invalidateVenuesCache();
    setVenues(await loadVenues());
    onChange(ref.id);
    setCreating(false);
    setOpen(false);
    setQuery("");
    setNewName("");
    setNewCityId("");
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
        placeholder="Buscar local pelo nome..."
      />
      {open && query.trim() && (
        <div className="person-picker-dropdown">
          {results.map((v) => (
            <button
              key={v.id}
              type="button"
              className="person-picker-option"
              onClick={() => {
                onChange(v.id);
                setOpen(false);
                setQuery("");
              }}
            >
              {v.name}
            </button>
          ))}
          {results.length === 0 && !creating && (
            <button type="button" className="person-picker-option" onClick={() => { setCreating(true); setNewName(query); }}>
              + Cadastrar local novo: &quot;{query}&quot;
            </button>
          )}
          {creating && (
            <div className="person-picker-create">
              <label>
                Nome
                <input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
              <label>
                Cidade (ID)
                <input value={newCityId} onChange={(e) => setNewCityId(e.target.value)} placeholder="ID da coleção cities" />
              </label>
              <p className="hint">Cadastro provisório — pode ser completado depois em Locais.</p>
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
