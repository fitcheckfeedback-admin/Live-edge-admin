/**
 * Format a game's ISO start time for display in the user's local timezone.
 *
 * Returns labels like:
 *   - "Today 7:07 PM"
 *   - "Tomorrow 4:05 PM"
 *   - "Sat 3:07 PM"   (any further date)
 *   - ""              (missing/invalid input)
 *
 * The board shows today + tomorrow's slate, so "Today" vs "Tomorrow" is the
 * critical distinction — without it tomorrow's afternoon games look like
 * yesterday's afternoon games (since only the time was shown previously).
 *
 * Day classification is done in the user's LOCAL timezone via toDateString()
 * so a 10pm PT game on May 8 still says "Today" even though its UTC date
 * is already May 9.
 */
export function formatGameTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const gameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (gameDay.getTime() === today.getTime()) return `Today ${time}`;
  if (gameDay.getTime() === tomorrow.getTime()) return `Tomorrow ${time}`;

  const weekday = d.toLocaleDateString([], { weekday: "short" });
  return `${weekday} ${time}`;
}
