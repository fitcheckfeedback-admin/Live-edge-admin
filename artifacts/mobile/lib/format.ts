export function relTime(iso: string): string {
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) return "";
  const sec = Math.max(0, Math.round((Date.now() - d) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  // The slate includes today + tomorrow's games, so the date prefix is
  // critical — without it, tomorrow's afternoon games look like yesterday's
  // afternoon games. Day comparison is done in the user's LOCAL timezone so
  // a 10pm PT game whose UTC date is already +1 still reads as "Today".
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const gameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (gameDay.getTime() === today.getTime()) return `Today ${time}`;
  if (gameDay.getTime() === tomorrow.getTime()) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

export function todayLabel(): string {
  return new Date().toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
