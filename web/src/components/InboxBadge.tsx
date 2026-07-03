import Link from "next/link";

import { countUnreadInbox } from "@/lib/data-store";

export async function InboxBadge() {
  let count = 0;
  try {
    count = await countUnreadInbox();
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
