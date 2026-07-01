"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Photo } from "@/types/photos";
import { derivePhotoSlug, type PhotoInput } from "@/lib/schemas/photos";
import { PhotoForm } from "./PhotoForm";

const TYPE_LABELS: Record<string,string> = { portrait:"Retrato", action:"Ação", team:"Equipe", trophy:"Troféu", venue:"Local", document:"Documento", other:"Outro" };

function textToList(t?: string) { return t?.split(",").map(s=>s.trim()).filter(Boolean)??[]; }
function idsToText(ids?: string[]) { return ids?.join(", ")??"";}

function buildPayload(data: PhotoInput) {
  const { personIdsText, gameIdsText, competitionIdsText, editionIdsText, opponentIdsText, venueIdsText, cityIdsText, sourceIdsText, ...rest } = data;
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
  const [items,   setItems]   = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<"list"|"detail"|"form">("list");
  const [selected, setSelected] = useState<Photo | null>(null);
  const [editing,  setEditing]  = useState<Photo | null>(null);
  const [query,  setQuery]    = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");

  async function refresh() {
    setLoading(true);
    setItems(await listCollection<Photo>("photos"));
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => items
    .filter(p => p.status === "active")
    .filter(p => typeFilter === "Todos" || p.photoType === typeFilter)
    .filter(p => !query || p.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => (b.captureDate??"").localeCompare(a.captureDate??""))
  , [items, typeFilter, query]);

  function openDetail(p: Photo) { setSelected(p); setView("detail"); }
  function openNew()  { setEditing(null); setView("form"); }
  function openEdit(p: Photo) { setEditing(p); setView("form"); }
  function back() { setView("list"); setSelected(null); setEditing(null); }

  async function handleCreate(data: PhotoInput) { await createDocument("photos", buildPayload(data), data.title); await refresh(); setView("list"); }
  async function handleUpdate(data: PhotoInput) {
    if (!editing) return;
    await upsertDocument("photos", editing.id, buildPayload(data), { entityName: data.title, before: editing });
    await refresh(); setView("list");
  }
  async function handleArchive(p: Photo) {
    if (!confirm(`Arquivar "${p.title}"?`)) return;
    await archiveDocument("photos", p.id, p.title); await refresh(); setView("list");
  }
  async function handleRestore(p: Photo) { await restoreDocument("photos", p.id, p.title); await refresh(); }

  if (view === "detail" && selected) {
    return (
      <div style={{ maxWidth:960 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <div className="ficha-hdr">
          <h2>{selected.title}</h2>
          <div className="ficha-actions">
            <button className="btn-link" style={{ color:"#fff" }} onClick={()=>openEdit(selected)}><i className="ti ti-pencil" /> Editar</button>
            <a href={`https://drive.google.com/file/d/${selected.driveFileId}/view`} target="_blank" rel="noopener noreferrer" className="btn-link" style={{ color:"#fff" }}><i className="ti ti-external-link" /> Drive</a>
            {selected.status==="archived"
              ? <button className="btn-link" style={{ color:"#fff" }} onClick={()=>handleRestore(selected)}><i className="ti ti-refresh" /> Restaurar</button>
              : <button className="btn-link" style={{ color:"#fca5a5" }} onClick={()=>handleArchive(selected)}><i className="ti ti-archive" /> Arquivar</button>}
          </div>
        </div>
        <div className="ficha-body">
          <div className="ficha-col">
            <img
              src={`https://drive.google.com/thumbnail?id=${selected.driveFileId}&sz=w600`}
              alt={selected.title}
              style={{ width:"100%",borderRadius:8,marginBottom:12 }}
              onError={(e)=>{ (e.target as HTMLImageElement).style.display="none"; }}
            />
          </div>
          <div className="ficha-col">
            <div className="fsec">Dados</div>
            <div className="frow"><span className="frow-lbl">Tipo</span><span>{TYPE_LABELS[selected.photoType]??selected.photoType}</span></div>
            <div className="frow"><span className="frow-lbl">Identificação</span><span>{selected.identificationStatus}</span></div>
            {selected.captureDate && <div className="frow"><span className="frow-lbl">Data</span><span>{selected.captureDate}</span></div>}
            {selected.photographer && <div className="frow"><span className="frow-lbl">Fotógrafo</span><span>{selected.photographer}</span></div>}
            {selected.licenseType && <div className="frow"><span className="frow-lbl">Licença</span><span>{selected.licenseType}</span></div>}
            <div className="frow"><span className="frow-lbl">Acesso</span><span>{selected.accessLevel}</span></div>
            {selected.unidentifiedPeople != null && <div className="frow"><span className="frow-lbl">Não identificados</span><span>{selected.unidentifiedPeople}</span></div>}
            {selected.description && <><div className="fsec">Descrição</div><p style={{ fontSize:13,color:"var(--tx2)",lineHeight:1.5 }}>{selected.description}</p></>}
          </div>
        </div>
      </div>
    );
  }

  if (view === "form") {
    return (
      <div style={{ maxWidth:900 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <PhotoForm
          initialValues={editing ? { ...editing, personIdsText: idsToText(editing.personIds), gameIdsText: idsToText(editing.gameIds), competitionIdsText: idsToText(editing.competitionIds), editionIdsText: idsToText(editing.editionIds), opponentIdsText: idsToText(editing.opponentIds), venueIdsText: idsToText(editing.venueIds), cityIdsText: idsToText(editing.cityIds), sourceIdsText: idsToText(editing.sourceIds) } as unknown as Photo : undefined}
          onSubmit={editing?handleUpdate:handleCreate}
          onCancel={back}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-title"><i className="ti ti-photo" />Fotos <span className="cbadge">{filtered.length}</span></div>
        <div className="page-actions">
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ width:"auto" }}>
            {["Todos",...Object.keys(TYPE_LABELS)].map(t=><option key={t} value={t}>{t==="Todos"?"Todos os tipos":TYPE_LABELS[t]}</option>)}
          </select>
          <button className="btn" onClick={openNew}><i className="ti ti-plus" /> Nova foto</button>
        </div>
      </div>
      <div className="filters"><input placeholder="Buscar pelo título..." value={query} onChange={e=>setQuery(e.target.value)} style={{ maxWidth:280 }} /></div>
      {loading && <p style={{ color:"var(--tx3)",padding:24 }}>Carregando...</p>}
      {!loading && filtered.length===0 && <div className="empty-s"><i className="ti ti-photo" /><p>Nenhuma foto cadastrada ainda</p></div>}
      {!loading && filtered.length>0 && (
        <div className="photo-grid">
          {filtered.map(p=>(
            <div key={p.id} className="photo-card" onClick={()=>openDetail(p)}>
              <img
                src={`https://drive.google.com/thumbnail?id=${p.driveFileId}&sz=w300`}
                alt={p.title}
                className="photo-thumb"
                onError={(e)=>{ (e.target as HTMLImageElement).style.display="none"; }}
              />
              <div className="photo-info">
                <strong>{p.title}</strong>
                <span>{TYPE_LABELS[p.photoType]??p.photoType}</span>
                {p.captureDate && <span>{p.captureDate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
