/**
 * Smart template field maps — editable regions vs locked boilerplate.
 * Extend via Firm Memory upload + optional LLM detection on sample docs.
 */

import {
  getDeliverableTemplateSpec,
  specForTemplateFieldMap,
  type DeliverableTemplateSpec,
} from "./deliverable-template-specs";

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
  /** Static sample asset under web/public (PDF or HTML). */
  sampleAssetPath?: string;
};

/** Telephonic / records request — common immigration overflow SKU. */
export const TELEPHONIC_REQUEST_FIELD_MAP: TemplateFieldMap = {
  id: "telephonic-records-request",
  name: "Telephonic records request",
  description:
    "Request sheet for telephonic hearing or records submission. Editable fields are client-specific; RMV header and statutory boilerplate stay locked.",
  deliverableId: "hearing-packet",
  practiceArea: "immigration",
  sampleAssetPath: "/templates/telephonic-records-request.html",
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

export const COVER_LETTER_FIELD_MAP: TemplateFieldMap = {
  id: "cover-letter",
  name: "Cover letter",
  description: "Filing-package cover letter — editable addressee and RE line; letterhead and signature block locked.",
  deliverableId: "cover-letter",
  practiceArea: "immigration",
  boilerplateSections: ["Letterhead", "Addressee block", "Signature block"],
  editableFields: [
    {
      id: "client_name",
      label: "Client name",
      type: "text",
      section: "Header",
      editable: true,
      autofillFrom: "client_name",
    },
    {
      id: "a_number",
      label: "A-Number",
      type: "text",
      section: "Header",
      editable: true,
      autofillFrom: "a_number",
    },
    {
      id: "addressee",
      label: "Addressee (office / service center)",
      placeholder: "USCIS Nebraska Service Center",
      type: "text",
      section: "Header",
      editable: true,
    },
    {
      id: "filing_description",
      label: "Package description",
      placeholder: "I-485 adjustment package with supporting exhibits A–F",
      type: "textarea",
      section: "Body",
      editable: true,
    },
    {
      id: "exhibit_list",
      label: "Exhibit list",
      placeholder: "Exhibit A: I-485\nExhibit B: I-765",
      type: "textarea",
      section: "Body",
      editable: true,
    },
  ],
};

export const AOS_BRIEF_FIELD_MAP: TemplateFieldMap = {
  id: "aos-discretionary-brief",
  name: "AOS discretionary brief",
  description:
    "Adjustment-of-status discretionary factors brief. Caption and PM-602-0199 framing locked; factor narratives editable.",
  deliverableId: "aos-discretionary-brief",
  practiceArea: "immigration",
  boilerplateSections: [
    "Conclusion (opening)",
    "Rule (preserve from firm template)",
    "Explanation (preserve / light tweak)",
    "Analysis (matter facts)",
    "Conclusion (closing)",
  ],
  editableFields: [
    {
      id: "client_name",
      label: "Client name",
      type: "text",
      section: "Caption",
      editable: true,
      autofillFrom: "client_name",
    },
    {
      id: "a_number",
      label: "A-Number",
      type: "text",
      section: "Caption",
      editable: true,
      autofillFrom: "a_number",
    },
    {
      id: "case_theme",
      label: "Case theme / RE line",
      placeholder: "Discretionary factors — positive equities",
      type: "text",
      section: "Caption",
      editable: true,
    },
    {
      id: "positive_factors",
      label: "Positive discretionary factors",
      placeholder: "Family ties, community service, rehabilitation…",
      type: "textarea",
      section: "Analysis",
      editable: true,
    },
    {
      id: "negative_factors_response",
      label: "Response to negative factors",
      placeholder: "Address any adverse history with context and rehabilitation",
      type: "textarea",
      section: "Analysis",
      editable: true,
    },
    {
      id: "conclusion",
      label: "Conclusion (optional override)",
      placeholder: "Leave blank to use standard conclusion boilerplate",
      type: "textarea",
      section: "Conclusion",
      editable: true,
    },
  ],
};

export const DEMAND_LETTER_FIELD_MAP: TemplateFieldMap = {
  id: "demand-letter",
  name: "Demand letter",
  description: "Personal injury demand — damages and deadline editable; letterhead and demand paragraph structure locked.",
  deliverableId: "demand-letter",
  practiceArea: "personal_injury",
  boilerplateSections: ["Letterhead", "Demand paragraph", "Damages summary", "Deadline / response"],
  editableFields: [
    {
      id: "client_name",
      label: "Client name",
      type: "text",
      section: "Header",
      editable: true,
      autofillFrom: "client_name",
    },
    {
      id: "incident_date",
      label: "Incident date",
      type: "date",
      section: "Facts",
      editable: true,
    },
    {
      id: "damages_summary",
      label: "Damages summary",
      placeholder: "Medical: $X; Lost wages: $Y; Pain and suffering: $Z",
      type: "textarea",
      section: "Damages",
      editable: true,
    },
    {
      id: "demand_amount",
      label: "Demand amount",
      placeholder: "$150,000",
      type: "text",
      section: "Damages",
      editable: true,
    },
    {
      id: "response_deadline",
      label: "Response deadline (days)",
      placeholder: "30",
      type: "text",
      section: "Deadline",
      editable: true,
    },
  ],
};

export const TEMPLATE_FIELD_MAPS: TemplateFieldMap[] = [
  TELEPHONIC_REQUEST_FIELD_MAP,
  COVER_LETTER_FIELD_MAP,
  AOS_BRIEF_FIELD_MAP,
  DEMAND_LETTER_FIELD_MAP,
];

export function getTemplateFieldMap(id: string): TemplateFieldMap | undefined {
  return TEMPLATE_FIELD_MAPS.find((m) => m.id === id);
}

export function listTemplateFieldMaps(): TemplateFieldMap[] {
  return [...TEMPLATE_FIELD_MAPS];
}

export function getTemplateFieldMapByDeliverable(deliverableId: string): TemplateFieldMap | undefined {
  const spec = getDeliverableTemplateSpec(deliverableId);
  if (spec?.templateFieldMapId) return getTemplateFieldMap(spec.templateFieldMapId);
  return TEMPLATE_FIELD_MAPS.find((m) => m.deliverableId === deliverableId);
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

function resolveSpec(map: TemplateFieldMap): DeliverableTemplateSpec | undefined {
  return specForTemplateFieldMap(map.id) ?? (map.deliverableId ? getDeliverableTemplateSpec(map.deliverableId) : undefined);
}

function formatMemoHeader(spec: DeliverableTemplateSpec | undefined, values: Record<string, string>): string[] {
  if (!spec?.memoHeader) return [];
  const client = values.client_name?.trim() || "[Client Name]";
  const aNum = values.a_number?.trim();
  const reParts = [spec.memoHeader.rePrefix, client];
  if (aNum) reParts.push(`A-Number ${aNum}`);
  const matter = values.matter_id?.trim();
  if (matter) reParts.push(`Matter ${matter}`);

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return [
    spec.memoHeader.title,
    "",
    "TO:          [Attorney of Record]",
    "",
    "FROM:     Litigation Associate",
    "",
    `DATE:      ${today}`,
    "",
    `RE:          ${reParts.join(" - ")}`,
    "",
    "-".repeat(40),
    "",
  ];
}

/** Render filled template as structured note with deliverable-specific header. */
export function renderFilledTemplate(
  map: TemplateFieldMap,
  values: Record<string, string>,
): string {
  const spec = resolveSpec(map);
  const lines: string[] = [];

  const headerLines = formatMemoHeader(spec, values);
  if (headerLines.length) {
    lines.push(...headerLines);
  } else {
    lines.push(`# ${map.name}`, "");
  }

  for (const section of map.boilerplateSections) {
    const preview = spec?.boilerplatePreviews[section];
    lines.push(`[Locked - ${section}]`);
    if (preview) lines.push(preview);
    lines.push("");
  }

  let currentSection = "";
  for (const field of map.editableFields) {
    if (!field.editable) continue;
    if (field.section !== currentSection) {
      currentSection = field.section;
      lines.push(`## ${currentSection}`, "");
    }
    const val = (values[field.id] ?? "").trim() || field.placeholder || "[not provided]";
    lines.push(`${field.label}: ${val}`, "");
  }

  lines.push("---", "Attorney review required before filing or client communication.");
  return lines.join("\n").trim();
}

export function sampleAssetPathForMap(map: TemplateFieldMap): string | undefined {
  return map.sampleAssetPath ?? resolveSpec(map)?.sampleAssetPath;
}
