/**
 * Smart template field maps — editable regions vs built-in / firm-editable structure.
 * Document assembly model: matter facts + firm profile fill {{merge_fields}} into template outline.
 */

import {
  getDeliverableTemplateSpec,
  lockKindForSection,
  SECTION_LOCK_LABELS,
  specForTemplateFieldMap,
  type DeliverableTemplateSpec,
  type SectionLockKind,
} from "./deliverable-template-specs";
import {
  formatFirmLetterhead,
  getFirmLetterhead,
  letterheadMergeValues,
  type FirmLetterheadProfile,
} from "./firm-letterhead";
import { fillMergeFields } from "./merge-fields";

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
  /**
   * Structure sections — labeled by lock kind (not all truly immutable).
   * Firm letterhead + certificate are firm-editable via Settings.
   */
  boilerplateSections: string[];
  /** Static sample asset under web/public (PDF or HTML) — default system blank only. */
  sampleAssetPath?: string;
};

/** Telephonic / records request — common immigration overflow SKU. */
export const TELEPHONIC_REQUEST_FIELD_MAP: TemplateFieldMap = {
  id: "telephonic-records-request",
  name: "Telephonic records request",
  description:
    "Request sheet for telephonic hearing or records submission. Fill client fields; letterhead and certificate pull from Settings → Firm profile. Upload firm DOCX to replace the default system outline.",
  deliverableId: "hearing-packet",
  practiceArea: "immigration",
  sampleAssetPath: "/templates/telephonic-records-request.html",
  boilerplateSections: [
    "Firm letterhead block",
    "Statutory authority / regulatory cite",
    "Certificate of service",
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
      label: "Contact phone",
      type: "text",
      section: "Service",
      editable: true,
    },
    {
      id: "method",
      label: "Service method",
      type: "select",
      section: "Service",
      editable: true,
      options: ["Email", "Fax", "Mail", "Hand delivery", "ECF / electronic filing"],
    },
    {
      id: "parties_served",
      label: "Parties served",
      placeholder: "Opposing counsel / DHS / EOIR clerk — name and address or email",
      type: "textarea",
      section: "Service",
      editable: true,
    },
  ],
};

export const COVER_LETTER_FIELD_MAP: TemplateFieldMap = {
  id: "cover-letter",
  name: "Cover letter",
  description:
    "Filing-package cover letter — editable addressee and RE line; letterhead and signature from Firm profile.",
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
    "CREAC assembly: Rule/Explanation preserved from firm template; Analysis filled from matter facts ({{qualifying_relative}}, {{hardship_facts}}, …).",
  deliverableId: "aos-discretionary-brief",
  practiceArea: "immigration",
  boilerplateSections: [
    "Conclusion (opening)",
    "Rule",
    "Explanation",
    "Analysis",
    "Conclusion (closing)",
    "Certificate of service",
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
      id: "qualifying_relative",
      label: "Qualifying relative",
      placeholder: "{{qualifying_relative}}",
      type: "textarea",
      section: "Analysis",
      editable: true,
    },
    {
      id: "hardship_facts",
      label: "Hardship facts",
      placeholder: "{{hardship_facts}}",
      type: "textarea",
      section: "Analysis",
      editable: true,
    },
    {
      id: "positive_equities",
      label: "Positive discretionary factors",
      placeholder: "{{positive_equities}} — family ties, community service, rehabilitation…",
      type: "textarea",
      section: "Analysis",
      editable: true,
    },
    {
      id: "adverse_factors",
      label: "Response to negative factors",
      placeholder: "{{adverse_factors}}",
      type: "textarea",
      section: "Analysis",
      editable: true,
    },
    {
      id: "method",
      label: "Service method",
      type: "select",
      section: "Certificate of service",
      editable: true,
      options: ["Email", "Fax", "Mail", "Hand delivery", "ECF / electronic filing"],
    },
    {
      id: "parties_served",
      label: "Parties served",
      placeholder: "DHS counsel / USCIS — name and address",
      type: "textarea",
      section: "Certificate of service",
      editable: true,
    },
    {
      id: "conclusion",
      label: "Conclusion (optional override)",
      placeholder: "Leave blank to use standard conclusion from outline",
      type: "textarea",
      section: "Conclusion",
      editable: true,
    },
  ],
};

export const DEMAND_LETTER_FIELD_MAP: TemplateFieldMap = {
  id: "demand-letter",
  name: "Demand letter",
  description:
    "Personal injury demand — damages and deadline editable; letterhead from Firm profile.",
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

function isLetterheadSection(section: string): boolean {
  return /letterhead/i.test(section);
}

function isCertificateSection(section: string): boolean {
  return /certificate of service|service instruction/i.test(section);
}

/** Resolve section preview from firm profile + merge fields (never fake invented letterhead). */
export function resolveSectionPreview(
  section: string,
  spec: DeliverableTemplateSpec | undefined,
  values: Record<string, string>,
  firm?: FirmLetterheadProfile,
): { text: string; lockKind: SectionLockKind; lockLabel: string } {
  const lockKind = lockKindForSection(spec, section);
  const lockLabel = SECTION_LOCK_LABELS[lockKind];
  const profile = firm ?? (typeof window !== "undefined" ? getFirmLetterhead() : undefined);
  const mergeBase = {
    ...letterheadMergeValues(profile),
    ...values,
  };

  if (isLetterheadSection(section)) {
    return {
      text: formatFirmLetterhead(profile),
      lockKind: "firm_editable",
      lockLabel: SECTION_LOCK_LABELS.firm_editable,
    };
  }

  if (isCertificateSection(section)) {
    const cert =
      profile?.certificateOfService?.trim() ||
      spec?.boilerplatePreviews[section] ||
      spec?.boilerplatePreviews["Certificate of service"] ||
      "";
    return {
      text: fillMergeFields(cert, mergeBase),
      lockKind: "firm_editable",
      lockLabel: SECTION_LOCK_LABELS.firm_editable,
    };
  }

  const raw = spec?.boilerplatePreviews[section] ?? "";
  return {
    text: fillMergeFields(raw, mergeBase),
    lockKind,
    lockLabel,
  };
}

/** Render filled template as structured note with deliverable-specific header (document assembly). */
export function renderFilledTemplate(
  map: TemplateFieldMap,
  values: Record<string, string>,
  options?: { firm?: FirmLetterheadProfile },
): string {
  const spec = resolveSpec(map);
  const firm = options?.firm ?? (typeof window !== "undefined" ? getFirmLetterhead() : undefined);
  const lines: string[] = [];

  const headerLines = formatMemoHeader(spec, values);
  if (headerLines.length) {
    lines.push(...headerLines);
  } else {
    lines.push(`# ${map.name}`, "");
  }

  for (const section of map.boilerplateSections) {
    const resolved = resolveSectionPreview(section, spec, values, firm);
    const tag =
      resolved.lockKind === "firm_editable"
        ? `[Firm profile — ${section}]`
        : resolved.lockKind === "skill_preserve"
          ? `[Preserve — ${section}]`
          : `[Built-in structure — ${section}]`;
    lines.push(tag);
    if (resolved.text) lines.push(resolved.text);
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

/** Count of structure sections that are firm-editable vs built-in (for catalog copy). */
export function structureSectionCounts(map: TemplateFieldMap): {
  firmEditable: number;
  builtIn: number;
  preserve: number;
} {
  const spec = resolveSpec(map);
  let firmEditable = 0;
  let builtIn = 0;
  let preserve = 0;
  for (const section of map.boilerplateSections) {
    const kind = isLetterheadSection(section) || isCertificateSection(section)
      ? "firm_editable"
      : lockKindForSection(spec, section);
    if (kind === "firm_editable") firmEditable += 1;
    else if (kind === "skill_preserve") preserve += 1;
    else builtIn += 1;
  }
  return { firmEditable, builtIn, preserve };
}
