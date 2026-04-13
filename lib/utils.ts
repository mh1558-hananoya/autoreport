/**
 * レポート対象月（前月）のyear-monthを返す
 * 例: 2026年4月 → "2026-03"
 */
export function getReportTargetMonth(now?: Date): string {
  const d = now || new Date();
  const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const month = d.getMonth() === 0 ? 12 : d.getMonth(); // getMonth() is 0-indexed
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * "2026-03" → "3月度"
 */
export function formatMonthLabel(yearMonth: string): string {
  const m = parseInt(yearMonth.split('-')[1], 10);
  return `${m}月度`;
}
