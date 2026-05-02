import { cn } from "@/lib/utils";

interface WinProbBadgeProps {
  probability: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function WinProbBadge({ probability, className, size = "md" }: WinProbBadgeProps) {
  let tone = "bg-slate-700/40 text-slate-300 border-slate-600/40";
  if (probability >= 70) tone = "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  else if (probability >= 60) tone = "bg-lime-500/15 text-lime-300 border-lime-500/40";
  else if (probability >= 50) tone = "bg-amber-500/15 text-amber-300 border-amber-500/40";
  else tone = "bg-red-500/15 text-red-300 border-red-500/40";

  const sizing =
    size === "lg" ? "px-3 py-1 text-sm" :
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" :
    "px-2 py-0.5 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold rounded-full border tabular-nums",
        tone,
        sizing,
        className,
      )}
      title={`Model estimates a ${probability}% chance the recommended side hits`}
    >
      {probability}%
    </span>
  );
}
