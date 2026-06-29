"use client";

import { PersonPicker } from "./PersonPicker";

type PersonMultiPickerProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  addLabel?: string;
};

/**
 * Lista de pessoas no mesmo padrão visual de "Gols" e "Árbitros": um botão
 * "+ Adicionar" cria uma linha nova; cada linha é um item separado do array
 * (nunca texto unido por vírgula ou ponto e vírgula).
 */
export function PersonMultiPicker({ value, onChange, placeholder, addLabel = "+ Adicionar" }: PersonMultiPickerProps) {
  function updateAt(index: number, id: string | undefined) {
    const next = [...value];
    next[index] = id ?? "";
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      {value.map((id, index) => (
        <div key={index} className="grid grid-2" style={{ marginBottom: 8 }}>
          <PersonPicker value={id || undefined} onChange={(v) => updateAt(index, v)} placeholder={placeholder} />
          <button type="button" className="btn-link" onClick={() => removeAt(index)}>
            Remover
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...value, ""])}>
        {addLabel}
      </button>
    </div>
  );
}
