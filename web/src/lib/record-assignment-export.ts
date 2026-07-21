import { markAssignmentDelivered } from "@/lib/data-store";

/** After a successful DOCX/ZIP export, mark the linked assignment Delivered. */
export async function recordAssignmentExport(
  assignmentId: string | undefined,
  exportKind: string,
): Promise<{ delivered: boolean; reason?: string }> {
  const id = assignmentId?.trim();
  if (!id) return { delivered: false, reason: "No assignmentId provided." };

  const item = await markAssignmentDelivered(id, { exportKind, by: "Attorney" });
  if (!item) return { delivered: false, reason: "Assignment not found or not approved." };
  return { delivered: true };
}
