"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { venueSchema, type VenueInput } from "@/lib/schemas/venues";
import type { Venue } from "@/types/venues";

const TYPE_OPTIONS = ["arena", "gymnasium", "stadium", "sports_center", "court"] as const;
const SURFACE_OPTIONS = ["madeira", "sintetico", "cimento", "grama"] as const;

const TYPE_LABELS: Record<string, string> = {
  arena: "Arena",
  gymnasium: "Ginásio",
  stadium: "Estádio",
  sports_center: "Centro esportivo",
  court: "Quadra",
};
const SURFACE_LABELS: Record<string, string> = {
  madeira: "Madeira",
  sintetico: "Sintético",
  cimento: "Cimento",
  grama: "Grama",
};

function asNum(v: unknown) {
  return v === "" || v === null ? undefined : Number(v);
}

type VenueFormProps = {
  initialValues?: Venue;
  onSubmit: (data: VenueInput) => Promise<void>;
  onCancel?: () => void;
};

export function VenueForm({ initialValues, onSubmit, onCancel }: VenueFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VenueInput>({
    resolver: zodResolver(venueSchema),
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          officialName: initialValues.officialName,
          cityId: initialValues.cityId,
          country: initialValues.country,
          state: initialValues.state,
          address: initialValues.address,
          latitude: initialValues.latitude,
          longitude: initialValues.longitude,
          venueType: initialValues.venueType,
          surface: initialValues.surface,
          capacity: initialValues.capacity,
          inaugurationDate: initialValues.inaugurationDate,
          active: initialValues.active,
          historicalNamesText: initialValues.historicalNames?.join(", "),
          description: initialValues.description,
        }
      : { country: "Brasil", venueType: "gymnasium", active: true },
  });

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <h3>{initialValues ? "Editar local" : "Novo local"}</h3>

      <div className="grid grid-2">
        <label>
          Nome *
          <input {...register("name")} placeholder="Arena Jaraguá" />
          {errors.name && <span className="error">{errors.name.message}</span>}
        </label>
        <label>
          Nome oficial
          <input {...register("officialName")} placeholder="Arena Multiuso Prefeito Eurico Duwe" />
        </label>
      </div>

      <label>
        Cidade (ID) *
        <input {...register("cityId")} placeholder="ID da coleção cities" />
        {errors.cityId && <span className="error">{errors.cityId.message}</span>}
      </label>

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
        Endereço
        <input {...register("address")} />
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
          Tipo *
          <select {...register("venueType")}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label>
          Piso
          <select {...register("surface")}>
            <option value="">—</option>
            {SURFACE_OPTIONS.map((s) => (
              <option key={s} value={s}>{SURFACE_LABELS[s]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Capacidade
          <input type="number" min={0} {...register("capacity", { setValueAs: asNum })} />
        </label>
        <label>
          Data de inauguração
          <input type="date" {...register("inaugurationDate")} />
        </label>
      </div>

      <label className="inline">
        <input type="checkbox" {...register("active")} />
        Local ativo
      </label>

      <label>
        Nomes históricos (separados por vírgula)
        <input {...register("historicalNamesText")} placeholder="Arena Jaraguá, Arena Multiuso..." />
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
