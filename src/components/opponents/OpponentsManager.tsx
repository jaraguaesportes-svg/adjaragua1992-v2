"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Opponent } from "@/types/opponents";
import { deriveOpponentSlug, type OpponentInput } from "@/lib/schemas/opponents";
import { OpponentForm } from "./OpponentForm";

function textToList(text?: string): string[] {
  if (!text) return [];
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildPayload(data: OpponentInput) {
  const { historicalNamesText, colorsText, ...rest } = data;
  return {
    ...rest,
    slug: deriveOpponentSlug(data.name),
    historicalNames: textToList(historicalNamesText),
    colors: textToList(colorsText),
  };
}

export function OpponentsManager() {
  const [items, setItems] = useState<Opponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Opponent | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollection<Opponent>("opponents");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar adversários");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(data: OpponentInput) {
    await createDocument("opponents", buildPayload(data), data.name);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: OpponentInput) {
    if (!editing) return;
    await upsertDocument("opponents", editing.id, buildPayload(data), {
      entityName: data.name,
      before: editing,
    });
    setEditing(null);
    await refresh();
  }

  async function handleArchive(item: Opponent) {
    if (!confirm(`Arquivar "${item.name}"?`)) return;
    await archiveDocument("opponents", item.id, item.name);
    await refresh();
  }

  async function handleRestore(item: Opponent) {
    await restoreDocument("opponents", item.id, item.name);
    await refresh();
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Adversários</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Novo registro"}
        </button>
      </div>

      {showForm && !editing && (
        <OpponentForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <OpponentForm
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
              <th>Cidade</th>
              <th>Confrontos</th>
              <th>V-E-D (Jaraguá)</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.cityId ?? "—"}</td>
                <td>{item.confrontationStatistics?.matches ?? 0}</td>
                <td>
                  {item.confrontationStatistics?.jaraguaWins ?? 0}-
                  {item.confrontationStatistics?.draws ?? 0}-
                  {item.confrontationStatistics?.opponentWins ?? 0}
                </td>
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
                <td colSpan={6}>Nenhum adversário cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
