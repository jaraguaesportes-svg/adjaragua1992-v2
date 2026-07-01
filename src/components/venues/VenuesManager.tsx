"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Venue } from "@/types/venues";
import { deriveVenueSlug, type VenueInput } from "@/lib/schemas/venues";
import { VenueForm } from "./VenueForm";
import type { Game } from "@/types/games";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function textToList(t?: string) { return t?.split(",").map(s=>s.trim()).filter(Boolean)??[]; }
function buildPayload(data: VenueInput) {
  const { historicalNamesText, ...rest } = data;
  return { ...rest, slug: deriveVenueSlug(data.name), historicalNames: textToList(historicalNamesText) };
}

export function VenuesManager() {
  const [items,   setItems]   = useState<Venue[]>([]);
  const [games,   setGames]   = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<"list"|"detail"|"form">("list");
  const [selected, setSelected] = useState<Venue | null>(null);
  const [editing,  setEditing]  = useState<Venue | null>(null);
  const [query,  setQuery]    = useState("");
  const [letter, setLetter]   = useState("Todos");

  async function refresh() {
    setLoading(true);
    const [vs, gs] = await Promise.all([listCollection<Venue>("venues"), listCollection<Game>("games")]);
    setItems(vs); setGames(gs); setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => items
    .filter(v => v.status === "active")
    .filter(v => {
      if (letter === "Todos") return true;
      if (letter === "#") return /^[^A-Za-zÀ-ÖØ-öø-ÿ]/.test(v.name);
      return v.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").startsWith(letter);
    })
    .filter(v => !query || v.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => a.name.localeCompare(b.name,"pt-BR"))
  , [items, letter, query]);

  function venueGames(id: string) {
    return games.filter(g => g.status==="active" && g.venueId===id).sort((a,b)=>(b.date??"").localeCompare(a.date??""));
  }

  function openDetail(v: Venue) { setSelected(v); setView("detail"); }
  function openNew()  { setEditing(null); setView("form"); }
  function openEdit(v: Venue) { setEditing(v); setView("form"); }
  function back() { setView("list"); setSelected(null); setEditing(null); }

  async function handleCreate(data: VenueInput) { await createDocument("venues", buildPayload(data), data.name); await refresh(); setView("list"); }
  async function handleUpdate(data: VenueInput) {
    if (!editing) return;
    await upsertDocument("venues", editing.id, buildPayload(data), { entityName: data.name, before: editing });
    await refresh(); setView("list");
  }
  async function handleArchive(v: Venue) {
    if (!confirm(`Arquivar "${v.name}"?`)) return;
    await archiveDocument("venues", v.id, v.name); await refresh(); setView("list");
  }
  async function handleRestore(v: Venue) { await restoreDocument("venues", v.id, v.name); await refresh(); }

  if (view === "detail" && selected) {
    const vg = venueGames(selected.id);
    const s  = selected.statistics;
    const at = selected.attendanceStatistics;
    return (
      <div style={{ maxWidth:960 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <div className="ficha-hdr">
          <h2>{selected.name}</h2>
          <div className="ficha-actions">
            <button className="btn-link" style={{ color:"#fff" }} onClick={()=>openEdit(selected)}><i className="ti ti-pencil" /> Editar</button>
            {selected.status==="archived"
              ? <button className="btn-link" style={{ color:"#fff" }} onClick={()=>handleRestore(selected)}><i className="ti ti-refresh" /> Restaurar</button>
              : <button className="btn-link" style={{ color:"#fca5a5" }} onClick={()=>handleArchive(selected)}><i className="ti ti-archive" /> Arquivar</button>}
          </div>
        </div>
        <div className="stats-bar" style={{ gridTemplateColumns:"repeat(6,1fr)" }}>
          {[["Jogos",s?.games??0,""],["V",s?.wins??0,"var(--green)"],["E",s?.draws??0,""],["D",s?.losses??0,"var(--red)"],["Público total",at?.totalAttendance??0,"var(--am2)"],["Média",at?.averageAttendance??0,""]].map(([l,v,c]) => (
            <div key={l as string} className="stat-cell"><div className="stat-val" style={{ color:c as string||"var(--tx)" }}>{v}</div><div className="stat-lbl">{l}</div></div>
          ))}
        </div>
        <div className="ficha-body">
          <div className="ficha-col">
            <div className="fsec">Dados</div>
            {selected.officialName && <div className="frow"><span className="frow-lbl">Nome oficial</span><span>{selected.officialName}</span></div>}
            <div className="frow"><span className="frow-lbl">País</span><span>{selected.country}</span></div>
            {selected.state && <div className="frow"><span className="frow-lbl">Estado</span><span>{selected.state}</span></div>}
            {selected.address && <div className="frow"><span className="frow-lbl">Endereço</span><span>{selected.address}</span></div>}
            {selected.capacity && <div className="frow"><span className="frow-lbl">Capacidade</span><span>{selected.capacity.toLocaleString("pt-BR")}</span></div>}
            {selected.inaugurationDate && <div className="frow"><span className="frow-lbl">Inauguração</span><span>{selected.inaugurationDate}</span></div>}
            {selected.firstGameDate && <div className="frow"><span className="frow-lbl">Primeiro jogo</span><span>{selected.firstGameDate}</span></div>}
            {selected.lastGameDate && <div className="frow"><span className="frow-lbl">Último jogo</span><span>{selected.lastGameDate}</span></div>}
          </div>
          <div className="ficha-col">
            <div className="fsec">Jogos no local ({vg.length})</div>
            {vg.slice(0,50).map(g=>(
              <div key={g.id} className="frow" style={{ fontSize:13 }}>
                <span style={{ whiteSpace:"nowrap" }}>{g.date}</span>
                <span style={{ color:"var(--tx3)",fontSize:11 }}>{g.opponentName??g.opponentId}</span>
                <span className={`badge ${g.result==="win"?"b-green":g.result==="loss"?"b-red":"b-gray"}`} style={{ fontSize:10 }}>{g.jaraguaGoals}×{g.opponentGoals}</span>
              </div>
            ))}
            {vg.length>50 && <p className="hint">...e mais {vg.length-50} jogos.</p>}
          </div>
        </div>
      </div>
    );
  }

  if (view === "form") {
    return (
      <div style={{ maxWidth:900 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <VenueForm initialValues={editing??undefined} onSubmit={editing?handleUpdate:handleCreate} onCancel={back} />
      </div>
    );
  }

  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-title"><i className="ti ti-building-stadium" />Locais <span className="cbadge">{filtered.length}</span></div>
        <div className="page-actions"><button className="btn" onClick={openNew}><i className="ti ti-plus" /> Novo local</button></div>
      </div>
      <div className="filters"><input placeholder="Buscar pelo nome..." value={query} onChange={e=>setQuery(e.target.value)} style={{ maxWidth:280 }} /></div>
      <div className="alpha-bar">
        {["Todos",...LETTERS,"#"].map(l=><button key={l} className={letter===l?"on":""} onClick={()=>setLetter(l)}>{l==="Todos"?"Todos":l}</button>)}
      </div>
      {loading && <p style={{ color:"var(--tx3)",padding:24 }}>Carregando...</p>}
      {!loading && filtered.length===0 && <div className="empty-s"><i className="ti ti-building-stadium" /><p>Nenhum local encontrado</p></div>}
      {!loading && filtered.length>0 && (
        <div className="tbl-wrap"><table>
          <thead><tr><th>Nome</th><th>Estado</th><th>Jogos</th><th>Público total</th></tr></thead>
          <tbody>{filtered.map(v=>(
            <tr key={v.id} onClick={()=>openDetail(v)}>
              <td><strong>{v.name}</strong></td>
              <td style={{ color:"var(--tx3)" }}>{v.state??v.country}</td>
              <td>{v.statistics?.games??0}</td>
              <td>{v.attendanceStatistics?.totalAttendance??0}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
