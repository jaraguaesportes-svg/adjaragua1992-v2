"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveDocument, createDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import type { Person } from "@/types/people";
import { derivePersonSlug, type PersonInput } from "@/lib/schemas/people";
import { PersonForm } from "./PersonForm";
import type { Game } from "@/types/games";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ROLE_LABELS: Record<string, string> = { player: "Atleta", coach: "Treinador", referee: "Árbitro", director: "Dirigente", official: "Anotador" };
const POS_LABELS: Record<string, string> = { goalkeeper: "GL", fixo: "FX", ala: "AL", pivot: "PV" };

function buildPayload(data: PersonInput) {
  return {
    ...data,
    slug: derivePersonSlug(data.nickname),
  };
}

export function PeopleManager() {
  const [people, setPeople]   = useState<Person[]>([]);
  const [games,  setGames]    = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<"list"|"detail"|"form">("list");
  const [selected, setSelected] = useState<Person | null>(null);
  const [editing,  setEditing]  = useState<Person | null>(null);
  const [query,  setQuery]    = useState("");
  const [letter, setLetter]   = useState("Todos");
  const [role,   setRole]     = useState("Todos");

  async function refresh() {
    setLoading(true);
    const [ps, gs] = await Promise.all([listCollection<Person>("people"), listCollection<Game>("games")]);
    setPeople(ps); setGames(gs); setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    return people
      .filter(p => p.status === "active")
      .filter(p => role === "Todos" || p.primaryRole === role)
      .filter(p => {
        if (letter === "Todos") return true;
        if (letter === "#") return /^[^A-Za-zÀ-ÖØ-öø-ÿ]/.test(p.nickname);
        return p.nickname.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").startsWith(letter);
      })
      .filter(p => {
        if (!query) return true;
        const q = query.toLowerCase();
        return p.nickname.toLowerCase().includes(q) || (p.fullName ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => a.nickname.localeCompare(b.nickname, "pt-BR"));
  }, [people, role, letter, query]);

  function personGames(id: string) {
    return games.filter(g =>
      g.status === "active" && (
        g.starters?.includes(id) || g.substitutes?.includes(id) ||
        g.participated?.includes(id) || g.goals?.some(x => x.personId === id)
      )
    ).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  function openDetail(p: Person) { setSelected(p); setView("detail"); }
  function openNew()  { setEditing(null);  setView("form"); }
  function openEdit(p: Person) { setEditing(p); setView("form"); }
  function back() { setView("list"); setSelected(null); setEditing(null); }

  async function handleCreate(data: PersonInput) {
    await createDocument("people", buildPayload(data), data.nickname);
    await refresh(); setView("list");
  }
  async function handleUpdate(data: PersonInput) {
    if (!editing) return;
    await upsertDocument("people", editing.id, buildPayload(data), { entityName: data.nickname, before: editing });
    await refresh(); setView("list");
  }
  async function handleArchive(p: Person) {
    if (!confirm(`Arquivar "${p.nickname}"?`)) return;
    await archiveDocument("people", p.id, p.nickname);
    await refresh(); setView("list");
  }
  async function handleRestore(p: Person) {
    await restoreDocument("people", p.id, p.nickname);
    await refresh();
  }

  /* ── DETAIL ── */
  if (view === "detail" && selected) {
    const pg = personGames(selected.id);
    const wins   = pg.filter(g => g.result === "win").length;
    const draws  = pg.filter(g => g.result === "draw").length;
    const losses = pg.filter(g => g.result === "loss").length;
    const goals  = pg.reduce((s, g) => s + (g.goals?.filter(x => x.personId === selected.id && x.team === "jaragua").length ?? 0), 0);
    const pct    = pg.length ? Math.round(wins / pg.length * 100) : 0;
    return (
      <div style={{ maxWidth: 960 }}>
        <button className="back-btn" onClick={back}><i className="ti ti-arrow-left" /> Voltar</button>
        <div className="ficha-hdr">
          <h2>{selected.nickname}{selected.fullName ? ` — ${selected.fullName}` : ""}</h2>
          <div className="ficha-actions">
            <button className="btn-link" style={{ color: "#fff" }} onClick={() => openEdit(selected)}><i className="ti ti-pencil" /> Editar</button>
            {selected.status === "archived"
              ? <button className="btn-link" style={{ color: "#fff" }} onClick={() => handleRestore(selected)}><i className="ti ti-refresh" /> Restaurar</button>
              : <button className="btn-link" style={{ color: "#fca5a5" }} onClick={() => handleArchive(selected)}><i className="ti ti-archive" /> Arquivar</button>}
          </div>
        </div>
        <div className="stats-bar" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
          {[["J", pg.length, ""], ["V", wins, "var(--green)"], ["E", draws, ""], ["D", losses, "var(--red)"], ["Gols", goals, "var(--am2)"], ["Inícios", selected.statistics?.starts ?? 0, ""], ["%", pct + "%", ""]].map(([l, v, c]) => (
            <div key={l as string} className="stat-cell">
              <div className="stat-val" style={{ color: c as string || "var(--tx)" }}>{v}</div>
              <div className="stat-lbl">{l}</div>
            </div>
          ))}
        </div>
        <div className="ficha-body">
          <div className="ficha-col">
            <div className="fsec">Dados</div>
            <div className="frow"><span className="frow-lbl">Papel</span><span>{ROLE_LABELS[selected.primaryRole] ?? selected.primaryRole}</span></div>
            {selected.playerPosition && <div className="frow"><span className="frow-lbl">Posição</span><span>{POS_LABELS[selected.playerPosition] ?? selected.playerPosition}</span></div>}
            {selected.birthDate && <div className="frow"><span className="frow-lbl">Nascimento</span><span>{selected.birthDate}</span></div>}
            {selected.nationality && <div className="frow"><span className="frow-lbl">Nacionalidade</span><span>{selected.nationality}</span></div>}
            {selected.cbfsRegistration && <div className="frow"><span className="frow-lbl">Reg. CBFS</span><span>{selected.cbfsRegistration}</span></div>}
            {selected.biography && <>
              <div className="fsec">Biografia</div>
              <p style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.5 }}>{selected.biography}</p>
            </>}
          </div>
          <div className="ficha-col">
            <div className="fsec">Jogos ({pg.length})</div>
            {pg.length === 0 && <p style={{ color: "var(--tx3)", fontSize: 13 }}>Nenhum jogo registrado.</p>}
            {pg.slice(0, 50).map(g => (
              <div key={g.id} className="frow" style={{ fontSize: 13 }}>
                <span>{g.date}</span>
                <span style={{ color: "var(--tx3)", fontSize: 11 }}>{g.opponentName ?? g.opponentId}</span>
                <span className={`badge ${g.result === "win" ? "b-green" : g.result === "loss" ? "b-red" : "b-gray"}`} style={{ fontSize: 10 }}>
                  {g.jaraguaGoals} × {g.opponentGoals}
                </span>
              </div>
            ))}
            {pg.length > 50 && <p className="hint">...e mais {pg.length - 50} jogos.</p>}
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
        <PersonForm initialValues={editing ?? undefined} onSubmit={editing ? handleUpdate : handleCreate} onCancel={back} />
      </div>
    );
  }

  /* ── LIST ── */
  return (
    <div>
      <div className="sec-hdr">
        <div className="sec-title"><i className="ti ti-users" />Pessoas <span className="cbadge">{filtered.length}</span></div>
        <div className="page-actions">
          <select value={role} onChange={e => setRole(e.target.value)} style={{ width: "auto" }}>
            {["Todos","player","coach","referee","director","official"].map(r => <option key={r} value={r}>{r === "Todos" ? "Todos os papéis" : ROLE_LABELS[r]}</option>)}
          </select>
          <button className="btn" onClick={openNew}><i className="ti ti-plus" /> Nova pessoa</button>
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
      {!loading && filtered.length === 0 && <div className="empty-s"><i className="ti ti-users" /><p>Nenhuma pessoa encontrada</p></div>}
      {!loading && filtered.length > 0 && (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Apelido</th><th>Nome completo</th><th>Papel</th><th>J</th><th>Gols</th><th>V-E-D</th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => openDetail(p)}>
                  <td><strong>{p.nickname}</strong></td>
                  <td style={{ color: "var(--tx3)" }}>{p.fullName ?? "—"}</td>
                  <td>{p.playerPosition ? <span className={`ptag ${p.playerPosition}`}>{POS_LABELS[p.playerPosition]}</span> : <span style={{ fontSize: 12, color: "var(--tx3)" }}>{ROLE_LABELS[p.primaryRole] ?? p.primaryRole}</span>}</td>
                  <td>{p.statistics?.games ?? 0}</td>
                  <td>{p.statistics?.goals ?? 0}</td>
                  <td style={{ fontSize: 12 }}>{p.statistics?.wins ?? 0}-{p.statistics?.draws ?? 0}-{p.statistics?.losses ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
