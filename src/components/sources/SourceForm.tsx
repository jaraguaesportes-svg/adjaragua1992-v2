"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sourceSchema, type SourceInput } from "@/lib/schemas/sources";
import type { Source } from "@/types/sources";

const TYPE_LABELS: Record<string, string> = {
  match_report: "Súmula / Relatório de jogo",
  regulation: "Regulamento",
  news: "Reportagem / Notícia",
  official_document: "Documento oficial",
  book: "Livro",
  magazine: "Revista",
  website: "Site",
  interview: "Entrevista",
  other: "Outro",
};
const AUTHORITY_LABELS: Record<string, string> = {
  official: "Oficial",
  primary: "Primária",
  secondary: "Secundária",
  oral: "Oral",
};
const FILE_LABELS: Record<string, string> = {
  pdf: "PDF",
  jpg: "Imagem JPG",
  png: "Imagem PNG",
  webp: "Imagem WEBP",
  docx: "Documento Word",
  xlsx: "Planilha Excel",
  html: "Página HTML",
  url: "Link externo (URL)",
};
const ACCESS_LABELS: Record<string, string> = {
  public: "Público",
  restricted: "Restrito",
  internal: "Interno",
};
const EXTRACTION_LABELS: Record<string, string> = {
  not_processed: "Não processado",
  partial: "Parcialmente processado",
  processed: "Processado",
  reviewed: "Revisado",
};

function asNum(v: unknown) {
  return v === "" || v === null ? undefined : Number(v);
}

function idsToText(ids?: string[]) {
  return ids?.join(", ") ?? "";
}

type SourceFormProps = {
  initialValues?: Source;
  onSubmit: (data: SourceInput) => Promise<void>;
  onCancel?: () => void;
};

export function SourceForm({ initialValues, onSubmit, onCancel }: SourceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SourceInput>({
    resolver: zodResolver(sourceSchema),
    defaultValues: initialValues
      ? {
          title: initialValues.title,
          sourceType: initialValues.sourceType,
          subtype: initialValues.subtype,
          description: initialValues.description,
          publicationDate: initialValues.publicationDate,
          author: initialValues.author,
          publisher: initialValues.publisher,
          sourceAuthority: initialValues.sourceAuthority,
          fileType: initialValues.fileType,
          driveFileId: initialValues.driveFileId,
          fileName: initialValues.fileName,
          fileSize: initialValues.fileSize,
          externalUrl: initialValues.externalUrl,
          accessLevel: initialValues.accessLevel,
          relatedGameIdsText: idsToText(initialValues.relatedGameIds),
          relatedPersonIdsText: idsToText(initialValues.relatedPersonIds),
          relatedCompetitionIdsText: idsToText(initialValues.relatedCompetitionIds),
          relatedEditionIdsText: idsToText(initialValues.relatedEditionIds),
          relatedOpponentIdsText: idsToText(initialValues.relatedOpponentIds),
          relatedVenueIdsText: idsToText(initialValues.relatedVenueIds),
          relatedCityIdsText: idsToText(initialValues.relatedCityIds),
          extractionStatus: initialValues.extractionStatus,
          aiProcessed: initialValues.aiProcessed,
          aiConfidence: initialValues.aiConfidence,
          historicalImportance: initialValues.historicalImportance,
        }
      : {
          sourceType: "match_report",
          sourceAuthority: "official",
          fileType: "pdf",
          accessLevel: "public",
          extractionStatus: "not_processed",
          aiProcessed: false,
        },
  });

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <h3>{initialValues ? "Editar fonte" : "Nova fonte"}</h3>

      <fieldset>
        <legend>Identificação</legend>
        <label>
          Título *
          <input {...register("title")} placeholder="Súmula Jaraguá x Joinville" />
          {errors.title && <span className="error">{errors.title.message}</span>}
        </label>
        <div className="grid grid-2">
          <label>
            Tipo *
            <select {...register("sourceType")}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Subtipo
            <input {...register("subtype")} placeholder="sumula, ata, portaria..." />
          </label>
        </div>
        <div className="grid grid-2">
          <label>
            Autoridade documental *
            <select {...register("sourceAuthority")}>
              {Object.entries(AUTHORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Nível de acesso *
            <select {...register("accessLevel")}>
              {Object.entries(ACCESS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Descrição
          <textarea {...register("description")} rows={3} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Publicação</legend>
        <div className="grid grid-2">
          <label>
            Data de publicação
            <input type="date" {...register("publicationDate")} />
          </label>
          <label>
            Autor
            <input {...register("author")} />
          </label>
        </div>
        <label>
          Publicador / Veículo
          <input {...register("publisher")} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Arquivo</legend>
        <div className="grid grid-2">
          <label>
            Tipo de arquivo *
            <select {...register("fileType")}>
              {Object.entries(FILE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            ID no Google Drive
            <input {...register("driveFileId")} placeholder="1AbCdEfGhIj..." />
          </label>
        </div>
        <div className="grid grid-2">
          <label>
            Nome do arquivo
            <input {...register("fileName")} />
          </label>
          <label>
            Tamanho (bytes)
            <input type="number" min={0} {...register("fileSize", { setValueAs: asNum })} />
          </label>
        </div>
        <label>
          URL externa
          <input {...register("externalUrl")} placeholder="https://..." />
        </label>
      </fieldset>

      <fieldset>
        <legend>Vínculos (IDs separados por vírgula)</legend>
        <label>
          Jogos relacionados
          <input {...register("relatedGameIdsText")} />
        </label>
        <label>
          Pessoas relacionadas
          <input {...register("relatedPersonIdsText")} />
        </label>
        <label>
          Competições relacionadas
          <input {...register("relatedCompetitionIdsText")} />
        </label>
        <label>
          Edições relacionadas
          <input {...register("relatedEditionIdsText")} />
        </label>
        <label>
          Adversários relacionados
          <input {...register("relatedOpponentIdsText")} />
        </label>
        <label>
          Locais relacionados
          <input {...register("relatedVenueIdsText")} />
        </label>
        <label>
          Cidades relacionadas
          <input {...register("relatedCityIdsText")} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Processamento</legend>
        <div className="grid grid-2">
          <label>
            Status de extração
            <select {...register("extractionStatus")}>
              {Object.entries(EXTRACTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Confiança da IA (0-100)
            <input type="number" min={0} max={100} {...register("aiConfidence", { setValueAs: asNum })} />
          </label>
        </div>
        <label className="inline">
          <input type="checkbox" {...register("aiProcessed")} />
          Processado por IA
        </label>
        <label>
          Importância histórica (0-100)
          <input type="number" min={0} max={100} {...register("historicalImportance", { setValueAs: asNum })} />
        </label>
      </fieldset>

      <div className="actions">
        <button className="btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
