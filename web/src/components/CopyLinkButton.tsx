"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/Toast";
import { btnSecondary } from "@/lib/ui-classes";

export function CopyLinkButton({
  url,
  label = "Copy link",
}: {
  url: string;
  label?: string;
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("Partner submission link copied.", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Could not copy — select the URL manually.", "error");
    }
  }

  return (
    <button type="button" className={`${btnSecondary} inline-flex items-center gap-2 text-sm`} onClick={() => void copy()}>
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}
