"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { opponentSchema, type OpponentInput } from "@/lib/schemas/opponents";
import type { Opponent } from "@/types/opponents";
import { CityPicker } from "@/components/cities/CityPicker";

const IDENTIFICATION_OPTIONS = ["identified", "partial", "unknown"] as const;
const IDENTIFICATION_LABELS: Record<string, string> = {
  identified: "Identificado",
  partial: "Parcial",
  unknown: "Desconhecido",
};

type OpponentFormProps = {
  initialValues?: Opponent;
  onSubmit: (data: OpponentInput) => Promise<void>;
  onCancel?: () => void;
};

export function OpponentForm({ initialValues, onSubmit, onCancel }: OpponentFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OpponentInput>({
    resolver: zodResolver(opponentSchema),
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          shortName: initialValues.shortName,
          officialName: initialValues.officialName,
          fantasyName: initialValues.fantasyName,
          cnpj: initialValues.cnpj,
          sport: initialValues.sport,
          country: initialValues.country,
          state: initialValues.state,
          cityId: initialValues.cityId,
          foundationDate: initialValues.foundationDate,
          extinctionDate: initialValues.extinctionDate,
          active: initialValues.active,
          historicalNamesText: initialValues.historicalNames?.join(", "),
          predecessorId: initialValues.predecessorId,
          successorId: initialValues.successorId,
          officialWebsite: initialValues.officialWebsite,
          colorsText: initialValues.colors?.join(", "),
          identificationStatus: initialValues.identificationStatus,
        }
      : { sport: "futsal", country: "Brasil", active: true },
  });

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <h3>{initialValues ? "Editar adversário" : "Novo adversário"}</h3>

      <div className="grid grid-2">
        <label>
          Nome *
          <input {...register("name")} placeholder="Joinville Esporte Clube" />
          {errors.name && <span className="error">{errors.name.message}</span>}
        </label>
        <label>
          Nome curto *
          <input {...register("shortName")} placeholder="Joinville" />
          {errors.shortName && <span className="error">{errors.shortName.message}</span>}
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Nome oficial
          <input {...register("officialName")} />
        </label>
        <label>
          Nome fantasia
          <input {...register("fantasyName")} placeholder="JEC Krona" />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          CNPJ
          <input {...register("cnpj")} placeholder="00.000.000/0000-00" />
        </label>
        <label>
          Modalidade *
          <input {...register("sport")} />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          País *
          <input {...register("country")} />
        </label>
        <label>
          Estado (UF)
          <input {...register("state")} placeholder="SC" />
        </label>
      </div>

      <label>
        Cidade sede
        <Controller
          control={control}
          name="cityId"
          render={({ field }) => (
            <CityPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </label>

      <div className="grid grid-2">
        <label>
          Data de fundação
          <input type="date" {...register("foundationDate")} />
        </label>
        <label>
          Data de extinção
          <input type="date" {...register("extinctionDate")} />
        </label>
      </div>

      <label className="inline">
        <input type="checkbox" {...register("active")} />
        Instituição ativa
      </label>

      <label>
        Nomes históricos (separados por vírgula)
        <input {...register("historicalNamesText")} placeholder="JEC/Krona, Joinville/Krona" />
      </label>

      <div className="grid grid-2">
        <label>
          Predecessor (ID)
          <input {...register("predecessorId")} />
        </label>
        <label>
          Sucessor (ID)
          <input {...register("successorId")} />
        </label>
      </div>

      <label>
        Site oficial
        <input {...register("officialWebsite")} />
      </label>

      <label>
        Cores (separadas por vírgula)
        <input {...register("colorsText")} placeholder="preto, branco" />
      </label>

      <label>
        Status de identificação
        <select {...register("identificationStatus")}>
          <option value="">—</option>
          {IDENTIFICATION_OPTIONS.map((o) => (
            <option key={o} value={o}>{IDENTIFICATION_LABELS[o]}</option>
          ))}
        </select>
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
