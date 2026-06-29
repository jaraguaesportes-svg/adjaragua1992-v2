"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { City } from "@/types/cities";
import { deriveCitySlug, type CityInput } from "@/lib/schemas/cities";
import { CityForm } from "./CityForm";

function buildPayload(data: CityInput) {
  return {
    ...data,
    slug: deriveCitySlug(data.name),
  };
}

export function CitiesManager() {
  const [items, setItems] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<City | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollection<City>("cities");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar cidades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(data: CityInput) {
    await createDocument("cities", buildPayload(data), data.name);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: CityInput) {
    if (!editing) return;
    await upsertDocument("cities", editing.id, buildPayload(data), {
      entityName: data.name,
      before: editing,
    });
    setEditing(null);
    await refresh();
  }

  async function handleArchive(item: City) {
    if (!confirm(`Arquivar "${item.name}"?`)) return;
    await archiveDocument("cities", item.id, item.name);
    await refresh();
  }

  async function handleRestore(item: City) {
    await restoreDocument("cities", item.id, item.name);
    await refresh();
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Cidades</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Novo registro"}
        </button>
      </div>

      {showForm && !editing && (
        <CityForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <CityForm
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
              <th>UF</th>
              <th>Jogos</th>
              <th>Locais</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.stateCode ?? item.state}</td>
                <td>{item.statistics?.games ?? 0}</td>
                <td>{item.venueStatistics?.venues ?? 0}</td>
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
                <td colSpan={6}>Nenhuma cidade cadastrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
