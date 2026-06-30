"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { photoSchema, type PhotoInput } from "@/lib/schemas/photos";
import type { Photo } from "@/types/photos";

const TYPE_LABELS: Record<string, string> = {
  portrait: "Retrato / Foto 3x4",
  action: "Foto de ação",
  team: "Foto de equipe",
  trophy: "Troféu / Conquista",
  venue: "Local / Ginásio",
  document: "Documento",
  other: "Outro",
};
const FILE_LABELS: Record<string, string> = {
  jpg: "JPG", jpeg: "JPEG", png: "PNG", webp: "WEBP", gif: "GIF", tiff: "TIFF",
};
const LICENSE_LABELS: Record<string, string> = {
  owned: "Acervo próprio",
  authorized: "Uso autorizado",
  public_domain: "Domínio público",
  unknown: "Desconhecido",
};
const ACCESS_LABELS: Record<string, string> = {
  public: "Público", restricted: "Restrito", internal: "Interno",
};
const ID_STATUS_LABELS: Record<string, string> = {
  identified: "Identificado", partial: "Parcial", unknown: "Desconhecido",
};

function asNum(v: unknown) {
  return v === "" || v === null ? undefined : Number(v);
}
function idsToText(ids?: string[]) {
  return ids?.join(", ") ?? "";
}

type PhotoFormProps = {
  initialValues?: Photo;
  onSubmit: (data: PhotoInput) => Promise<void>;
  onCancel?: () => void;
};

export function PhotoForm({ initialValues, onSubmit, onCancel }: PhotoFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PhotoInput>({
    resolver: zodResolver(photoSchema),
    defaultValues: initialValues
      ? {
          title: initialValues.title,
          description: initialValues.description,
          photoType: initialValues.photoType,
          driveFileId: initialValues.driveFileId,
          fileName: initialValues.fileName,
          fileType: initialValues.fileType,
          fileSize: initialValues.fileSize,
          width: initialValues.width,
          height: initialValues.height,
          captureDate: initialValues.captureDate,
          photographer: initialValues.photographer,
          copyrightHolder: initialValues.copyrightHolder,
          licenseType: initialValues.licenseType,
          accessLevel: initialValues.accessLevel,
          personIdsText: idsToText(initialValues.personIds),
          unidentifiedPeople: initialValues.unidentifiedPeople,
          gameIdsText: idsToText(initialValues.gameIds),
          competitionIdsText: idsToText(initialValues.competitionIds),
          editionIdsText: idsToText(initialValues.editionIds),
          opponentIdsText: idsToText(initialValues.opponentIds),
          venueIdsText: idsToText(initialValues.venueIds),
          cityIdsText: idsToText(initialValues.cityIds),
          sourceIdsText: idsToText(initialValues.sourceIds),
          identificationStatus: initialValues.identificationStatus,
          aiProcessed: initialValues.aiProcessed,
          aiConfidence: initialValues.aiConfidence,
          historicalImportance: initialValues.historicalImportance,
        }
      : {
          photoType: "team",
          fileType: "jpg",
          accessLevel: "public",
          identificationStatus: "unknown",
          aiProcessed: false,
          historicalImportance: 100,
        },
  });

  const driveFileId = watch("driveFileId");

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => await onSubmit(data))}
    >
      <h3>{initialValues ? "Editar foto" : "Nova foto"}</h3>

      <fieldset>
        <legend>Identificação</legend>
        <label>
          Título *
          <input {...register("title")} placeholder="Jaraguá campeão da Taça Brasil 2005" />
          {errors.title && <span className="error">{errors.title.message}</span>}
        </label>
        <div className="grid grid-2">
          <label>
            Tipo *
            <select {...register("photoType")}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Status de identificação *
            <select {...register("identificationStatus")}>
              {Object.entries(ID_STATUS_LABELS).map(([v, l]) => (
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
        <legend>Arquivo (Google Drive)</legend>
        <p className="hint" style={{ marginBottom: 10 }}>
          A imagem deve estar no Google Drive. Nunca armazene a imagem em base64 — apenas o ID do arquivo (Volume V 10.28).
        </p>
        <label>
          ID do arquivo no Google Drive *
          <input {...register("driveFileId")} placeholder="1AbCdEfGhIjKlMnOpQrStUv" />
          {errors.driveFileId && <span className="error">{errors.driveFileId.message}</span>}
        </label>
        {driveFileId && (
          <a
            href={`https://drive.google.com/file/d/${driveFileId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-link"
            style={{ display: "inline-block", marginTop: 6 }}
          >
            <i className="ti ti-external-link" /> Abrir no Drive
          </a>
        )}
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
            Nome do arquivo
            <input {...register("fileName")} placeholder="jaragua-campeao-2005.jpg" />
          </label>
        </div>
        <div className="grid grid-2">
          <label>
            Largura (px)
            <input type="number" min={0} {...register("width", { setValueAs: asNum })} />
          </label>
          <label>
            Altura (px)
            <input type="number" min={0} {...register("height", { setValueAs: asNum })} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Direitos e Acesso</legend>
        <div className="grid grid-2">
          <label>
            Licença
            <select {...register("licenseType")}>
              <option value="">—</option>
              {Object.entries(LICENSE_LABELS).map(([v, l]) => (
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
        <div className="grid grid-2">
          <label>
            Fotógrafo
            <input {...register("photographer")} />
          </label>
          <label>
            Detentor dos direitos
            <input {...register("copyrightHolder")} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Data e Contexto</legend>
        <label>
          Data da foto
          <input type="date" {...register("captureDate")} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Pessoas</legend>
        <label>
          Pessoas identificadas (IDs separados por vírgula)
          <input {...register("personIdsText")} placeholder="person001, person002" />
        </label>
        <label>
          Pessoas não identificadas (quantidade)
          <input type="number" min={0} {...register("unidentifiedPeople", { setValueAs: asNum })} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Vínculos (IDs separados por vírgula)</legend>
        <label>
          Jogos
          <input {...register("gameIdsText")} />
        </label>
        <label>
          Competições
          <input {...register("competitionIdsText")} />
        </label>
        <label>
          Edições
          <input {...register("editionIdsText")} />
        </label>
        <label>
          Adversários
          <input {...register("opponentIdsText")} />
        </label>
        <label>
          Locais
          <input {...register("venueIdsText")} />
        </label>
        <label>
          Cidades
          <input {...register("cityIdsText")} />
        </label>
        <label>
          Fontes
          <input {...register("sourceIdsText")} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Processamento</legend>
        <div className="grid grid-2">
          <label>
            Importância histórica (0-100)
            <input type="number" min={0} max={100} {...register("historicalImportance", { setValueAs: asNum })} />
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
