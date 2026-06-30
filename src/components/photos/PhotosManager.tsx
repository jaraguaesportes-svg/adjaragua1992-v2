"use client";

import { useEffect, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Photo } from "@/types/photos";
import { derivePhotoSlug, type PhotoInput } from "@/lib/schemas/photos";
import { PhotoForm } from "./PhotoForm";

const TYPE_LABELS: Record<string, string> = {
  portrait: "Retrato",
  action: "Ação",
  team: "Equipe",
  trophy: "Troféu",
  venue: "Local",
  document: "Documento",
  other: "Outro",
};

function textToList(text?: string): string[] {
  if (!text) return [];
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildPayload(data: PhotoInput) {
  const {
    personIdsText, gameIdsText, competitionIdsText, editionIdsText,
    opponentIdsText, venueIdsText, cityIdsText, sourceIdsText,
    ...rest
  } = data;
  return {
    ...rest,
    slug: derivePhotoSlug(data.title),
    personIds: textToList(personIdsText),
    gameIds: textToList(gameIdsText),
    competitionIds: textToList(competitionIdsText),
    editionIds: textToList(editionIdsText),
    opponentIds: textToList(opponentIdsText),
    venueIds: textToList(venueIdsText),
    cityIds: textToList(cityIdsText),
    sourceIds: textToList(sourceIdsText),
  };
}

export function PhotosManager() {
  const [items, setItems] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCollection<Photo>("photos");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar fotos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleCreate(data: PhotoInput) {
    await createDocument("photos", buildPayload(data), data.title);
    setShowForm(false);
    await refresh();
  }

  async function handleUpdate(data: PhotoInput) {
    if (!editing) return;
    await upsertDocument("photos", editing.id, buildPayload(data), {
      entityName: data.title,
      before: editing,
    });
    setEditing(null);
    await refresh();
  }

  async function handleArchive(item: Photo) {
    if (!confirm(`Arquivar "${item.title}"?`)) return;
    await archiveDocument("photos", item.id, item.title);
    await refresh();
  }

  async function handleRestore(item: Photo) {
    await restoreDocument("photos", item.id, item.title);
    await refresh();
  }

  return (
    <section className="card">
      <div className="actions">
        <h2>Fotos</h2>
        <button className="btn" onClick={() => { setEditing(null); setShowForm((v) => !v); }}>
          {showForm ? "Fechar" : "Nova foto"}
        </button>
      </div>

      {showForm && !editing && (
        <PhotoForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {editing && (
        <PhotoForm initialValues={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
      )}

      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          {items.length > 0 && (
            <div className="photo-grid">
              {items.map((item) => (
                <div key={item.id} className="photo-card">
                  <a
                    href={`https://drive.google.com/file/d/${item.driveFileId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={`https://drive.google.com/thumbnail?id=${item.driveFileId}&sz=w300`}
                      alt={item.title}
                      className="photo-thumb"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </a>
                  <div className="photo-info">
                    <strong>{item.title}</strong>
                    <span>{TYPE_LABELS[item.photoType] ?? item.photoType}</span>
                    {item.captureDate && <span>{item.captureDate}</span>}
                  </div>
                  <div className="photo-actions">
                    <button className="btn-link" onClick={() => { setShowForm(false); setEditing(item); }}>
                      Editar
                    </button>
                    {item.status === "archived" ? (
                      <button className="btn-link" onClick={() => handleRestore(item)}>Restaurar</button>
                    ) : (
                      <button className="btn-link" onClick={() => handleArchive(item)}>Arquivar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {items.length === 0 && (
            <p style={{ color: "var(--tx3)", marginTop: 12 }}>Nenhuma foto cadastrada ainda.</p>
          )}
        </>
      )}
    </section>
  );
}
