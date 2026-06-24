"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Edition } from "@/types/editions";
import { deriveEditionSlug, type EditionInput } from "@/lib/schemas/editions";
import { EditionForm } from "./EditionForm";

function buildPayload(data: EditionInput) {
  return {
    ...data,
    slug: deriveEditionSlug(data.competitionId, data.year),
    titleWon: data.finalPosition === 1,
    runnerUp: data.finalPosition === 2,
  };
}

export function EditionsManager() {
  const [items, setItems] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Edition | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollection<Edition>("editions");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar edições");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(data: EditionInput) {
    await createDocument("editions", buildPayload(data), data.name);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: EditionInput) {
    if (!editing) return;
    await upsertDocument("editions", editing.id, buildPayload(data), {
      entityName: data.name,
      before: editing,
    });
    setEditing(null);
    await refresh();
  }

  async function handleArchive(item: Edition) {
    if (!confirm(`Arquivar "${item.name}"?`)) return;
    await archiveDocument("editions", item.id, item.name);
    await refresh();
  }

  async function handleRestore(item: Edition) {
    await restoreDocument("editions", item.id, item.name);
    await refresh();
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Edições</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Novo registro"}
        </button>
      </div>

      {showForm && !editing && (
        <EditionForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <EditionForm
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
              <th>Ano</th>
              <th>Jogos</th>
              <th>V-E-D</th>
              <th>Título</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.year}</td>
                <td>{item.statistics?.games ?? 0}</td>
                <td>{item.statistics?.wins ?? 0}-{item.statistics?.draws ?? 0}-{item.statistics?.losses ?? 0}</td>
                <td>{item.titleWon ? "🏆" : item.runnerUp ? "🥈" : "—"}</td>
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
                <td colSpan={7}>Nenhuma edição cadastrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
