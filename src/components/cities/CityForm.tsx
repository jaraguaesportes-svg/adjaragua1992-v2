"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { citySchema, type CityInput } from "@/lib/schemas/cities";
import type { City } from "@/types/cities";

const REGION_OPTIONS = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"] as const;

function asNum(v: unknown) {
  return v === "" || v === null ? undefined : Number(v);
}

type CityFormProps = {
  initialValues?: City;
  onSubmit: (data: CityInput) => Promise<void>;
  onCancel?: () => void;
};

export function CityForm({ initialValues, onSubmit, onCancel }: CityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CityInput>({
    resolver: zodResolver(citySchema),
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          state: initialValues.state,
          stateCode: initialValues.stateCode,
          country: initialValues.country,
          countryCode: initialValues.countryCode,
          region: initialValues.region,
          latitude: initialValues.latitude,
          longitude: initialValues.longitude,
          population: initialValues.population,
          foundationDate: initialValues.foundationDate,
          description: initialValues.description,
          officialWebsite: initialValues.officialWebsite,
          historicalImportance: initialValues.historicalImportance,
        }
      : { country: "Brasil", countryCode: "BR", region: "Sul" },
  });

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <h3>{initialValues ? "Editar cidade" : "Nova cidade"}</h3>

      <label>
        Nome *
        <input {...register("name")} placeholder="Jaraguá do Sul" />
        {errors.name && <span className="error">{errors.name.message}</span>}
      </label>

      <div className="grid grid-2">
        <label>
          Estado *
          <input {...register("state")} placeholder="Santa Catarina" />
          {errors.state && <span className="error">{errors.state.message}</span>}
        </label>
        <label>
          UF
          <input {...register("stateCode")} placeholder="SC" />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          País *
          <input {...register("country")} />
          {errors.country && <span className="error">{errors.country.message}</span>}
        </label>
        <label>
          Código do país
          <input {...register("countryCode")} placeholder="BR" />
        </label>
      </div>

      <label>
        Região
        <select {...register("region")}>
          <option value="">—</option>
          {REGION_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-2">
        <label>
          Latitude
          <input type="number" step="0.000001" {...register("latitude", { setValueAs: asNum })} />
        </label>
        <label>
          Longitude
          <input type="number" step="0.000001" {...register("longitude", { setValueAs: asNum })} />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          População
          <input type="number" min={0} {...register("population", { setValueAs: asNum })} />
        </label>
        <label>
          Data de fundação
          <input type="date" {...register("foundationDate")} />
        </label>
      </div>

      <label>
        Site oficial
        <input {...register("officialWebsite")} />
      </label>

      <label>
        Importância histórica (0-100)
        <input type="number" min={0} max={100} {...register("historicalImportance", { setValueAs: asNum })} />
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
