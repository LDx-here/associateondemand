"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useToast } from "@/components/Toast";

/** Shows toast when returning from Stripe Checkout success/cancel URLs. */
export function PaymentToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const payment = searchParams.get("payment");
    const matterId = searchParams.get("matterId");
    if (!payment) return;

    if (payment === "success") {
      showToast(
        matterId
          ? `Payment received for ${matterId}. RMV is starting work on your assignment.`
          : "Payment received. RMV is starting work on your assignment.",
        "success",
      );
    } else if (payment === "cancelled") {
      showToast("Checkout cancelled — your assignment is saved and awaiting payment.", "error");
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    url.searchParams.delete("matterId");
    router.replace((url.pathname + (url.search ? url.search : "")) as "/inbox");
  }, [searchParams, router, showToast]);

  return null;
}
