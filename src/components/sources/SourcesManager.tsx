"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Source } from "@/types/sources";
import { deriveSourceSlug, type SourceInput } from "@/lib/schemas/sources";
import { SourceForm } from "./SourceForm";

const TYPE_LABELS: Record<string,string> = { match_report:"Súmula", regulation:"Regulamento", news:"Reportagem", official_document:"Doc. oficial", book:"Livro", magazine:"Revista", website:"Site", interview:"Entrevista", other:"Outro" };
const AUTHORITY_LABELS: Record<string,string> = { official:"Oficial", primary:"Primária", secondary:"Secundária", oral:"Oral" };
const EXTRACTION_LABELS: Record<string,string> = { not_processed:"Não processado", partial:"Parcial", processed:"Processado", reviewed:"Revisado" };

function textToList(t?: string) { return t?.split(",").map(s=>s.trim()).filter(Boolean)??[]; }

function buildPayload(data: SourceInput) {
  const { relatedGameIdsText, relatedPersonIdsText, relatedCompetitionIdsText, relatedEditionIdsText, relatedOpponentIdsText, relatedVenueIdsText, relatedCityIdsText, sourceIdsText: _s, ...rest } = data as SourceInput & { sourceIdsText?: string };
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
  const [items,   setItems]   = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<"list"|"detail"|"form">("list");
  const [selected, setSelected] = useState<Source | null>(null);
  const [editing,  setEditing]  = useState<Source | null>(null);
  const [query,  setQuery]    = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");

  async function refresh() {
    setLoading(true);
    setItems(await listCollection<Source>("sources"));
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => items
    .filter(s => s.status === "active")
    .filter(s => typeFilter === "Todos" || s.sourceType === typeFilter)
    .filter(s => !query || s.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => (b.publicationDate??"").localeCompare(a.publicationDate??""))
  , [items, typeFilter, query]);

  function openDetail(s: Source) { setSelected(s); setView("detail"); }
  function openNew()  { setEditing(null); setView("form"); }
  function openEdit(s: Source) { setEditing(s); setView("form"); }
  function back() { setView("list"); setSelected(null); setEditing(null); }

  async function handleCreate(data: SourceInput) { await createDocument("sources", buildPayload(data), data.title); await refresh(); setView("list"); }
  async function handleUpdate(data: SourceInput) {
    if (!editing) return;
    await upsertDocument("sources", editing.id, buildPayload(data), { entityName: data.title, before: editing });
    await refresh(); setView("list");
  }
  async function handleArchive(s: Source) {
    if (!confirm(`Arquivar "${s.title}"?`)) return;
    await archiveDocument("sources", s.id, s.title); await refresh(); setView("list");
  }
  async function handleRestore(s: Source) { await restoreDocument("sources", s.id, s.title); await refresh(); }

  if (view === "detail" && selected) {
    return (
      <div style={{ maxWidth:960 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <div className="ficha-hdr">
          <h2>{selected.title}</h2>
          <div className="ficha-actions">
            <button className="btn-link" style={{ color:"#fff" }} onClick={()=>openEdit(selected)}><i className="ti ti-pencil" /> Editar</button>
            {selected.driveFileId && (
              <a href={`https://drive.google.com/file/d/${selected.driveFileId}/view`} target="_blank" rel="noopener noreferrer" className="btn-link" style={{ color:"#fff" }}><i className="ti ti-external-link" /> Drive</a>
            )}
            {selected.status==="archived"
              ? <button className="btn-link" style={{ color:"#fff" }} onClick={()=>handleRestore(selected)}><i className="ti ti-refresh" /> Restaurar</button>
              : <button className="btn-link" style={{ color:"#fca5a5" }} onClick={()=>handleArchive(selected)}><i className="ti ti-archive" /> Arquivar</button>}
          </div>
        </div>
        <div className="ficha-body" style={{ gridTemplateColumns:"1fr" }}>
          <div className="ficha-col">
            <div className="fsec">Identificação</div>
            <div className="frow"><span className="frow-lbl">Tipo</span><span>{TYPE_LABELS[selected.sourceType]??selected.sourceType}</span></div>
            <div className="frow"><span className="frow-lbl">Autoridade</span><span>{AUTHORITY_LABELS[selected.sourceAuthority]??selected.sourceAuthority}</span></div>
            <div className="frow"><span className="frow-lbl">Acesso</span><span>{selected.accessLevel}</span></div>
            <div className="frow"><span className="frow-lbl">Extração</span><span>{EXTRACTION_LABELS[selected.extractionStatus]??selected.extractionStatus}</span></div>
            {selected.publicationDate && <div className="frow"><span className="frow-lbl">Data</span><span>{selected.publicationDate}</span></div>}
            {selected.author && <div className="frow"><span className="frow-lbl">Autor</span><span>{selected.author}</span></div>}
            {selected.publisher && <div className="frow"><span className="frow-lbl">Publicador</span><span>{selected.publisher}</span></div>}
            {selected.driveFileId && <div className="frow"><span className="frow-lbl">Drive ID</span><span style={{ fontFamily:"monospace",fontSize:11 }}>{selected.driveFileId}</span></div>}
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
        <SourceForm initialValues={editing??undefined} onSubmit={editing?handleUpdate:handleCreate} onCancel={back} />
      </div>
    );
  }

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-title"><i className="ti ti-file-description" />Fontes <span className="cbadge">{filtered.length}</span></div>
        <div className="page-actions">
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ width:"auto" }}>
            {["Todos",...Object.keys(TYPE_LABELS)].map(t=><option key={t} value={t}>{t==="Todos"?"Todos os tipos":TYPE_LABELS[t]}</option>)}
          </select>
          <button className="btn" onClick={openNew}><i className="ti ti-plus" /> Nova fonte</button>
        </div>
      </div>
      <div className="filters"><input placeholder="Buscar pelo título..." value={query} onChange={e=>setQuery(e.target.value)} style={{ maxWidth:280 }} /></div>
      {loading && <p style={{ color:"var(--tx3)",padding:24 }}>Carregando...</p>}
      {!loading && filtered.length===0 && <div className="empty-s"><i className="ti ti-file-description" /><p>Nenhuma fonte encontrada</p></div>}
      {!loading && filtered.length>0 && (
        <div className="tbl-wrap"><table>
          <thead><tr><th>Título</th><th>Tipo</th><th>Autoridade</th><th>Extração</th></tr></thead>
          <tbody>{filtered.map(s=>(
            <tr key={s.id} onClick={()=>openDetail(s)}>
              <td><strong>{s.title}</strong></td>
              <td style={{ color:"var(--tx3)",fontSize:12 }}>{TYPE_LABELS[s.sourceType]??s.sourceType}</td>
              <td style={{ color:"var(--tx3)",fontSize:12 }}>{AUTHORITY_LABELS[s.sourceAuthority]??s.sourceAuthority}</td>
              <td style={{ fontSize:12 }}>{EXTRACTION_LABELS[s.extractionStatus]??s.extractionStatus}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
