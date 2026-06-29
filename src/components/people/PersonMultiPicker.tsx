"use client";

import { useEffect, useState } from "react";
import { PersonPicker } from "./PersonPicker";
import { listCollection } from "@/lib/services/firestore";
import type { Person } from "@/types/people";

type PersonMultiPickerProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
};

export function PersonMultiPicker({ value, onChange, placeholder }: PersonMultiPickerProps) {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    listCollection<Person>("people").then(setPeople);
  }, [value.length]);

  function add(id: string | undefined) {
    if (!id || value.includes(id)) return;
    onChange([...value, id]);
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div>
      {value.length > 0 && (
        <ol className="person-line-list">
          {value.map((id) => {
            const person = people.find((p) => p.id === id);
            return (
              <li key={id} className="person-line-item">
                <span>{person?.nickname ?? `(carregando: ${id})`}</span>
                {person?.fullName && <span className="person-line-fullname">{person.fullName}</span>}
                <button type="button" className="btn-link" onClick={() => remove(id)}>
                  Remover
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <PersonPicker value={undefined} onChange={add} placeholder={placeholder} />
    </div>
  );
}
