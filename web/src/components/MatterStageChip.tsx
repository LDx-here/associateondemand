"use client";

import { deriveMatterStage, matterStageTone, type MatterStageInput } from "@/lib/matter-stage";

export function MatterStageChip(props: MatterStageInput & { className?: string }) {
  const stage = deriveMatterStage(props);
  const tone = matterStageTone(stage);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone} ${props.className ?? ""}`}
      title="Matter workflow stage (from assignment status + payment)"
    >
      {stage}
    </span>
  );
}
