import { useMemo, useState } from "react";
import { Braces, Plus, Sparkles, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, Button, Card, CardContent, Input, Label, Textarea } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/ui/radix";
import { DynamicForm } from "@/components/common/DynamicForm";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import type { FormFieldDefinition, FormSchema } from "@/lib/types";

const FIELD_TYPES = ["text", "textarea", "select", "number", "date", "email", "checkbox"] as const;

function typeLabel(t: (k: string) => string, type: string): string {
  return t(`studio.type${type.charAt(0).toUpperCase()}${type.slice(1)}`);
}

// Heuristic natural-language parser: maps plain text to a typed JSON schema.
function parsePromptToSchema(prompt: string): FormFieldDefinition[] {
  const lower = prompt.toLowerCase();
  const fields: FormFieldDefinition[] = [];
  const seen = new Set<string>();

  const add = (key: string, label: string, type: FormFieldDefinition["type"], required: boolean, options?: string[]) => {
    if (seen.has(key)) return;
    seen.add(key);
    fields.push({ key, label, type, required, options });
  };

  const has = (words: string[]) => words.some((w) => lower.includes(w));

  if (has(["name", "employee", "full name", "applicant"])) add("full_name", "Full Name", "text", true);
  if (has(["email", "e-mail"])) add("email", "Email Address", "email", true);
  if (has(["phone", "mobile", "contact"])) add("phone", "Phone Number", "text", false);
  if (has(["department", "team", "division"]))
    add("department", "Department", "select", true, ["Marketing", "Sales", "Engineering", "HR", "Finance"]);
  if (has(["priority", "urgency", "severity"]))
    add("priority", "Priority", "select", true, ["Low", "Medium", "High", "Critical"]);
  if (has(["category", "type of", "incident type"]))
    add("category", "Category", "select", false, ["Hardware", "Software", "Network", "Access"]);
  if (has(["start date", "delivery date", "date", "when", "required by", "deadline"]))
    add("date", "Date", "date", has(["required by", "deadline"]));
  if (has(["quantity", "amount", "price", "count", "number of", "total"]))
    add("quantity", "Quantity", "number", true);
  if (has(["model", "item", "equipment", "device"]))
    add("item", "Item / Model", "text", false);
  if (has(["delivery location", "location", "address", "site"]))
    add("location", "Location", "text", false);
  if (has(["justification", "reason", "details", "description", "notes", "additional", "comment"]))
    add("details", "Details", "textarea", false);
  if (has(["equipment", "accessories", "options"]))
    add("options", "Options", "checkbox", false, ["Laptop", "Monitor", "Phone", "Access Card"]);

  // Fallback: always capture a generic description if nothing parsed.
  if (fields.length === 0) {
    add("description", "Describe your request", "textarea", true);
  }

  return fields;
}

export function SchemaStudio() {
  const { t } = useI18n();
  const { currentProfile, saveFormSchema, publishSchemaToCatalog } = useStore();
  const [prompt, setPrompt] = useState("");
  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [previewValues, setPreviewValues] = useState<Record<string, string | boolean>>({});
  const [published, setPublished] = useState<string | null>(null);

  const org = currentProfile.organization_id ?? "org_global";

  const jsonPreview = useMemo(() => {
    const schema: FormSchema = {
      id: "",
      organization_id: org,
      name: formName || "Generated Form",
      schema: fields,
      source_prompt: prompt || null,
      created_at: "",
      updated_at: "",
    };
    return JSON.stringify(schema, null, 2);
  }, [fields, formName, prompt, org]);

  const generate = () => {
    const parsed = parsePromptToSchema(prompt);
    setFields(parsed);
    setPreviewValues({});
    setPublished(null);
    if (!formName.trim()) setFormName(suggestName(prompt));
  };

  const setField = (i: number, patch: Partial<FormFieldDefinition>) => {
    setFields((arr) => arr.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };

  const addField = () =>
    setFields((arr) => [...arr, { key: `field_${arr.length + 1}`, label: "New Field", type: "text", required: false }]);

  const publish = () => {
    const id = uid("fs");
    const schema: FormSchema = {
      id,
      organization_id: org,
      name: formName || "Generated Form",
      schema: fields.map((f) => ({
        ...f,
        options: f.options && f.options.length ? f.options : undefined,
      })),
      source_prompt: prompt || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveFormSchema(schema);
    publishSchemaToCatalog(schema, formName || schema.name);
    setPublished(formName || schema.name);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("studio.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("studio.subtitle")}</p>
      </div>

      {/* Prompt input */}
      <Card className="py-0">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> {t("studio.title")}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("studio.promptPlaceholder")}
              className="min-h-[80px] flex-1"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button onClick={generate} disabled={!prompt.trim()}>
              <Sparkles className="h-4 w-4" /> {t("studio.generate")}
            </Button>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t("studio.formName")}
              className="h-9 w-64"
            />
          </div>
        </CardContent>
      </Card>

      {published && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {t("studio.publishedToCatalog")}: <span className="font-medium">{published}</span>
        </div>
      )}

      {fields.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("studio.generatedSchema")}</h3>
              <Button size="sm" variant="outline" onClick={addField}>
                <Plus className="h-3.5 w-3.5" /> {t("studio.addField")}
              </Button>
            </div>
            {fields.map((f, i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("studio.fieldKey")}</Label>
                    <Input value={f.key} onChange={(e) => setField(i, { key: e.target.value })} className="h-8 font-mono text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">{t("studio.fieldLabel")}</Label>
                    <Input value={f.label} onChange={(e) => setField(i, { label: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="grid w-40 gap-1">
                    <Label className="text-[11px]">{t("studio.fieldType")}</Label>
                    <Select value={f.type} onValueChange={(v) => setField(i, { type: v as FormFieldDefinition["type"] })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((ft) => (
                          <SelectItem key={ft} value={ft}>{typeLabel(t, ft)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <Label className="text-[11px]">{t("studio.requiredField")}</Label>
                    <Switch checked={f.required} onCheckedChange={(v) => setField(i, { required: v })} />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setFields((arr) => arr.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                {(f.type === "select" || f.type === "checkbox") && (
                  <div className="mt-2 space-y-1">
                    <Label className="text-[11px]">{t("studio.options")}</Label>
                    <Input
                      value={(f.options ?? []).join(", ")}
                      onChange={(e) =>
                        setField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Preview + JSON */}
          <div className="space-y-3">
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t("studio.preview")}</h3>
              <div className="rounded-lg border bg-card p-4">
                <DynamicForm fields={fields} values={previewValues} onChange={setPreviewValues} />
              </div>
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Braces className="h-4 w-4" /> {t("studio.schemaPreview")}
              </h3>
              <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed">{jsonPreview}</pre>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={publish}>{t("studio.publish")}</Button>
              <Badge variant="outline">{fields.length} {t("studio.fieldLabel")}</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function suggestName(prompt: string): string {
  const words = prompt.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  return words.slice(0, 3).join(" ") || "Generated Form";
}