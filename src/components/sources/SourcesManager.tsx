"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Source } from "@/types/sources";
import { deriveSourceSlug, type SourceInput } from "@/lib/schemas/sources";
import { SourceForm } from "./SourceForm";

const TYPE_LABELS: Record<string, string> = {
  match_report: "Súmula",
  regulation: "Regulamento",
  news: "Reportagem",
  official_document: "Doc. oficial",
  book: "Livro",
  magazine: "Revista",
  website: "Site",
  interview: "Entrevista",
  other: "Outro",
};

function textToList(text?: string): string[] {
  if (!text) return [];
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildPayload(data: SourceInput) {
  const {
    relatedGameIdsText, relatedPersonIdsText, relatedCompetitionIdsText,
    relatedEditionIdsText, relatedOpponentIdsText, relatedVenueIdsText, relatedCityIdsText,
    ...rest
  } = data;
  return {
    ...rest,
    slug: deriveSourceSlug(data.title),
    relatedGameIds: textToList(relatedGameIdsText),
    relatedPersonIds: textToList(relatedPersonIdsText),
    relatedCompetitionIds: textToList(relatedCompetitionIdsText),
    relatedEditionIds: textToList(relatedEditionIdsText),
    relatedOpponentIds: textToList(relatedOpponentIdsText),
    relatedVenueIds: textToList(relatedVenueIdsText),
    relatedCityIds: textToList(relatedCityIdsText),
  };
}

export function SourcesManager() {
  const [items, setItems] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Source | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollection<Source>("sources");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar fontes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(data: SourceInput) {
    await createDocument("sources", buildPayload(data), data.title);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: SourceInput) {
    if (!editing) return;
    await upsertDocument("sources", editing.id, buildPayload(data), {
      entityName: data.title,
      before: editing,
    });
    setEditing(null);
    await refresh();
  }

  async function handleArchive(item: Source) {
    if (!confirm(`Arquivar "${item.title}"?`)) return;
    await archiveDocument("sources", item.id, item.title);
    await refresh();
  }

  async function handleRestore(item: Source) {
    await restoreDocument("sources", item.id, item.title);
    await refresh();
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Fontes</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Novo registro"}
        </button>
      </div>

      {showForm && !editing && (
        <SourceForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editing && (
        <SourceForm
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
              <th>Título</th>
              <th>Tipo</th>
              <th>Autoridade</th>
              <th>Arquivo</th>
              <th>Extração</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{TYPE_LABELS[item.sourceType] ?? item.sourceType}</td>
                <td>{item.sourceAuthority}</td>
                <td>{item.fileType}</td>
                <td>{item.extractionStatus}</td>
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
                <td colSpan={7}>Nenhuma fonte cadastrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
