"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Person } from "@/types/people";
import { derivePersonSlug, type PersonInput } from "@/lib/schemas/people";
import { PersonForm } from "./PersonForm";

export function PeopleManager() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollection<Person>("people");
      setPeople(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pessoas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(data: PersonInput) {
    await createDocument("people", { ...data, slug: derivePersonSlug(data.nickname, data.fullName) }, data.nickname);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: PersonInput) {
    if (!editing) return;
    await upsertDocument(
      "people",
      editing.id,
      { ...data, slug: derivePersonSlug(data.nickname, data.fullName) },
      { entityName: data.nickname, before: editing }
    );
    setEditing(null);
    await refresh();
  }

  async function handleArchive(person: Person) {
    if (!confirm(`Arquivar "${person.nickname}"?`)) return;
    await archiveDocument("people", person.id, person.nickname);
    await refresh();
  }

  async function handleRestore(person: Person) {
    await restoreDocument("people", person.id, person.nickname);
    await refresh();
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Pessoas</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Novo registro"}
        </button>
      </div>

      {showForm && !editing && (
        <PersonForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <PersonForm
          initialValues={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Apelido</th>
              <th>Nome completo</th>
              <th>Papel principal</th>
              <th>Status</th>
              <th>Completude</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>{person.nickname}</td>
                <td>{person.fullName ?? "—"}</td>
                <td>{person.primaryRole}</td>
                <td>{person.status}</td>
                <td>{person.completeness ?? 0}%</td>
                <td>
                  <button className="btn-link" onClick={() => { setShowForm(false); setEditing(person); }}>
                    Editar
                  </button>
                  {person.status === "archived" ? (
                    <button className="btn-link" onClick={() => handleRestore(person)}>
                      Restaurar
                    </button>
                  ) : (
                    <button className="btn-link" onClick={() => handleArchive(person)}>
                      Arquivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {people.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhuma pessoa cadastrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
