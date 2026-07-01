"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveDocument, createDocument, getDocument, listCollection, restoreDocument, upsertDocument } from "@/lib/services/firestore";
import { recalculateStatisticsForGameParticipants } from "@/lib/services/statistics";
import { migrateLegacyPeopleReferencesInGames, migrateLegacyOpponentReferencesInGames, migrateLegacyVenueReferencesInGames, migrateLegacyCityReferencesInGames } from "@/lib/services/migratePeople";
import type { Game } from "@/types/games";
import type { Opponent } from "@/types/opponents";
import type { Venue } from "@/types/venues";
import type { Competition } from "@/types/competitions";
import { deriveResult, deriveGameSlug, type GameInput } from "@/lib/schemas/games";
import { GameForm } from "./GameForm";

type Dict = Record<string, string>;

async function buildGamePayload(data: GameInput) {
  const opponent = await getDocument<Opponent>("opponents", data.opponentId);
  const opponentLabel = opponent?.slug ?? opponent?.name ?? data.opponentId;
  return {
    ...data,
    starters:          (data.starters ?? []).filter(Boolean),
    substitutes:       (data.substitutes ?? []).filter(Boolean),
    participated:      (data.participated ?? []).filter(Boolean),
    opponentStarters:  (data.opponentStarters ?? []).filter(Boolean),
    opponentSubstitutes: (data.opponentSubstitutes ?? []).filter(Boolean),
    opponentParticipated: (data.opponentParticipated ?? []).filter(Boolean),
    slug: deriveGameSlug({ date: data.date, homeAway: data.homeAway, opponentId: opponentLabel, jaraguaGoals: Number(data.jaraguaGoals), opponentGoals: Number(data.opponentGoals) }),
    result: deriveResult(Number(data.jaraguaGoals), Number(data.opponentGoals)),
    opponentName: opponent?.name,
  };
}

function resClass(r: string) {
  if (r === "win")  return "b-green";
  if (r === "loss") return "b-red";
  return "b-gray";
}
function resLabel(r: string) {
  if (r === "win")  return "V";
  if (r === "loss") return "D";
  if (r === "draw") return "E";
  return "—";
}

export function GamesManager() {
  const [games,        setGames]        = useState<Game[]>([]);
  const [opponentNames, setOpponentNames] = useState<Dict>({});
  const [venueNames,   setVenueNames]   = useState<Dict>({});
  const [compNames,    setCompNames]    = useState<Dict>({});
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState<"list"|"detail"|"form">("list");
  const [selected,     setSelected]     = useState<Game | null>(null);
  const [editing,      setEditing]      = useState<Game | null>(null);
  const [yearFilter,   setYearFilter]   = useState("Todos");
  const [resFilter,    setResFilter]    = useState("Todos");
  const [migrating,    setMigrating]    = useState(false);
  const [migrMsg,      setMigrMsg]      = useState<string|null>(null);

  async function refresh() {
    setLoading(true);
    const [gs, ops, vs, cs] = await Promise.all([
      listCollection<Game>("games"),
      listCollection<Opponent>("opponents"),
      listCollection<Venue>("venues"),
      listCollection<Competition>("competitions"),
    ]);
    setGames(gs);
    setOpponentNames(Object.fromEntries(ops.map(o => [o.id, o.name])));
    setVenueNames(Object.fromEntries(vs.map(v => [v.id, v.name])));
    setCompNames(Object.fromEntries(cs.map(c => [c.id, c.name])));
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const years = useMemo(() => {
    const ys = [...new Set(games.map(g => g.date?.slice(0,4)).filter(Boolean))].sort().reverse();
    return ["Todos", ...ys];
  }, [games]);

  const filtered = useMemo(() => {
    return games
      .filter(g => yearFilter === "Todos" || g.date?.startsWith(yearFilter))
      .filter(g => resFilter === "Todos" || g.result === resFilter)
      .filter(g => g.status === "active")
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [games, yearFilter, resFilter]);

  const activeGames = games.filter(g => g.status === "active");
  const wins   = activeGames.filter(g => g.result === "win").length;
  const draws  = activeGames.filter(g => g.result === "draw").length;
  const losses = activeGames.filter(g => g.result === "loss").length;
  const gf     = activeGames.reduce((s, g) => s + (g.jaraguaGoals ?? 0), 0);
  const ga     = activeGames.reduce((s, g) => s + (g.opponentGoals ?? 0), 0);
  const pct    = activeGames.length ? Math.round(wins / activeGames.length * 100) : 0;

  function openDetail(g: Game) { setSelected(g); setView("detail"); }
  function openNew()   { setEditing(null);   setView("form"); }
  function openEdit(g: Game) { setEditing(g); setView("form"); }
  function backToList() { setView("list"); setSelected(null); setEditing(null); }

  async function handleCreate(data: GameInput) {
    const payload = await buildGamePayload(data);
    await createDocument("games", payload, `${data.date} x ${opponentNames[data.opponentId] ?? data.opponentId}`);
    await recalculateStatisticsForGameParticipants(payload);
    await refresh();
    setView("list");
  }

  async function handleUpdate(data: GameInput) {
    if (!editing) return;
    const payload = await buildGamePayload(data);
    await upsertDocument("games", editing.id, payload, { entityName: `${data.date} x ${opponentNames[data.opponentId] ?? data.opponentId}`, before: editing });
    await recalculateStatisticsForGameParticipants(editing);
    await recalculateStatisticsForGameParticipants(payload);
    await refresh();
    setView("list");
  }

  async function handleArchive(g: Game) {
    if (!confirm(`Arquivar jogo de ${g.date}?`)) return;
    await archiveDocument("games", g.id, g.date ?? "");
    await recalculateStatisticsForGameParticipants(g);
    await refresh();
    setView("list");
  }

  async function handleRestore(g: Game) {
    await restoreDocument("games", g.id, g.date ?? "");
    await recalculateStatisticsForGameParticipants(g);
    await refresh();
  }

  async function handleMigrate() {
    if (!confirm("Corrigir pessoas, adversários, locais e cidades de jogos antigos?")) return;
    setMigrating(true); setMigrMsg(null);
    const r1 = await migrateLegacyPeopleReferencesInGames();
    const r2 = await migrateLegacyOpponentReferencesInGames();
    const r3 = await migrateLegacyVenueReferencesInGames();
    const r4 = await migrateLegacyCityReferencesInGames();
    setMigrMsg(`Pessoas: ${r1.createdCount} criada(s). Adversários: ${r2.createdCount} criado(s). Locais: ${r3.createdCount} criado(s). Cidades: ${r4.createdCount} criada(s).`);
    setMigrating(false);
    await refresh();
  }

  /* ── DETAIL VIEW ── */
  if (view === "detail" && selected) {
    const opp  = opponentNames[selected.opponentId] ?? selected.opponentId;
    const venue = venueNames[selected.venueId ?? ""] ?? selected.venueId ?? "—";
    const comp  = compNames[selected.competitionId] ?? selected.competitionId ?? "—";
    const isHome = selected.homeAway === "home";
    return (
      <div style={{ maxWidth: 960 }}>
        <button className="back-btn" onClick={backToList}><i className="ti ti-arrow-left" /> Voltar</button>

        <div className="ficha-hdr">
          <h2>{selected.date} — AD Jaraguá × {opp}</h2>
          <div className="ficha-actions">
            <button className="btn-link" style={{ color: "#fff" }} onClick={() => openEdit(selected)}><i className="ti ti-pencil" /> Editar</button>
            {selected.status === "archived"
              ? <button className="btn-link" style={{ color: "#fff" }} onClick={() => handleRestore(selected)}><i className="ti ti-refresh" /> Restaurar</button>
              : <button className="btn-link" style={{ color: "#fca5a5" }} onClick={() => handleArchive(selected)}><i className="ti ti-archive" /> Arquivar</button>}
          </div>
        </div>

        <div className="ficha-body">
          <div className="ficha-col">
            <div className="fsec">Resultado</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "12px 0 16px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", marginBottom: 4 }}>AD JARAGUÁ</div>
                <div style={{ fontSize: 44, fontWeight: 900 }}>{selected.jaraguaGoals}</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--bd)" }}>×</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", marginBottom: 4 }}>{opp}</div>
                <div style={{ fontSize: 44, fontWeight: 900 }}>{selected.opponentGoals}</div>
              </div>
            </div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span className={`badge ${resClass(selected.result)}`} style={{ fontSize: 13, padding: "4px 14px" }}>
                {resLabel(selected.result)}
              </span>
            </div>

            <div className="fsec">Evento</div>
            <div className="frow"><span className="frow-lbl">Competição</span><span>{comp}</span></div>
            <div className="frow"><span className="frow-lbl">Mando</span><span>{isHome ? "🏠 Casa" : selected.homeAway === "away" ? "✈️ Fora" : "⚖️ Neutro"}</span></div>
            {selected.phase && <div className="frow"><span className="frow-lbl">Fase</span><span>{selected.phase}</span></div>}
            {selected.round && <div className="frow"><span className="frow-lbl">Rodada</span><span>{selected.round}</span></div>}

            <div className="fsec">Local</div>
            <div className="frow"><span className="frow-lbl">Ginásio</span><span>{venue}</span></div>
            {selected.attendance != null && <div className="frow"><span className="frow-lbl">Público</span><span>{selected.attendance.toLocaleString("pt-BR")}</span></div>}
            {selected.revenue != null && <div className="frow"><span className="frow-lbl">Renda</span><span>R$ {selected.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>}

            {selected.goals && selected.goals.length > 0 && <>
              <div className="fsec">Gols</div>
              {selected.goals.map((g, i) => (
                <div key={i} className="frow">
                  <span>{g.team === "jaragua" ? "⚽ ADJ" : "⚽ ADV"}</span>
                  <span style={{ color: "var(--tx3)", fontSize: 12 }}>{g.time ?? "—"}</span>
                </div>
              ))}
            </>}

            {selected.referees && selected.referees.length > 0 && <>
              <div className="fsec">Árbitros</div>
              {selected.referees.map((r, i) => <div key={i} className="frow"><span>{r.name}</span></div>)}
            </>}
          </div>

          <div className="ficha-col">
            <div className="fsec">AD Jaraguá</div>
            {selected.starters && selected.starters.length > 0 && <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", marginBottom: 4 }}>Titulares</div>
              <ol style={{ paddingLeft: 18, marginBottom: 8 }}>
                {selected.starters.map((id, i) => <li key={i} style={{ fontSize: 13, padding: "2px 0" }}>{id}</li>)}
              </ol>
            </>}
            {selected.substitutes && selected.substitutes.length > 0 && <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", marginBottom: 4 }}>Entraram</div>
              <ol style={{ paddingLeft: 18, marginBottom: 8 }}>
                {selected.substitutes.map((id, i) => <li key={i} style={{ fontSize: 13, padding: "2px 0" }}>{id}</li>)}
              </ol>
            </>}
            {selected.participated && selected.participated.length > 0 && <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", marginBottom: 4 }}>Jogaram</div>
              <ol style={{ paddingLeft: 18, marginBottom: 8 }}>
                {selected.participated.map((id, i) => <li key={i} style={{ fontSize: 13, padding: "2px 0" }}>{id}</li>)}
              </ol>
            </>}

            <div className="fsec">Adversário</div>
            {selected.opponentStarters && selected.opponentStarters.length > 0 && <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", marginBottom: 4 }}>Iniciaram</div>
              <ol style={{ paddingLeft: 18, marginBottom: 8 }}>
                {selected.opponentStarters.map((id, i) => <li key={i} style={{ fontSize: 13, padding: "2px 0" }}>{id}</li>)}
              </ol>
            </>}

            {selected.notes && <>
              <div className="fsec">Observações</div>
              <p style={{ fontSize: 13, color: "var(--tx2)" }}>{selected.notes}</p>
            </>}
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM VIEW ── */
  if (view === "form") {
    return (
      <div style={{ maxWidth: 900 }}>
        <button className="back-btn" onClick={backToList}><i className="ti ti-arrow-left" /> Voltar</button>
        <GameForm
          initialValues={editing ?? undefined}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={backToList}
        />
      </div>
    );
  }

  /* ── LIST VIEW ── */
  return (
    <div>
      {/* Stats bar */}
      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
        {[["Jogos", activeGames.length, ""], ["V", wins, "var(--green)"], ["E", draws, ""], ["D", losses, "var(--red)"], ["GF", gf, "var(--am2)"], ["GC", ga, ""], ["%", pct + "%", ""]].map(([l, v, c]) => (
          <div key={l as string} className="stat-cell">
            <div className="stat-val" style={{ color: c as string || "var(--tx)" }}>{v}</div>
            <div className="stat-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="sec-hdr">
        <div className="sec-title"><i className="ti ti-ball-football" />Jogos</div>
        <div className="page-actions">
          <button className="btn" onClick={openNew}><i className="ti ti-plus" /> Novo jogo</button>
          <button className="btn-secondary" onClick={handleMigrate} disabled={migrating} style={{ fontSize: 12 }}>
            {migrating ? "Corrigindo..." : "Corrigir referências legadas"}
          </button>
        </div>
      </div>
      {migrMsg && <p className="hint" style={{ marginBottom: 8 }}>{migrMsg}</p>}

      {/* Filters */}
      <div className="filters">
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ width: "auto" }}>
          {years.map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={resFilter} onChange={e => setResFilter(e.target.value)} style={{ width: "auto" }}>
          {["Todos","win","draw","loss"].map(r => <option key={r} value={r}>{r === "Todos" ? "Todos" : r === "win" ? "Vitórias" : r === "draw" ? "Empates" : "Derrotas"}</option>)}
        </select>
        <span className="cbadge">{filtered.length} jogo(s)</span>
      </div>

      {loading && <p style={{ color: "var(--tx3)", padding: 24 }}>Carregando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="empty-s"><i className="ti ti-ball-football" /><p>Nenhum jogo encontrado</p></div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Adversário</th>
                <th>Competição</th>
                <th>Mando</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} onClick={() => openDetail(g)}>
                  <td style={{ whiteSpace: "nowrap" }}>{g.date}</td>
                  <td><strong>{opponentNames[g.opponentId] ?? g.opponentId}</strong></td>
                  <td style={{ color: "var(--tx3)", fontSize: 11 }}>{compNames[g.competitionId] ?? "—"}</td>
                  <td>
                    {g.homeAway === "home"
                      ? <i className="ti ti-home" style={{ fontSize: 12 }} />
                      : g.homeAway === "away"
                        ? <i className="ti ti-plane" style={{ fontSize: 12 }} />
                        : "—"}
                  </td>
                  <td>
                    <span className={`badge ${resClass(g.result)}`}>
                      {g.jaraguaGoals} × {g.opponentGoals}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
