"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { competitionSchema, type CompetitionInput } from "@/lib/schemas/competitions";
import type { Competition } from "@/types/competitions";

const TYPE_OPTIONS = ["league", "cup", "supercup", "friendly", "selection"] as const;
const LEVEL_OPTIONS = ["international", "national", "state", "regional", "municipal"] as const;
const CLASSIFICATION_OPTIONS = ["principal", "secondary", "friendly"] as const;

type CompetitionFormProps = {
  initialValues?: Competition;
  onSubmit: (data: CompetitionInput) => Promise<void>;
  onCancel?: () => void;
};

export function CompetitionForm({ initialValues, onSubmit, onCancel }: CompetitionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompetitionInput>({
    resolver: zodResolver(competitionSchema),
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          shortName: initialValues.shortName,
          competitionType: initialValues.competitionType,
          sport: initialValues.sport,
          level: initialValues.level,
          organizer: initialValues.organizer,
          country: initialValues.country,
          foundationYear: initialValues.foundationYear,
          active: initialValues.active,
          officialWebsite: initialValues.officialWebsite,
          description: initialValues.description,
          historicalNamesText: initialValues.historicalNames?.join(", "),
          classification: initialValues.classification,
          firstJaraguaParticipation: initialValues.firstJaraguaParticipation,
        }
      : { sport: "futsal", active: true, country: "Brasil" },
  });

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <h3>{initialValues ? "Editar competição" : "Nova competição"}</h3>

      <div className="grid grid-2">
        <label>
          Nome *
          <input {...register("name")} placeholder="Liga Nacional de Futsal" />
          {errors.name && <span className="error">{errors.name.message}</span>}
        </label>
        <label>
          Nome curto / Sigla *
          <input {...register("shortName")} placeholder="LNF" />
          {errors.shortName && <span className="error">{errors.shortName.message}</span>}
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Tipo *
          <select {...register("competitionType")}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Nível *
          <select {...register("level")}>
            {LEVEL_OPTIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Modalidade *
          <input {...register("sport")} />
        </label>
        <label>
          Organizador
          <input {...register("organizer")} placeholder="CBFS, LNF, Federação..." />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          País
          <input {...register("country")} />
        </label>
        <label>
          Ano de fundação
          <input
            type="number"
            {...register("foundationYear", {
              setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
            })}
          />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Primeira participação do Jaraguá
          <input
            type="number"
            {...register("firstJaraguaParticipation", {
              setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
            })}
          />
        </label>
        <label>
          Classificação
          <select {...register("classification")}>
            <option value="">—</option>
            {CLASSIFICATION_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="inline">
        <input type="checkbox" {...register("active")} />
        Competição ativa
      </label>

      <label>
        Site oficial
        <input {...register("officialWebsite")} placeholder="https://..." />
      </label>

      <label>
        Nomes históricos (separados por vírgula)
        <input {...register("historicalNamesText")} placeholder="Liga Futsal, Liga Nacional de Futsal" />
      </label>

      <label>
        Descrição
        <textarea {...register("description")} rows={3} />
      </label>

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
