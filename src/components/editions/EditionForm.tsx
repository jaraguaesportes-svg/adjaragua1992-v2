"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editionSchema, type EditionInput } from "@/lib/schemas/editions";
import type { Edition } from "@/types/editions";

const CATEGORY_OPTIONS = ["adult-male", "adult-female", "youth", "selection"] as const;
const PARTICIPATION_OPTIONS = ["official", "friendly", "guest"] as const;

function asNum(v: unknown) {
  return v === "" || v === null ? undefined : Number(v);
}

type EditionFormProps = {
  initialValues?: Edition;
  onSubmit: (data: EditionInput) => Promise<void>;
  onCancel?: () => void;
};

export function EditionForm({ initialValues, onSubmit, onCancel }: EditionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditionInput>({
    resolver: zodResolver(editionSchema),
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          shortName: initialValues.shortName,
          year: initialValues.year,
          season: initialValues.season,
          competitionId: initialValues.competitionId,
          competitionName: initialValues.competitionName,
          category: initialValues.category,
          participationType: initialValues.participationType,
          startDate: initialValues.startDate,
          endDate: initialValues.endDate,
          organizer: initialValues.organizer,
          finalPosition: initialValues.finalPosition,
          championOpponentId: initialValues.championOpponentId,
          regulationSourceId: initialValues.regulationSourceId,
          historicalImportance: initialValues.historicalImportance,
        }
      : { category: "adult-male", participationType: "official" },
  });

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <h3>{initialValues ? "Editar edição" : "Nova edição"}</h3>

      <div className="grid grid-2">
        <label>
          Nome *
          <input {...register("name")} placeholder="Liga Nacional de Futsal 2025" />
          {errors.name && <span className="error">{errors.name.message}</span>}
        </label>
        <label>
          Nome curto *
          <input {...register("shortName")} placeholder="LNF 2025" />
          {errors.shortName && <span className="error">{errors.shortName.message}</span>}
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Competição (ID) *
          <input {...register("competitionId")} placeholder="ID da coleção competitions" />
          {errors.competitionId && <span className="error">{errors.competitionId.message}</span>}
        </label>
        <label>
          Nome da competição (cache)
          <input {...register("competitionName")} />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Ano *
          <input type="number" {...register("year", { setValueAs: asNum })} />
          {errors.year && <span className="error">{errors.year.message}</span>}
        </label>
        <label>
          Temporada
          <input {...register("season")} placeholder="2025" />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Categoria *
          <select {...register("category")}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Tipo de participação *
          <select {...register("participationType")}>
            {PARTICIPATION_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Início
          <input type="date" {...register("startDate")} />
        </label>
        <label>
          Fim
          <input type="date" {...register("endDate")} />
        </label>
      </div>

      <label>
        Organizador
        <input {...register("organizer")} />
      </label>

      <div className="grid grid-2">
        <label>
          Posição final
          <input type="number" min={1} {...register("finalPosition", { setValueAs: asNum })} />
        </label>
        <label>
          Adversário campeão (se o Jaraguá não venceu)
          <input {...register("championOpponentId")} placeholder="ID da coleção opponents" />
        </label>
      </div>

      <label>
        Fonte do regulamento (ID)
        <input {...register("regulationSourceId")} placeholder="ID da coleção sources" />
      </label>

      <label>
        Importância histórica (0-100)
        <input type="number" min={0} max={100} {...register("historicalImportance", { setValueAs: asNum })} />
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
