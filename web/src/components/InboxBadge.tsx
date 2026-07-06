import Link from "next/link";

import { countSubmittedAssignments, countUnreadInbox } from "@/lib/data-store";

export async function InboxBadge() {
  let open = 0;
  let submitted = 0;
  try {
    [open, submitted] = await Promise.all([countUnreadInbox(), countSubmittedAssignments()]);
  } catch {
    open = 0;
    submitted = 0;
  }
  if (open <= 0 && submitted <= 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {submitted > 0 ? (
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-sky-700"
        >
          {submitted} new
        </Link>
      ) : null}
      {open > 0 ? (
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-700"
        >
          Inbox {open}
        </Link>
      ) : null}
    </div>
  );
}
