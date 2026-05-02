import { cn } from "@/lib/utils";

export function PulseDot({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-3 w-3", className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
    </div>
  );
}
