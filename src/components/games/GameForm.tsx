"use client";

import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { gameSchema, type GameInput } from "@/lib/schemas/games";
import type { Game } from "@/types/games";
import { PersonPicker } from "@/components/people/PersonPicker";
import { PersonMultiPicker } from "@/components/people/PersonMultiPicker";

type GameFormProps = {
  initialValues?: Game;
  onSubmit: (data: GameInput) => Promise<void>;
  onCancel?: () => void;
};

export function GameForm({ initialValues, onSubmit, onCancel }: GameFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GameInput>({
    resolver: zodResolver(gameSchema),
    defaultValues: initialValues
      ? {
          date: initialValues.date,
          time: initialValues.time,
          competitionId: initialValues.competitionId,
          editionId: initialValues.editionId,
          opponentId: initialValues.opponentId,
          venueId: initialValues.venueId,
          cityId: initialValues.cityId,
          country: initialValues.country,
          homeAway: initialValues.homeAway,
          phase: initialValues.phase,
          round: initialValues.round,
          jaraguaGoals: initialValues.jaraguaGoals,
          opponentGoals: initialValues.opponentGoals,
          attendance: initialValues.attendance,
          revenue: initialValues.revenue,
          coachId: initialValues.coachId,
          starters: initialValues.starters ?? [],
          substitutes: initialValues.substitutes ?? [],
          participated: initialValues.participated ?? [],
          goals: initialValues.goals,
          referees: initialValues.referees,
          notes: initialValues.notes,
        }
      : {
          homeAway: "home",
          jaraguaGoals: 0,
          opponentGoals: 0,
          goals: [],
          referees: [],
          starters: [],
          substitutes: [],
          participated: [],
        },
  });

  const goalsArray = useFieldArray({ control, name: "goals" });
  const refereesArray = useFieldArray({ control, name: "referees" });

  const jg = watch("jaraguaGoals");
  const og = watch("opponentGoals");
  const previewResult = jg > og ? "Vitória" : jg < og ? "Derrota" : "Empate";

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <h3>{initialValues ? "Editar jogo" : "Novo jogo"}</h3>

      <div className="grid grid-2">
        <label>
          Data *
          <input type="date" {...register("date")} />
          {errors.date && <span className="error">{errors.date.message}</span>}
        </label>
        <label>
          Horário
          <input type="time" {...register("time")} />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Competição (ID) *
          <input {...register("competitionId")} placeholder="ID da coleção competitions" />
          {errors.competitionId && <span className="error">{errors.competitionId.message}</span>}
        </label>
        <label>
          Edição (ID) *
          <input {...register("editionId")} placeholder="ID da coleção editions" />
          {errors.editionId && <span className="error">{errors.editionId.message}</span>}
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Adversário (ID) *
          <input {...register("opponentId")} placeholder="ID da coleção opponents" />
          {errors.opponentId && <span className="error">{errors.opponentId.message}</span>}
        </label>
        <label>
          Técnico
          <Controller
            control={control}
            name="coachId"
            render={({ field }) => (
              <PersonPicker value={field.value} onChange={field.onChange} placeholder="Buscar treinador..." />
            )}
          />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Local / Venue (ID) *
          <input {...register("venueId")} placeholder="ID da coleção venues" />
          {errors.venueId && <span className="error">{errors.venueId.message}</span>}
        </label>
        <label>
          Cidade (ID) *
          <input {...register("cityId")} placeholder="ID da coleção cities" />
          {errors.cityId && <span className="error">{errors.cityId.message}</span>}
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          País
          <input {...register("country")} placeholder="Brasil" />
        </label>
        <label>
          Mandante / Visitante *
          <select {...register("homeAway")}>
            <option value="home">Casa (home)</option>
            <option value="away">Fora (away)</option>
            <option value="neutral">Neutro</option>
          </select>
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Fase
          <input {...register("phase")} />
        </label>
        <label>
          Rodada
          <input {...register("round")} />
        </label>
      </div>

      <div className="grid grid-2">
        <label>
          Gols do Jaraguá *
          <input type="number" min={0} {...register("jaraguaGoals", { valueAsNumber: true })} />
          {errors.jaraguaGoals && <span className="error">{errors.jaraguaGoals.message}</span>}
        </label>
        <label>
          Gols do adversário *
          <input type="number" min={0} {...register("opponentGoals", { valueAsNumber: true })} />
          {errors.opponentGoals && <span className="error">{errors.opponentGoals.message}</span>}
        </label>
      </div>

      <p>
        <strong>Resultado calculado automaticamente:</strong> {previewResult}
      </p>

      <div className="grid grid-2">
        <label>
          Público presente
          <input
            type="number"
            min={0}
            {...register("attendance", {
              setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
            })}
          />
        </label>
        <label>
          Renda (R$)
          <input
            type="number"
            min={0}
            step="0.01"
            {...register("revenue", {
              setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
            })}
          />
        </label>
      </div>

      <fieldset>
        <legend>Titulares</legend>
        <Controller
          control={control}
          name="starters"
          render={({ field }) => (
            <PersonMultiPicker value={field.value ?? []} onChange={field.onChange} placeholder="Buscar atleta titular..." addLabel="+ Adicionar titular" />
          )}
        />
      </fieldset>

      <fieldset>
        <legend>Entraram</legend>
        <Controller
          control={control}
          name="substitutes"
          render={({ field }) => (
            <PersonMultiPicker value={field.value ?? []} onChange={field.onChange} placeholder="Buscar atleta reserva..." addLabel="+ Adicionar reserva" />
          )}
        />
      </fieldset>

      <fieldset>
        <legend>Jogaram</legend>
        <Controller
          control={control}
          name="participated"
          render={({ field }) => (
            <PersonMultiPicker value={field.value ?? []} onChange={field.onChange} placeholder="Buscar pessoa..." addLabel="+ Adicionar participante" />
          )}
        />
      </fieldset>

      <fieldset>
        <legend>Gols</legend>
        {goalsArray.fields.map((field, index) => (
          <div key={field.id} className="grid grid-2">
            <Controller
              control={control}
              name={`goals.${index}.personId`}
              render={({ field: f }) => (
                <PersonPicker value={f.value} onChange={(v) => f.onChange(v ?? "")} placeholder="Quem marcou?" />
              )}
            />
            <select {...register(`goals.${index}.team`)}>
              <option value="jaragua">Jaraguá</option>
              <option value="opponent">Adversário</option>
            </select>
            <input {...register(`goals.${index}.time`)} placeholder="Minuto (ex: 17:10)" />
            <button type="button" className="btn-link" onClick={() => goalsArray.remove(index)}>
              Remover
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => goalsArray.append({ personId: "", team: "jaragua", time: "" })}
        >
          + Adicionar gol
        </button>
      </fieldset>

      <fieldset>
        <legend>Árbitros</legend>
        {refereesArray.fields.map((field, index) => (
          <div key={field.id} className="grid grid-2">
            <input {...register(`referees.${index}.name`)} placeholder="Nome" />
            <input {...register(`referees.${index}.country`)} placeholder="País" />
            <button type="button" className="btn-link" onClick={() => refereesArray.remove(index)}>
              Remover
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => refereesArray.append({ name: "", country: "Brasil" })}
        >
          + Adicionar árbitro
        </button>
      </fieldset>

      <label>
        Observações
        <textarea {...register("notes")} rows={3} />
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
