import type { AgentCommandResult } from "@/lib/agent-dispatch";

export type DraftQcStatus = "pass" | "warn" | "fail" | "manual";

export type DraftQcItem = {
  id: string;
  label: string;
  status: DraftQcStatus;
  detail?: string;
};

function countPlaceholders(memo: string, pattern: RegExp): number {
  return (memo.match(pattern) ?? []).length;
}

/** Build attorney-facing draft QC checklist from agent result + memo text. */
export function buildDraftQcChecklist(result: AgentCommandResult): DraftQcItem[] {
  const memo = result.fullMemo?.trim() ?? "";
  const items: DraftQcItem[] = [];

  if (typeof result.documentLintPassed === "boolean") {
    items.push({
      id: "linter",
      label: "Document linter (style, chatbot filler, endnotes)",
      status: result.documentLintPassed ? "pass" : "fail",
      detail: result.documentLintIssues?.length
        ? result.documentLintIssues.join("; ")
        : result.documentLintPassed
          ? "Passed BUILD_SPEC §11 checks"
          : "Fix before export",
    });
  } else if (memo) {
    items.push({
      id: "linter",
      label: "Document linter (style, chatbot filler, endnotes)",
      status: "warn",
      detail: "Lint status not returned — export will re-check",
    });
  }

  if (memo) {
    const factNeeded = countPlaceholders(memo, /\[FACT NEEDED\]/gi);
    const citeNeeded = countPlaceholders(memo, /\[CITE NEEDED\]/gi);
    const placeholderTotal = factNeeded + citeNeeded;
    items.push({
      id: "placeholders",
      label: "Fact / cite placeholders",
      status: placeholderTotal === 0 ? "pass" : "warn",
      detail:
        placeholderTotal === 0
          ? "No [FACT NEEDED] or [CITE NEEDED] markers"
          : `${factNeeded} fact + ${citeNeeded} cite placeholders — fill or confirm before filing`,
    });

    const hasSources =
      /sources cited/i.test(memo) || /authorit(y|ies) cited/i.test(memo) || /table of authorities/i.test(memo);
    const looksCited = /\b(INA|Matter of|I-\d+|CFR|U\.S\.C\.)\b/i.test(memo);
    if (looksCited || result.citationVerification || result.draftType?.includes("brief")) {
      items.push({
        id: "sources-list",
        label: "Sources Cited section",
        status: hasSources ? "pass" : "warn",
        detail: hasSources
          ? "Sources list present in draft"
          : "Cited draft should end with a Sources Cited list",
      });
    }
  }

  if (result.citationVerification) {
    const needsAction = /need attorney|verification needed|0 verified/i.test(result.citationVerification);
    items.push({
      id: "citations",
      label: "Citation package",
      status: needsAction ? "warn" : "pass",
      detail: result.citationVerification,
    });
  } else if (result.draftQc?.citationsChecked) {
    items.push({
      id: "citations",
      label: "Citation package",
      status: "pass",
      detail: "Citations extracted / checked in draft metadata",
    });
  }

  const firmApplied =
    typeof result.draftQc?.firmMemoryApplied === "boolean"
      ? result.draftQc.firmMemoryApplied
      : typeof result.firmMemoryApplied === "boolean"
        ? result.firmMemoryApplied
        : null;
  if (firmApplied === true) {
    items.push({
      id: "firm-memory",
      label: "Firm Memory applied",
      status: "pass",
      detail: "Style preferences injected into drafting prompt",
    });
  } else if (firmApplied === false) {
    items.push({
      id: "firm-memory",
      label: "Firm Memory applied",
      status: "warn",
      detail: "Not applied — set tone/samples at Templates → Firm Memory",
    });
  }

  const factsPresent = result.draftQc?.matterFactsPresent;
  if (typeof factsPresent === "boolean") {
    items.push({
      id: "matter-facts",
      label: "Matter facts on file",
      status: factsPresent ? "pass" : "warn",
      detail: factsPresent
        ? "Assessment or matter summary present"
        : "Add case assessment / structured facts for stronger drafts",
    });
  }

  const gaps = (result.gaps ?? []).filter(
    (g) =>
      !g.toLowerCase().startsWith("document linter:") &&
      !g.toLowerCase().startsWith("citation package:") &&
      !g.toLowerCase().includes("attorney review required") &&
      !g.toLowerCase().includes("firm memory not applied"),
  );
  if (gaps.length) {
    items.push({
      id: "gaps",
      label: "Agent-reported gaps",
      status: "warn",
      detail: gaps.slice(0, 3).join("; "),
    });
  }

  items.push({
    id: "attorney-judgment",
    label: "Attorney judgment (legal strategy, posture, client advice)",
    status: "manual",
    detail: "Agents sift formatting, placeholders, and public-source cites — you own legal accuracy",
  });

  items.push({
    id: "firm-voice",
    label: "Firm voice match",
    status: "manual",
    detail: "Edit → Save to Firm Memory if the draft misses house style",
  });

  return items;
}

export function formatDraftQcChecklistText(items: DraftQcItem[]): string {
  const lines = ["Draft QC checklist", "─────────────────"];
  for (const item of items) {
    const mark =
      item.status === "pass" ? "[x]" : item.status === "manual" ? "[ ]" : item.status === "fail" ? "[!]" : "[~]";
    lines.push(`${mark} ${item.label}`);
    if (item.detail) lines.push(`    ${item.detail}`);
  }
  return lines.join("\n");
}
