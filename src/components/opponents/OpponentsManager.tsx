"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Opponent } from "@/types/opponents";
import { deriveOpponentSlug, type OpponentInput } from "@/lib/schemas/opponents";
import { OpponentForm } from "./OpponentForm";
import type { Game } from "@/types/games";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function buildPayload(data: OpponentInput) {
  const { historicalNamesText, colorsText, ...rest } = data;
  return {
    ...rest,
    slug: deriveOpponentSlug(data.name),
    historicalNames: historicalNamesText?.split(",").map(s => s.trim()).filter(Boolean) ?? [],
    colors: colorsText?.split(",").map(s => s.trim()).filter(Boolean) ?? [],
  };
}

export function OpponentsManager() {
  const [items,   setItems]   = useState<Opponent[]>([]);
  const [games,   setGames]   = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<"list"|"detail"|"form">("list");
  const [selected, setSelected] = useState<Opponent | null>(null);
  const [editing,  setEditing]  = useState<Opponent | null>(null);
  const [query,  setQuery]    = useState("");
  const [letter, setLetter]   = useState("Todos");

  async function refresh() {
    setLoading(true);
    const [ops, gs] = await Promise.all([listCollection<Opponent>("opponents"), listCollection<Game>("games")]);
    setItems(ops); setGames(gs); setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    return items
      .filter(o => o.status === "active")
      .filter(o => {
        if (letter === "Todos") return true;
        if (letter === "#") return /^[^A-Za-zÀ-ÖØ-öø-ÿ]/.test(o.name);
        return o.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").startsWith(letter);
      })
      .filter(o => !query || o.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items, letter, query]);

  function opponentGames(id: string) {
    return games.filter(g => g.status === "active" && g.opponentId === id)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  function openDetail(o: Opponent) { setSelected(o); setView("detail"); }
  function openNew()  { setEditing(null); setView("form"); }
  function openEdit(o: Opponent) { setEditing(o); setView("form"); }
  function back() { setView("list"); setSelected(null); setEditing(null); }

  async function handleCreate(data: OpponentInput) {
    await createDocument("opponents", buildPayload(data), data.name);
    await refresh(); setView("list");
  }
  async function handleUpdate(data: OpponentInput) {
    if (!editing) return;
    await upsertDocument("opponents", editing.id, buildPayload(data), { entityName: data.name, before: editing });
    await refresh(); setView("list");
  }
  async function handleArchive(o: Opponent) {
    if (!confirm(`Arquivar "${o.name}"?`)) return;
    await archiveDocument("opponents", o.id, o.name);
    await refresh(); setView("list");
  }
  async function handleRestore(o: Opponent) {
    await restoreDocument("opponents", o.id, o.name);
    await refresh();
  }

  /* ── DETAIL ── */
  if (view === "detail" && selected) {
    const cs = selected.confrontationStatistics;
    const og = opponentGames(selected.id);
    return (
      <div style={{ maxWidth: 960 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <div className="ficha-hdr">
          <h2>{selected.name}</h2>
          <div className="ficha-actions">
            <button className="btn-link" style={{ color: "#fff" }} onClick={() => openEdit(selected)}><i className="ti ti-pencil" /> Editar</button>
            {selected.status === "archived"
              ? <button className="btn-link" style={{ color: "#fff" }} onClick={() => handleRestore(selected)}><i className="ti ti-refresh" /> Restaurar</button>
              : <button className="btn-link" style={{ color: "#fca5a5" }} onClick={() => handleArchive(selected)}><i className="ti ti-archive" /> Arquivar</button>}
          </div>
        </div>
        {cs && (
          <div className="stats-bar" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
            {[["Jogos", cs.matches, ""], ["Vitórias ADJ", cs.jaraguaWins, "var(--green)"], ["Empates", cs.draws, ""], ["Vitórias ADV", cs.opponentWins, "var(--red)"], ["GF ADJ", cs.jaraguaGoals, "var(--am2)"], ["GC ADJ", cs.opponentGoals, ""], ["%", cs.matches ? Math.round(cs.jaraguaWins / cs.matches * 100) + "%" : "0%", ""]].map(([l, v, c]) => (
              <div key={l as string} className="stat-cell">
                <div className="stat-val" style={{ color: c as string || "var(--tx)" }}>{v}</div>
                <div className="stat-lbl">{l}</div>
              </div>
            ))}
          </div>
        )}
        <div className="ficha-body">
          <div className="ficha-col">
            <div className="fsec">Dados</div>
            {selected.shortName && <div className="frow"><span className="frow-lbl">Nome curto</span><span>{selected.shortName}</span></div>}
            {selected.officialName && <div className="frow"><span className="frow-lbl">Nome oficial</span><span>{selected.officialName}</span></div>}
            <div className="frow"><span className="frow-lbl">País</span><span>{selected.country}</span></div>
            {selected.state && <div className="frow"><span className="frow-lbl">Estado</span><span>{selected.state}</span></div>}
            {selected.foundationDate && <div className="frow"><span className="frow-lbl">Fundação</span><span>{selected.foundationDate}</span></div>}
            <div className="frow"><span className="frow-lbl">Ativa</span><span>{selected.active ? "Sim" : "Não"}</span></div>
            {selected.historicalNames && selected.historicalNames.length > 0 && (
              <div className="frow"><span className="frow-lbl">Nomes históricos</span><span>{selected.historicalNames.join(", ")}</span></div>
            )}
          </div>
          <div className="ficha-col">
            <div className="fsec">Confrontos ({og.length})</div>
            {og.slice(0, 50).map(g => (
              <div key={g.id} className="frow" style={{ fontSize: 13 }}>
                <span style={{ whiteSpace: "nowrap" }}>{g.date}</span>
                <span className={`badge ${g.result === "win" ? "b-green" : g.result === "loss" ? "b-red" : "b-gray"}`} style={{ fontSize: 10 }}>
                  {g.jaraguaGoals} × {g.opponentGoals}
                </span>
              </div>
            ))}
            {og.length > 50 && <p className="hint">...e mais {og.length - 50} confrontos.</p>}
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM ── */
  if (view === "form") {
    return (
      <div style={{ maxWidth: 900 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <OpponentForm initialValues={editing ?? undefined} onSubmit={editing ? handleUpdate : handleCreate} onCancel={back} />
      </div>
    );
  }

  /* ── LIST ── */
  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-title"><i className="ti ti-shield" />Adversários <span className="cbadge">{filtered.length}</span></div>
        <div className="page-actions">
          <button className="btn" onClick={openNew}><i className="ti ti-plus" /> Novo adversário</button>
        </div>
      </div>
      <div className="filters">
        <input placeholder="Buscar pelo nome..." value={query} onChange={e => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
      </div>
      <div className="alpha-bar">
        {["Todos", ...LETTERS, "#"].map(l => (
          <button key={l} className={letter === l ? "on" : ""} onClick={() => setLetter(l)}>{l === "Todos" ? "Todos" : l}</button>
        ))}
      </div>
      {loading && <p style={{ color: "var(--tx3)", padding: 24 }}>Carregando...</p>}
      {!loading && filtered.length === 0 && <div className="empty-s"><i className="ti ti-shield" /><p>Nenhum adversário encontrado</p></div>}
      {!loading && filtered.length > 0 && (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Nome</th><th>UF</th><th>Confrontos</th><th>V-E-D (ADJ)</th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} onClick={() => openDetail(o)}>
                  <td><strong>{o.name}</strong></td>
                  <td style={{ color: "var(--tx3)" }}>{o.state ?? "—"}</td>
                  <td>{o.confrontationStatistics?.matches ?? 0}</td>
                  <td style={{ fontSize: 12 }}>{o.confrontationStatistics?.jaraguaWins ?? 0}-{o.confrontationStatistics?.draws ?? 0}-{o.confrontationStatistics?.opponentWins ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
