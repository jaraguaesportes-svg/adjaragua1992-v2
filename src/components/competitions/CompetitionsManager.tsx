"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Competition } from "@/types/competitions";
import { deriveCompetitionSlug, type CompetitionInput } from "@/lib/schemas/competitions";
import { CompetitionForm } from "./CompetitionForm";
import type { Game } from "@/types/games";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const TYPE_LABELS: Record<string,string> = { league:"Liga", cup:"Copa", supercup:"Supercopa", friendly:"Amistoso", selection:"Seleção" };
const LEVEL_LABELS: Record<string,string> = { international:"Internacional", national:"Nacional", state:"Estadual", regional:"Regional", municipal:"Municipal" };

function textToList(t?: string) { return t?.split(",").map(s=>s.trim()).filter(Boolean) ?? []; }

function buildPayload(data: CompetitionInput) {
  const { historicalNamesText, ...rest } = data;
  return { ...rest, slug: deriveCompetitionSlug(data.name), historicalNames: textToList(historicalNamesText) };
}

export function CompetitionsManager() {
  const [items,   setItems]   = useState<Competition[]>([]);
  const [games,   setGames]   = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<"list"|"detail"|"form">("list");
  const [selected, setSelected] = useState<Competition | null>(null);
  const [editing,  setEditing]  = useState<Competition | null>(null);
  const [query,  setQuery]    = useState("");
  const [letter, setLetter]   = useState("Todos");

  async function refresh() {
    setLoading(true);
    const [cs, gs] = await Promise.all([listCollection<Competition>("competitions"), listCollection<Game>("games")]);
    setItems(cs); setGames(gs); setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => items
    .filter(c => c.status === "active")
    .filter(c => {
      if (letter === "Todos") return true;
      if (letter === "#") return /^[^A-Za-zÀ-ÖØ-öø-ÿ]/.test(c.name);
      return c.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").startsWith(letter);
    })
    .filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => a.name.localeCompare(b.name,"pt-BR"))
  , [items, letter, query]);

  function compGames(id: string) {
    return games.filter(g => g.status === "active" && g.competitionId === id).sort((a,b) => (b.date??"").localeCompare(a.date??""));
  }

  function openDetail(c: Competition) { setSelected(c); setView("detail"); }
  function openNew()  { setEditing(null); setView("form"); }
  function openEdit(c: Competition) { setEditing(c); setView("form"); }
  function back() { setView("list"); setSelected(null); setEditing(null); }

  async function handleCreate(data: CompetitionInput) { await createDocument("competitions", buildPayload(data), data.name); await refresh(); setView("list"); }
  async function handleUpdate(data: CompetitionInput) {
    if (!editing) return;
    await upsertDocument("competitions", editing.id, buildPayload(data), { entityName: data.name, before: editing });
    await refresh(); setView("list");
  }
  async function handleArchive(c: Competition) {
    if (!confirm(`Arquivar "${c.name}"?`)) return;
    await archiveDocument("competitions", c.id, c.name); await refresh(); setView("list");
  }
  async function handleRestore(c: Competition) { await restoreDocument("competitions", c.id, c.name); await refresh(); }

  if (view === "detail" && selected) {
    const cg = compGames(selected.id);
    const wins  = cg.filter(g => g.result === "win").length;
    const draws = cg.filter(g => g.result === "draw").length;
    const losses= cg.filter(g => g.result === "loss").length;
    return (
      <div style={{ maxWidth: 960 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <div className="ficha-hdr">
          <h2>{selected.name}</h2>
          <div className="ficha-actions">
            <button className="btn-link" style={{ color:"#fff" }} onClick={()=>openEdit(selected)}><i className="ti ti-pencil" /> Editar</button>
            {selected.status === "archived"
              ? <button className="btn-link" style={{ color:"#fff" }} onClick={()=>handleRestore(selected)}><i className="ti ti-refresh" /> Restaurar</button>
              : <button className="btn-link" style={{ color:"#fca5a5" }} onClick={()=>handleArchive(selected)}><i className="ti ti-archive" /> Arquivar</button>}
          </div>
        </div>
        <div className="stats-bar" style={{ gridTemplateColumns:"repeat(5,1fr)" }}>
          {[["Jogos",cg.length,""],["V",wins,"var(--green)"],["E",draws,""],["D",losses,"var(--red)"],["%",cg.length?Math.round(wins/cg.length*100)+"%":"0%",""]].map(([l,v,c]) => (
            <div key={l as string} className="stat-cell"><div className="stat-val" style={{ color:c as string||"var(--tx)" }}>{v}</div><div className="stat-lbl">{l}</div></div>
          ))}
        </div>
        <div className="ficha-body">
          <div className="ficha-col">
            <div className="fsec">Dados</div>
            <div className="frow"><span className="frow-lbl">Sigla</span><span>{selected.shortName}</span></div>
            <div className="frow"><span className="frow-lbl">Tipo</span><span>{TYPE_LABELS[selected.competitionType] ?? selected.competitionType}</span></div>
            <div className="frow"><span className="frow-lbl">Nível</span><span>{LEVEL_LABELS[selected.level] ?? selected.level}</span></div>
            {selected.organizer && <div className="frow"><span className="frow-lbl">Organizador</span><span>{selected.organizer}</span></div>}
            {selected.country && <div className="frow"><span className="frow-lbl">País</span><span>{selected.country}</span></div>}
            {selected.foundationYear && <div className="frow"><span className="frow-lbl">Fundação</span><span>{selected.foundationYear}</span></div>}
            <div className="frow"><span className="frow-lbl">Ativa</span><span>{selected.active ? "Sim" : "Não"}</span></div>
          </div>
          <div className="ficha-col">
            <div className="fsec">Jogos na competição ({cg.length})</div>
            {cg.slice(0,50).map(g => (
              <div key={g.id} className="frow" style={{ fontSize:13 }}>
                <span style={{ whiteSpace:"nowrap" }}>{g.date}</span>
                <span style={{ color:"var(--tx3)",fontSize:11 }}>{g.opponentName ?? g.opponentId}</span>
                <span className={`badge ${g.result==="win"?"b-green":g.result==="loss"?"b-red":"b-gray"}`} style={{ fontSize:10 }}>{g.jaraguaGoals}×{g.opponentGoals}</span>
              </div>
            ))}
            {cg.length > 50 && <p className="hint">...e mais {cg.length-50} jogos.</p>}
          </div>
        </div>
      </div>
    );
  }

  if (view === "form") {
    return (
      <div style={{ maxWidth:900 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <CompetitionForm initialValues={editing??undefined} onSubmit={editing?handleUpdate:handleCreate} onCancel={back} />
      </div>
    );
  }

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-title"><i className="ti ti-trophy" />Competições <span className="cbadge">{filtered.length}</span></div>
        <div className="page-actions"><button className="btn" onClick={openNew}><i className="ti ti-plus" /> Nova competição</button></div>
      </div>
      <div className="filters"><input placeholder="Buscar pelo nome..." value={query} onChange={e=>setQuery(e.target.value)} style={{ maxWidth:280 }} /></div>
      <div className="alpha-bar">
        {["Todos",...LETTERS,"#"].map(l=><button key={l} className={letter===l?"on":""} onClick={()=>setLetter(l)}>{l==="Todos"?"Todos":l}</button>)}
      </div>
      {loading && <p style={{ color:"var(--tx3)",padding:24 }}>Carregando...</p>}
      {!loading && filtered.length===0 && <div className="empty-s"><i className="ti ti-trophy" /><p>Nenhuma competição encontrada</p></div>}
      {!loading && filtered.length>0 && (
        <div className="tbl-wrap"><table>
          <thead><tr><th>Nome</th><th>Tipo</th><th>Nível</th><th>Jogos</th></tr></thead>
          <tbody>{filtered.map(c=>(
            <tr key={c.id} onClick={()=>openDetail(c)}>
              <td><strong>{c.name}</strong></td>
              <td style={{ color:"var(--tx3)",fontSize:12 }}>{TYPE_LABELS[c.competitionType]??c.competitionType}</td>
              <td style={{ color:"var(--tx3)",fontSize:12 }}>{LEVEL_LABELS[c.level]??c.level}</td>
              <td>{c.statistics?.games??0}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
