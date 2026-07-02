import Link from "next/link";

import { listInboxItems } from "@/lib/data-store";

const OPEN_STATUSES = new Set(["Pending", "Submitted", "In Progress", "Ready for Review"]);

export async function InboxBadge() {
  let count = 0;
  try {
    const items = await listInboxItems();
    count = items.filter((item) => OPEN_STATUSES.has(item.status)).length;
  } catch {
    count = 0;
  }
  if (count <= 0) return null;

  return (
    <Link
      href="/inbox"
      className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-700"
    >
      Inbox {count}
    </Link>
  );
}
