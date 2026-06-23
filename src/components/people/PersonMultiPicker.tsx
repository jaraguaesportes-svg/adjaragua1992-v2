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
      <div className="person-chip-list">
        {value.map((id) => {
          const person = people.find((p) => p.id === id);
          return (
            <span key={id} className="person-chip">
              {person?.nickname ?? id}
              <button type="button" onClick={() => remove(id)}>×</button>
            </span>
          );
        })}
      </div>
      <PersonPicker value={undefined} onChange={add} placeholder={placeholder} />
    </div>
  );
}
