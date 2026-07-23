import { Suspense } from "react";

import AosBriefBuilderClient from "./AosBriefBuilderClient";

export default function AosBriefBuilderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading AOS brief builder…</div>}>
      <AosBriefBuilderClient />
    </Suspense>
  );
}
