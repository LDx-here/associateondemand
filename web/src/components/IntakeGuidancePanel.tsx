"use client";

import { AlertTriangle, Bot, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

import {
  buildIntakeGuidanceMessages,
  type IntakeGuidanceMessage,
} from "@/lib/intake-prefill";
import type { DraftingFactsPayload } from "@/lib/practice-area-facts";

type Props = {
  deliverableId: string;
  deliverableName?: string;
  caseType: string;
  structuredFacts: DraftingFactsPayload | null;
  ocrPrefillCount?: number;
  onFocusField?: (fieldId: string) => void;
};

function MessageBubble({ message }: { message: IntakeGuidanceMessage }) {
  const isAssistant = message.role === "assistant";
  const Icon =
    message.tone === "warning" ? AlertTriangle : message.tone === "success" ? CheckCircle2 : Bot;

  const toneClass =
    message.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : message.tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`flex gap-2 ${isAssistant ? "" : "opacity-90"}`}>
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isAssistant ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-600"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className={`max-w-prose rounded-lg border px-3 py-2 text-sm leading-relaxed ${toneClass}`}>
        <p>{message.text}</p>
        {message.fieldIds?.length ? (
          <p className="mt-1 text-xs opacity-80">Scroll to the highlighted fields below.</p>
        ) : null}
      </div>
    </div>
  );
}

/** Chat-style guidance layer on assignment intake (Phase 2). Form remains submit backbone. */
export function IntakeGuidancePanel({
  deliverableId,
  deliverableName,
  caseType,
  structuredFacts,
  ocrPrefillCount = 0,
}: Props) {
  const messages = useMemo(
    () =>
      buildIntakeGuidanceMessages({
        deliverableId: deliverableId === "custom-other-free-text" ? undefined : deliverableId,
        deliverableName,
        caseType,
        structuredFacts,
        ocrPrefillCount,
      }),
    [deliverableId, deliverableName, caseType, structuredFacts, ocrPrefillCount],
  );

  if (messages.length === 0) return null;

  return (
    <section
      className="space-y-3 rounded-lg border border-sky-100 bg-gradient-to-b from-sky-50/80 to-white p-4 shadow-sm"
      aria-label="Intelligent intake guidance"
    >
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-sky-800" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-900">Intelligent intake assistant</h2>
      </div>
      <div className="space-y-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
    </section>
  );
}
