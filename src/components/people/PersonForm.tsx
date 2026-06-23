"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personSchema, type PersonInput } from "@/lib/schemas/people";
import type { Person } from "@/types/people";

const ROLE_OPTIONS = ["player", "coach", "referee", "director", "official"] as const;
const POSITION_OPTIONS = ["goalkeeper", "fixo", "ala", "pivot"] as const;

type PersonFormProps = {
  initialValues?: Person;
  onSubmit: (data: PersonInput) => Promise<void>;
  onCancel?: () => void;
};

export function PersonForm({ initialValues, onSubmit, onCancel }: PersonFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonInput>({
    resolver: zodResolver(personSchema),
    defaultValues: initialValues
      ? {
          nickname: initialValues.nickname,
          fullName: initialValues.fullName,
          birthDate: initialValues.birthDate,
          deathDate: initialValues.deathDate,
          birthCityId: initialValues.birthCityId,
          gender: initialValues.gender,
          nationality: initialValues.nationality,
          dominantFoot: initialValues.dominantFoot,
          roles: initialValues.roles,
          primaryRole: initialValues.primaryRole,
          playerPosition: initialValues.playerPosition,
          cbfsRegistration: initialValues.cbfsRegistration,
          aliases: initialValues.aliases,
          biography: initialValues.biography,
          clubPeriods: initialValues.clubPeriods,
          identificationStatus: initialValues.identificationStatus,
        }
      : { gender: "male", roles: [], primaryRole: "player" },
  });

  return (
    <form
      className="card"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <h3>{initialValues ? "Editar pessoa" : "Nova pessoa"}</h3>

      <label>
        Apelido *
        <input {...register("nickname")} />
        {errors.nickname && <span className="error">{errors.nickname.message}</span>}
      </label>

      <label>
        Nome completo
        <input {...register("fullName")} />
      </label>

      <div className="grid grid-2">
        <label>
          Data de nascimento
          <input type="date" {...register("birthDate")} />
        </label>
        <label>
          Data de falecimento
          <input type="date" {...register("deathDate")} />
        </label>
      </div>

      <label>
        Cidade de nascimento (ID)
        <input {...register("birthCityId")} placeholder="ID da coleção cities" />
      </label>

      <div className="grid grid-2">
        <label>
          Gênero *
          <select {...register("gender")}>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        </label>
        <label>
          Pé dominante
          <select {...register("dominantFoot")}>
            <option value="">—</option>
            <option value="right">Direito</option>
            <option value="left">Esquerdo</option>
            <option value="both">Ambidestro</option>
          </select>
        </label>
      </div>

      <label>
        Nacionalidade
        <input {...register("nationality")} placeholder="Brasil" />
      </label>

      <fieldset>
        <legend>Papéis (roles) *</legend>
        {ROLE_OPTIONS.map((role) => (
          <label key={role} className="inline">
            <input type="checkbox" value={role} {...register("roles")} />
            {role}
          </label>
        ))}
        {errors.roles && <span className="error">{errors.roles.message}</span>}
      </fieldset>

      <label>
        Papel principal (primaryRole) *
        <select {...register("primaryRole")}>
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        {errors.primaryRole && <span className="error">{errors.primaryRole.message}</span>}
      </label>

      <label>
        Posição (se jogador)
        <select {...register("playerPosition")}>
          <option value="">—</option>
          {POSITION_OPTIONS.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </label>

      <label>
        Registro CBFS
        <input {...register("cbfsRegistration")} />
      </label>

      <label>
        Status de identificação
        <select {...register("identificationStatus")}>
          <option value="">—</option>
          <option value="identified">Identificado</option>
          <option value="partial">Parcial</option>
          <option value="unknown">Desconhecido</option>
        </select>
      </label>

      <label>
        Biografia
        <textarea {...register("biography")} rows={4} />
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
