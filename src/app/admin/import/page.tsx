"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { importGamesFromRows, type ImportProgress } from "@/lib/services/importGames";
import { resetDatabase } from "@/lib/services/resetDatabase";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [resetLog, setResetLog] = useState<string[]>([]);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    setFile(f);
    setRows(null);
    setProgress(null);
    setDone(false);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    setRows(data);
  }

  async function handleReset() {
    if (!confirm("ATENÇÃO: Isso vai apagar TODOS os dados do Firestore (jogos, pessoas, adversários, locais, cidades, competições, fontes, fotos e auditorias). Essa ação é IRREVERSÍVEL. Confirmar?")) return;
    if (!confirm("Tem certeza absoluta? Não há como desfazer.")) return;
    setResetting(true);
    setResetDone(false);
    setResetLog([]);
    try {
      await resetDatabase((msg) => setResetLog((prev) => [...prev, msg]));
      setResetDone(true);
    } catch (err) {
      setResetLog((prev) => [...prev, `Erro: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setResetting(false);
    }
  }

  async function handleImport() {
    if (!rows) return;
    setRunning(true);
    setDone(false);
    try {
      await importGamesFromRows(rows, (p) => setProgress({ ...p }));
      setDone(true);
    } catch (err) {
      setProgress((prev) => prev ? { ...prev, phase: `Erro: ${err instanceof Error ? err.message : String(err)}` } : null);
    } finally {
      setRunning(false);
    }
  }

  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <section className="card">
      <h2>Importar dados históricos</h2>
      <p className="hint" style={{ marginBottom: 20 }}>
        Carregue o arquivo Excel (.xls ou .xlsx) com os jogos históricos da AD Jaraguá.
        A importação cria automaticamente adversários, locais, cidades, pessoas e competições.
      </p>

      <fieldset>
        <legend>1. Zerar base de dados</legend>
        <p className="hint" style={{ marginBottom: 10 }}>
          Apaga todos os registros existentes antes de importar. Faça isso se houver dados de teste que não devem entrar na base definitiva.
        </p>
        <button
          className="btn-secondary"
          onClick={handleReset}
          disabled={resetting || running}
          style={{ borderColor: "var(--red)", color: "var(--red)" }}
        >
          <i className="ti ti-trash" />
          {resetting ? "Apagando..." : "Zerar toda a base de dados"}
        </button>
        {resetLog.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {resetLog.map((l, i) => (
              <p key={i} className="hint">{l}</p>
            ))}
            {resetDone && (
              <p style={{ color: "var(--green)", fontWeight: 700, marginTop: 6 }}>
                <i className="ti ti-circle-check" /> Base zerada. Pode importar agora.
              </p>
            )}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>2. Selecionar arquivo</legend>
        <input
          ref={fileRef}
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          style={{ marginBottom: 10 }}
        />
        {rows && (
          <p><strong>{rows.length} jogos encontrados</strong> no arquivo <em>{file?.name}</em></p>
        )}
      </fieldset>

      {rows && !running && !done && (
        <fieldset>
          <legend>3. Importar</legend>
          <button className="btn" onClick={handleImport}>
            <i className="ti ti-database-import" />
            Iniciar importação ({rows.length} jogos)
          </button>
        </fieldset>
      )}

      {(running || done) && progress && (
        <fieldset style={{ marginTop: 4 }}>
          <legend>Progresso</legend>
          <p style={{ marginBottom: 8 }}>{progress.phase}</p>
          <div style={{ background: "var(--bg2)", borderRadius: 6, height: 12, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ background: "var(--am)", height: "100%", width: `${pct}%`, transition: "width .3s" }} />
          </div>
          <p className="hint">{progress.current} de {progress.total} jogos ({pct}%)</p>

          {done && (
            <p style={{ marginTop: 12, color: "var(--green)", fontWeight: 700 }}>
              <i className="ti ti-circle-check" /> Importação concluída!
              {progress.errors.length > 0 && ` (${progress.errors.length} avisos)`}
            </p>
          )}

          {progress.errors.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary className="hint" style={{ cursor: "pointer" }}>
                {progress.errors.length} avisos/erros
              </summary>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {progress.errors.slice(0, 50).map((e, i) => (
                  <li key={i} className="hint">{e}</li>
                ))}
                {progress.errors.length > 50 && (
                  <li className="hint">...e mais {progress.errors.length - 50} erros.</li>
                )}
              </ul>
            </details>
          )}
        </fieldset>
      )}
    </section>
  );
}
