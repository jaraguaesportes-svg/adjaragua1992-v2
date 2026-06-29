"use client";

import { useEffect, useMemo, useState } from "react";
import { createDocument, listCollection } from "@/lib/services/firestore";
import { deriveCitySlug } from "@/lib/schemas/cities";
import type { City } from "@/types/cities";

let cachedCities: City[] | null = null;

async function loadCities(): Promise<City[]> {
  if (cachedCities) return cachedCities;
  cachedCities = await listCollection<City>("cities");
  return cachedCities;
}

function invalidateCitiesCache() {
  cachedCities = null;
}

type CityPickerProps = {
  value?: string;
  onChange: (cityId: string | undefined) => void;
};

export function CityPicker({ value, onChange }: CityPickerProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newState, setNewState] = useState("");

  useEffect(() => {
    loadCities().then(setCities);
  }, []);

  const selected = cities.find((c) => c.id === value);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [cities, query]);

  async function handleCreate() {
    if (!newName.trim() || !newState.trim()) return;
    const ref = await createDocument(
      "cities",
      {
        name: newName.trim(),
        state: newState.trim(),
        country: "Brasil",
        countryCode: "BR",
        slug: deriveCitySlug(newName.trim()),
      },
      newName.trim()
    );
    invalidateCitiesCache();
    setCities(await loadCities());
    onChange(ref.id);
    setCreating(false);
    setOpen(false);
    setQuery("");
    setNewName("");
    setNewState("");
  }

  if (selected) {
    return (
      <div className="person-picker-selected">
        <span>{selected.name}{selected.stateCode ? ` (${selected.stateCode})` : ""}</span>
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
        placeholder="Buscar cidade pelo nome..."
      />
      {open && query.trim() && (
        <div className="person-picker-dropdown">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="person-picker-option"
              onClick={() => {
                onChange(c.id);
                setOpen(false);
                setQuery("");
              }}
            >
              {c.name}{c.stateCode ? ` (${c.stateCode})` : ""}
            </button>
          ))}
          {results.length === 0 && !creating && (
            <button type="button" className="person-picker-option" onClick={() => { setCreating(true); setNewName(query); }}>
              + Cadastrar cidade nova: &quot;{query}&quot;
            </button>
          )}
          {creating && (
            <div className="person-picker-create">
              <label>
                Nome
                <input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
              <label>
                Estado
                <input value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="Santa Catarina" />
              </label>
              <p className="hint">Cadastro provisório — pode ser completado depois em Cidades.</p>
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
