"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Venue } from "@/types/venues";
import { deriveVenueSlug, type VenueInput } from "@/lib/schemas/venues";
import { VenueForm } from "./VenueForm";

function textToList(text?: string): string[] {
  if (!text) return [];
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildPayload(data: VenueInput) {
  const { historicalNamesText, ...rest } = data;
  return {
    ...rest,
    slug: deriveVenueSlug(data.name),
    historicalNames: textToList(historicalNamesText),
  };
}

export function VenuesManager() {
  const [items, setItems] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Venue | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollection<Venue>("venues");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar locais");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(data: VenueInput) {
    await createDocument("venues", buildPayload(data), data.name);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: VenueInput) {
    if (!editing) return;
    await upsertDocument("venues", editing.id, buildPayload(data), {
      entityName: data.name,
      before: editing,
    });
    setEditing(null);
    await refresh();
  }

  async function handleArchive(item: Venue) {
    if (!confirm(`Arquivar "${item.name}"?`)) return;
    await archiveDocument("venues", item.id, item.name);
    await refresh();
  }

  async function handleRestore(item: Venue) {
    await restoreDocument("venues", item.id, item.name);
    await refresh();
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Locais</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Novo registro"}
        </button>
      </div>

      {showForm && !editing && (
        <VenueForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <VenueForm
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
              <th>Jogos</th>
              <th>Público total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.cityId}</td>
                <td>{item.statistics?.games ?? 0}</td>
                <td>{item.attendanceStatistics?.totalAttendance ?? 0}</td>
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
                <td colSpan={6}>Nenhum local cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
