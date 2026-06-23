"use client";

import { useEffect, useMemo, useState } from "react";
import { createDocument, listCollection } from "@/lib/services/firestore";
import { derivePersonSlug } from "@/lib/schemas/people";
import type { Person, PersonRole } from "@/types/people";

let cachedPeople: Person[] | null = null;

async function loadPeople(): Promise<Person[]> {
  if (cachedPeople) return cachedPeople;
  cachedPeople = await listCollection<Person>("people");
  return cachedPeople;
}

export function invalidatePeopleCache() {
  cachedPeople = null;
}

function matches(person: Person, query: string) {
  const q = query.toLowerCase();
  return (
    person.nickname.toLowerCase().includes(q) ||
    (person.fullName?.toLowerCase().includes(q) ?? false) ||
    (person.cbfsRegistration?.toLowerCase().includes(q) ?? false)
  );
}

type PersonPickerProps = {
  value?: string;
  onChange: (personId: string | undefined) => void;
  placeholder?: string;
};

/**
 * Busca/seleção de pessoa existente, com criação rápida quando não há
 * correspondência — conforme Volume III cap.3.17 e cap.4 (Importação de Pessoas):
 * o sistema deve tentar identificar a pessoa, reutilizar se existir, e nunca
 * fundir homônimos automaticamente (a escolha é sempre manual).
 */
export function PersonPicker({ value, onChange, placeholder }: PersonPickerProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newGender, setNewGender] = useState<"male" | "female">("male");
  const [newRole, setNewRole] = useState<PersonRole>("player");

  useEffect(() => {
    loadPeople().then(setPeople);
  }, []);

  const selected = people.find((p) => p.id === value);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return people.filter((p) => matches(p, query)).slice(0, 8);
  }, [people, query]);

  async function handleCreate() {
    if (!newNickname.trim()) return;
    const ref = await createDocument(
      "people",
      {
        nickname: newNickname.trim(),
        gender: newGender,
        roles: [newRole],
        primaryRole: newRole,
        identificationStatus: "unknown",
        slug: derivePersonSlug(newNickname.trim()),
      },
      newNickname.trim()
    );
    invalidatePeopleCache();
    const fresh = await loadPeople();
    setPeople(fresh);
    onChange(ref.id);
    setCreating(false);
    setOpen(false);
    setQuery("");
    setNewNickname("");
  }

  if (selected) {
    return (
      <div className="person-picker-selected">
        <span>{selected.nickname}{selected.fullName ? ` (${selected.fullName})` : ""}</span>
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
        placeholder={placeholder ?? "Buscar pessoa pelo nome..."}
      />
      {open && query.trim() && (
        <div className="person-picker-dropdown">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="person-picker-option"
              onClick={() => {
                onChange(p.id);
                setOpen(false);
                setQuery("");
              }}
            >
              {p.nickname}
              {p.fullName ? ` — ${p.fullName}` : ""}
              {p.cbfsRegistration ? ` (CBFS ${p.cbfsRegistration})` : ""}
            </button>
          ))}
          {results.length === 0 && !creating && (
            <button type="button" className="person-picker-option" onClick={() => { setCreating(true); setNewNickname(query); }}>
              + Cadastrar pessoa nova: &quot;{query}&quot;
            </button>
          )}
          {creating && (
            <div className="person-picker-create">
              <label>
                Apelido
                <input value={newNickname} onChange={(e) => setNewNickname(e.target.value)} />
              </label>
              <label>
                Gênero
                <select value={newGender} onChange={(e) => setNewGender(e.target.value as "male" | "female")}>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </label>
              <label>
                Papel
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as PersonRole)}>
                  <option value="player">Atleta</option>
                  <option value="coach">Treinador</option>
                  <option value="referee">Árbitro</option>
                  <option value="director">Dirigente</option>
                  <option value="official">Anotador/Cronometrista</option>
                </select>
              </label>
              <p className="hint">Cadastro provisório — pode ser completado depois em Pessoas.</p>
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
