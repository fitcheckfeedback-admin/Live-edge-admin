import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EdgeBadgeProps {
  score: number;
  className?: string;
}

export function EdgeBadge({ score, className }: EdgeBadgeProps) {
  let colorClass = "bg-destructive text-destructive-foreground";
  if (score >= 8) {
    colorClass = "bg-primary text-primary-foreground";
  } else if (score >= 6) {
    colorClass = "bg-accent text-accent-foreground";
  }

  return (
    <Badge className={cn(colorClass, "font-bold px-2 py-0.5 text-xs", className)}>
      {score.toFixed(1)} EDGE
    </Badge>
  );
}
