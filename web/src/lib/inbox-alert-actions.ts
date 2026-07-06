/**
 * Maps legacy PM Inbox option strings (Approve / Reject / Modify / Defer) and
 * custom agent-provided labels into consistent workflow actions for the UI.
 */

export type AlertActionVariant = "primary" | "secondary" | "muted";

export type AlertAction = {
  /** Raw option stored on the inbox row and sent to the resolve API. */
  option: string;
  /** Button label shown in the card. */
  label: string;
  /** Modal title when the attorney picks this action. */
  title: string;
  /** One-line helper under the modal title. */
  subtitle: string;
  variant: AlertActionVariant;
  noteRequired: boolean;
  noteLabel: string;
  notePlaceholder: string;
  /** Resolved → agent may resume; Dismissed → archived without resume. */
  resolvedStatus: "Resolved" | "Dismissed";
  /** Triggers PM dispatch resume on the resolve API when true. */
  resumesAgent: boolean;
};

const DEFAULT_OPTIONS = ["Approve", "Reject", "Modify", "Defer"] as const;

function normalizeKey(option: string): string {
  return option.trim().toLowerCase();
}

function configFor(option: string): AlertAction {
  const key = normalizeKey(option);
  if (key.startsWith("approve") || key.startsWith("accept")) {
    return {
      option,
      label: "Resume agent",
      title: "Resume agent",
      subtitle: "Agent will continue with your guidance. Optional note is passed to PM dispatch.",
      variant: "primary",
      noteRequired: false,
      noteLabel: "Guidance for agent (optional)",
      notePlaceholder: "e.g. Use the March 2024 pay stubs; proceed with discretionary factors section.",
      resolvedStatus: "Resolved",
      resumesAgent: true,
    };
  }
  if (key.startsWith("reject") || key.startsWith("dismiss")) {
    return {
      option,
      label: "Dismiss alert",
      title: "Dismiss alert",
      subtitle: "Archive this flag without resuming the agent. Use when the issue is already handled.",
      variant: "muted",
      noteRequired: false,
      noteLabel: "Reason (optional)",
      notePlaceholder: "e.g. Already corrected in matter notes — no agent action needed.",
      resolvedStatus: "Dismissed",
      resumesAgent: false,
    };
  }
  if (key.startsWith("modify") || key.startsWith("revise") || key.startsWith("return")) {
    return {
      option,
      label: "Provide guidance",
      title: "Provide guidance",
      subtitle: "Send specific instructions back to the agent before it continues.",
      variant: "secondary",
      noteRequired: true,
      noteLabel: "Guidance for agent (required)",
      notePlaceholder: "What should the agent do differently?",
      resolvedStatus: "Resolved",
      resumesAgent: true,
    };
  }
  if (key.startsWith("defer")) {
    return {
      option,
      label: "Defer to later",
      title: "Defer to later",
      subtitle: "Park this alert until you have time to review. It moves to alert history.",
      variant: "muted",
      noteRequired: false,
      noteLabel: "Reminder note (optional)",
      notePlaceholder: "e.g. Revisit after client sends updated I-94.",
      resolvedStatus: "Dismissed",
      resumesAgent: false,
    };
  }
  return {
    option,
    label: option,
    title: `Resolve: ${option}`,
    subtitle: "Add a note so the resolution is recorded on the matter timeline.",
    variant: "secondary",
    noteRequired: true,
    noteLabel: "Resolution note (required)",
    notePlaceholder: "What did you decide?",
    resolvedStatus: "Resolved",
    resumesAgent: key.startsWith("approve"),
  };
}

export function alertActionsForItem(options: string[]): AlertAction[] {
  const source = options.length > 0 ? options : [...DEFAULT_OPTIONS];
  return source.map(configFor);
}

export function alertActionLabel(status: "Resolved" | "Dismissed"): string {
  return status === "Dismissed" ? "Dismissed" : "Resolved";
}
