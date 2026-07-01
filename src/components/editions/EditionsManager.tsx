"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Edition } from "@/types/editions";
import { deriveEditionSlug, type EditionInput } from "@/lib/schemas/editions";
import { EditionForm } from "./EditionForm";
import type { Game } from "@/types/games";
import type { Competition } from "@/types/competitions";

function buildPayload(data: EditionInput) {
  return { ...data, slug: deriveEditionSlug(data.competitionId, data.year), titleWon: data.finalPosition===1, runnerUp: data.finalPosition===2 };
}

export function EditionsManager() {
  const [items,   setItems]   = useState<Edition[]>([]);
  const [games,   setGames]   = useState<Game[]>([]);
  const [comps,   setComps]   = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<"list"|"detail"|"form">("list");
  const [selected, setSelected] = useState<Edition | null>(null);
  const [editing,  setEditing]  = useState<Edition | null>(null);
  const [query,  setQuery]    = useState("");
  const [yearFilter, setYearFilter] = useState("Todos");

  async function refresh() {
    setLoading(true);
    const [es, gs, cs] = await Promise.all([listCollection<Edition>("editions"), listCollection<Game>("games"), listCollection<Competition>("competitions")]);
    setItems(es); setGames(gs); setComps(cs); setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const years = useMemo(() => {
    const ys = [...new Set(items.map(e => String(e.year)).filter(Boolean))].sort().reverse();
    return ["Todos", ...ys];
  }, [items]);

  const filtered = useMemo(() => items
    .filter(e => e.status === "active")
    .filter(e => yearFilter === "Todos" || String(e.year) === yearFilter)
    .filter(e => !query || e.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => b.year - a.year)
  , [items, yearFilter, query]);

  function compName(id: string) { return comps.find(c=>c.id===id)?.name ?? id; }
  function editionGames(id: string) {
    return games.filter(g => g.status==="active" && g.editionId===id).sort((a,b)=>(b.date??"").localeCompare(a.date??""));
  }

  function openDetail(e: Edition) { setSelected(e); setView("detail"); }
  function openNew()  { setEditing(null); setView("form"); }
  function openEdit(e: Edition) { setEditing(e); setView("form"); }
  function back() { setView("list"); setSelected(null); setEditing(null); }

  async function handleCreate(data: EditionInput) { await createDocument("editions", buildPayload(data), data.name); await refresh(); setView("list"); }
  async function handleUpdate(data: EditionInput) {
    if (!editing) return;
    await upsertDocument("editions", editing.id, buildPayload(data), { entityName: data.name, before: editing });
    await refresh(); setView("list");
  }
  async function handleArchive(e: Edition) {
    if (!confirm(`Arquivar "${e.name}"?`)) return;
    await archiveDocument("editions", e.id, e.name); await refresh(); setView("list");
  }
  async function handleRestore(e: Edition) { await restoreDocument("editions", e.id, e.name); await refresh(); }

  if (view === "detail" && selected) {
    const eg = editionGames(selected.id);
    const s  = selected.statistics;
    return (
      <div style={{ maxWidth:960 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <div className="ficha-hdr">
          <h2>{selected.name} {selected.titleWon ? "🏆" : selected.runnerUp ? "🥈" : ""}</h2>
          <div className="ficha-actions">
            <button className="btn-link" style={{ color:"#fff" }} onClick={()=>openEdit(selected)}><i className="ti ti-pencil" /> Editar</button>
            {selected.status==="archived"
              ? <button className="btn-link" style={{ color:"#fff" }} onClick={()=>handleRestore(selected)}><i className="ti ti-refresh" /> Restaurar</button>
              : <button className="btn-link" style={{ color:"#fca5a5" }} onClick={()=>handleArchive(selected)}><i className="ti ti-archive" /> Arquivar</button>}
          </div>
        </div>
        {s && (
          <div className="stats-bar" style={{ gridTemplateColumns:"repeat(7,1fr)" }}>
            {[["Jogos",s.games,""],["V",s.wins,"var(--green)"],["E",s.draws,""],["D",s.losses,"var(--red)"],["GF",s.goalsFor,"var(--am2)"],["GC",s.goalsAgainst,""],["Posição",selected.finalPosition??"-",""]].map(([l,v,c]) => (
              <div key={l as string} className="stat-cell"><div className="stat-val" style={{ color:c as string||"var(--tx)" }}>{v}</div><div className="stat-lbl">{l}</div></div>
            ))}
          </div>
        )}
        <div className="ficha-body">
          <div className="ficha-col">
            <div className="fsec">Dados</div>
            <div className="frow"><span className="frow-lbl">Competição</span><span>{compName(selected.competitionId)}</span></div>
            <div className="frow"><span className="frow-lbl">Ano</span><span>{selected.year}</span></div>
            {selected.category && <div className="frow"><span className="frow-lbl">Categoria</span><span>{selected.category}</span></div>}
            {selected.participationType && <div className="frow"><span className="frow-lbl">Participação</span><span>{selected.participationType}</span></div>}
            {selected.startDate && <div className="frow"><span className="frow-lbl">Início</span><span>{selected.startDate}</span></div>}
            {selected.endDate && <div className="frow"><span className="frow-lbl">Fim</span><span>{selected.endDate}</span></div>}
            {selected.organizer && <div className="frow"><span className="frow-lbl">Organizador</span><span>{selected.organizer}</span></div>}
          </div>
          <div className="ficha-col">
            <div className="fsec">Jogos na edição ({eg.length})</div>
            {eg.slice(0,50).map(g => (
              <div key={g.id} className="frow" style={{ fontSize:13 }}>
                <span style={{ whiteSpace:"nowrap" }}>{g.date}</span>
                <span style={{ color:"var(--tx3)",fontSize:11 }}>{g.opponentName??g.opponentId}</span>
                <span className={`badge ${g.result==="win"?"b-green":g.result==="loss"?"b-red":"b-gray"}`} style={{ fontSize:10 }}>{g.jaraguaGoals}×{g.opponentGoals}</span>
              </div>
            ))}
            {eg.length>50 && <p className="hint">...e mais {eg.length-50} jogos.</p>}
          </div>
        </div>
      </div>
    );
  }

  if (view === "form") {
    return (
      <div style={{ maxWidth:900 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <EditionForm initialValues={editing??undefined} onSubmit={editing?handleUpdate:handleCreate} onCancel={back} />
      </div>
    );
  }

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-title"><i className="ti ti-calendar-event" />Edições <span className="cbadge">{filtered.length}</span></div>
        <div className="page-actions">
          <select value={yearFilter} onChange={e=>setYearFilter(e.target.value)} style={{ width:"auto" }}>
            {years.map(y=><option key={y}>{y}</option>)}
          </select>
          <button className="btn" onClick={openNew}><i className="ti ti-plus" /> Nova edição</button>
        </div>
      </div>
      <div className="filters"><input placeholder="Buscar pelo nome..." value={query} onChange={e=>setQuery(e.target.value)} style={{ maxWidth:280 }} /></div>
      {loading && <p style={{ color:"var(--tx3)",padding:24 }}>Carregando...</p>}
      {!loading && filtered.length===0 && <div className="empty-s"><i className="ti ti-calendar-event" /><p>Nenhuma edição encontrada</p></div>}
      {!loading && filtered.length>0 && (
        <div className="tbl-wrap"><table>
          <thead><tr><th>Nome</th><th>Competição</th><th>Ano</th><th>Jogos</th><th>V-E-D</th><th>Título</th></tr></thead>
          <tbody>{filtered.map(e=>(
            <tr key={e.id} onClick={()=>openDetail(e)}>
              <td><strong>{e.name}</strong></td>
              <td style={{ color:"var(--tx3)",fontSize:12 }}>{compName(e.competitionId)}</td>
              <td>{e.year}</td>
              <td>{e.statistics?.games??0}</td>
              <td style={{ fontSize:12 }}>{e.statistics?.wins??0}-{e.statistics?.draws??0}-{e.statistics?.losses??0}</td>
              <td>{e.titleWon?"🏆":e.runnerUp?"🥈":"—"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
