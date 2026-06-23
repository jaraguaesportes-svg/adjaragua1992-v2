"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Competition } from "@/types/competitions";
import { deriveCompetitionSlug, type CompetitionInput } from "@/lib/schemas/competitions";
import { CompetitionForm } from "./CompetitionForm";

function textToList(text?: string): string[] {
  if (!text) return [];
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildPayload(data: CompetitionInput) {
  const { historicalNamesText, ...rest } = data;
  return {
    ...rest,
    slug: deriveCompetitionSlug(data.name),
    historicalNames: textToList(historicalNamesText),
  };
}

export function CompetitionsManager() {
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollection<Competition>("competitions");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar competições");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(data: CompetitionInput) {
    await createDocument("competitions", buildPayload(data), data.name);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: CompetitionInput) {
    if (!editing) return;
    await upsertDocument("competitions", editing.id, buildPayload(data), {
      entityName: data.name,
      before: editing,
    });
    setEditing(null);
    await refresh();
  }

  async function handleArchive(item: Competition) {
    if (!confirm(`Arquivar "${item.name}"?`)) return;
    await archiveDocument("competitions", item.id, item.name);
    await refresh();
  }

  async function handleRestore(item: Competition) {
    await restoreDocument("competitions", item.id, item.name);
    await refresh();
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Competições</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Novo registro"}
        </button>
      </div>

      {showForm && !editing && (
        <CompetitionForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <CompetitionForm
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
              <th>Nome</th>
              <th>Sigla</th>
              <th>Tipo</th>
              <th>Nível</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.shortName}</td>
                <td>{item.competitionType}</td>
                <td>{item.level}</td>
                <td>{item.status}</td>
                <td>
                  <button className="btn-link" onClick={() => { setShowForm(false); setEditing(item); }}>
                    Editar
                  </button>
                  {item.status === "archived" ? (
                    <button className="btn-link" onClick={() => handleRestore(item)}>
                      Restaurar
                    </button>
                  ) : (
                    <button className="btn-link" onClick={() => handleArchive(item)}>
                      Arquivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhuma competição cadastrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
