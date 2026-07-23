import { redirect } from "next/navigation";

/**
 * The standalone AOS brief builder tool was folded into the normal template +
 * drafting flow. Argument-variant selection now lives in the matter drafting
 * fact guide (`/templates` AOS preview → "Draft with variants" → matter).
 * Kept as a permanent redirect so old links resolve.
 */
export default function AosBriefBuilderRedirect() {
  redirect("/templates");
}
