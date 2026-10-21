import { useState } from "react";
import { Checkbox } from "@/components/ui/radix";
import { Input, Label, Textarea } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix";
import type { FormFieldDefinition } from "@/lib/types";

interface Props {
  fields: FormFieldDefinition[];
  values: Record<string, string | boolean>;
  onChange: (values: Record<string, string | boolean>) => void;
}

export function DynamicForm({ fields, values, onChange }: Props) {
  const set = (key: string, value: string | boolean) => onChange({ ...values, [key]: value });

  return (
    <div className="space-y-3">
      {fields.map((f) => {
        const id = f.key;
        return (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={id}>
              {f.label}
              {f.required && <span className="text-red-500"> *</span>}
            </Label>
            {f.type === "textarea" && (
              <Textarea
                id={id}
                placeholder={f.placeholder}
                value={(values[id] as string) ?? ""}
                onChange={(e) => set(id, e.target.value)}
              />
            )}
            {f.type === "select" && (
              <Select value={(values[id] as string) ?? ""} onValueChange={(v) => set(id, v)}>
                <SelectTrigger id={id} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(f.options ?? []).map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {f.type === "checkbox" && (
              <div className="space-y-1.5">
                {(f.options ?? ["Yes"]).map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!(values[id] as boolean)}
                      onCheckedChange={(v) => set(id, !!v)}
                    />
                    {o}
                  </label>
                ))}
              </div>
            )}
            {(f.type === "text" || f.type === "email" || f.type === "number" || f.type === "date") && (
              <Input
                id={id}
                type={f.type === "date" ? "date" : f.type}
                placeholder={f.placeholder}
                value={(values[id] as string) ?? ""}
                onChange={(e) => set(id, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}