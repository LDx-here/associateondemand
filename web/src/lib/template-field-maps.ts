/**
 * Smart template field maps — editable regions vs locked boilerplate.
 * Extend via Firm Memory upload + optional LLM detection on sample docs.
 */

export type TemplateFieldType = "text" | "textarea" | "date" | "select";

export type TemplateEditableField = {
  id: string;
  label: string;
  placeholder?: string;
  type: TemplateFieldType;
  /** UI section grouping (e.g. "Header", "Request body") */
  section: string;
  /** When true, shown as customizable; false = boilerplate (display only). */
  editable: boolean;
  options?: string[];
  /** Maps to practice-area-facts or matter profile keys for autofill. */
  autofillFrom?: "client_name" | "a_number" | "matter_id" | "court" | "hearing_date" | "firm_name";
};

export type TemplateFieldMap = {
  id: string;
  name: string;
  description: string;
  /** Deliverable catalog id when wired; optional for firm-uploaded samples. */
  deliverableId?: string;
  practiceArea?: string;
  editableFields: TemplateEditableField[];
  /** Locked sections — structure preserved, not edited in apply flow. */
  boilerplateSections: string[];
};

/** Telephonic / records request — common immigration overflow SKU. */
export const TELEPHONIC_REQUEST_FIELD_MAP: TemplateFieldMap = {
  id: "telephonic-records-request",
  name: "Telephonic records request",
  description:
    "Request sheet for telephonic hearing or records submission. Editable fields are client-specific; RMV header and statutory boilerplate stay locked.",
  deliverableId: "hearing-packet",
  practiceArea: "immigration",
  boilerplateSections: [
    "Firm letterhead block",
    "Statutory authority / regulatory cite",
    "Service instructions footer",
  ],
  editableFields: [
    {
      id: "client_name",
      label: "Client name",
      placeholder: "Full legal name",
      type: "text",
      section: "Header",
      editable: true,
      autofillFrom: "client_name",
    },
    {
      id: "a_number",
      label: "A-Number",
      placeholder: "A########",
      type: "text",
      section: "Header",
      editable: true,
      autofillFrom: "a_number",
    },
    {
      id: "matter_id",
      label: "Matter / file number",
      type: "text",
      section: "Header",
      editable: true,
      autofillFrom: "matter_id",
    },
    {
      id: "hearing_date",
      label: "Hearing date",
      type: "date",
      section: "Request body",
      editable: true,
      autofillFrom: "hearing_date",
    },
    {
      id: "records_requested",
      label: "Records requested",
      placeholder: "List documents or categories (e.g. I-589, medical records, country conditions packet)",
      type: "textarea",
      section: "Request body",
      editable: true,
    },
    {
      id: "deadline",
      label: "Response deadline",
      type: "date",
      section: "Request body",
      editable: true,
    },
    {
      id: "contact_phone",
      label: "RMV contact phone",
      type: "text",
      section: "Service",
      editable: true,
    },
    {
      id: "service_method",
      label: "Service method",
      type: "select",
      section: "Service",
      editable: true,
      options: ["Email", "Fax", "Mail", "Hand delivery"],
    },
  ],
};

export const TEMPLATE_FIELD_MAPS: TemplateFieldMap[] = [TELEPHONIC_REQUEST_FIELD_MAP];

export function getTemplateFieldMap(id: string): TemplateFieldMap | undefined {
  return TEMPLATE_FIELD_MAPS.find((m) => m.id === id);
}

export function listTemplateFieldMaps(): TemplateFieldMap[] {
  return [...TEMPLATE_FIELD_MAPS];
}

export function editableFieldsForMap(map: TemplateFieldMap): TemplateEditableField[] {
  return map.editableFields.filter((f) => f.editable);
}

/** Merge saved profile + matter hints into field values. */
export function buildTemplateFieldDefaults(
  map: TemplateFieldMap,
  sources: {
    profileValues?: Record<string, string>;
    matterHints?: Partial<Record<NonNullable<TemplateEditableField["autofillFrom"]>, string>>;
  },
): Record<string, string> {
  const out: Record<string, string> = { ...(sources.profileValues ?? {}) };
  for (const field of editableFieldsForMap(map)) {
    if (out[field.id]?.trim()) continue;
    const hint = field.autofillFrom ? sources.matterHints?.[field.autofillFrom] : undefined;
    if (hint?.trim()) out[field.id] = hint.trim();
  }
  return out;
}

/** Render filled template as structured note (DOCX generation deferred). */
export function renderFilledTemplate(
  map: TemplateFieldMap,
  values: Record<string, string>,
): string {
  const lines: string[] = [
    `# ${map.name}`,
    "",
    ...map.boilerplateSections.map((s) => `[Boilerplate — locked] ${s}`),
    "",
  ];
  let section = "";
  for (const field of map.editableFields) {
    if (field.section !== section) {
      section = field.section;
      lines.push(`## ${section}`, "");
    }
    const val = (values[field.id] ?? "").trim() || field.placeholder || "—";
    if (field.editable) {
      lines.push(`**${field.label}:** ${val}`, "");
    }
  }
  return lines.join("\n").trim();
}
