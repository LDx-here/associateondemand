/**
 * Honest labeling for OCR pipeline confidence scores.
 * The API returns `(ocr_engine_confidence + text_quality_heuristic) / 2` —
 * not verified legal fact accuracy.
 */

export type OcrConfidenceDisplay = {
  /** Short label for tables and progress rows */
  shortLabel: string;
  /** Full label for detail panels */
  label: string;
  /** Attorney-facing explanation */
  tooltip: string;
  percent: number;
};

export function formatOcrConfidence(score: number | null | undefined): OcrConfidenceDisplay | null {
  if (score == null || Number.isNaN(score)) return null;
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return {
    percent,
    shortLabel: `OCR ${percent}%`,
    label: `OCR confidence: ${percent}%`,
    tooltip:
      "Average of OCR engine confidence and text-quality heuristic (character ratio, word count). " +
      "This is not verified legal fact accuracy — review extracted facts before drafting.",
  };
}

export function factVerificationStats(
  facts: Array<{ verified?: boolean }> | null | undefined,
): { verified: number; total: number; percent: number } {
  const list = facts ?? [];
  const total = list.length;
  if (total === 0) return { verified: 0, total: 0, percent: 0 };
  const verified = list.filter((f) => f.verified).length;
  return { verified, total, percent: Math.round((verified / total) * 100) };
}
