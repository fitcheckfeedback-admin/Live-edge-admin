import { useState } from "react";
import { useGetBestProps } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EdgeBadge } from "@/components/EdgeBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SPORTS = ["ALL", "NBA", "MLB"] as const;

function PlayerAvatar({ src, name }: { src?: string; name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="relative w-14 h-14 shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-14 h-14 rounded-lg object-cover object-top bg-muted"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
            const fb = el.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="w-14 h-14 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 items-center justify-center text-white font-bold text-sm border border-white/10"
        style={{ display: src ? "none" : "flex" }}
      >
        {initials}
      </div>
    </div>
  );
}

function TeamLogo({ src, abbr }: { src?: string; abbr: string }) {
  if (!src) return <span className="text-[10px] font-bold text-muted-foreground">{abbr}</span>;
  return (
    <img
      src={src}
      alt={abbr}
      className="w-5 h-5 object-contain"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function RecommendationColor(rec: string) {
  if (rec.includes("Strong Over")) return "text-emerald-400 font-bold";
  if (rec.includes("Lean Over"))   return "text-emerald-300";
  if (rec.includes("Strong Under")) return "text-red-400 font-bold";
  if (rec.includes("Lean Under"))  return "text-red-300";
  return "text-muted-foreground";
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    "Strong Play": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "Lean":        "bg-amber-500/20  text-amber-400  border-amber-500/30",
    "Avoid":       "bg-slate-500/20  text-slate-400  border-slate-500/30",
    "Trap Line":   "bg-red-500/20    text-red-400    border-red-500/30",
  };
  return (
    <span className={cn("text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border", styles[action] ?? styles["Avoid"])}>
      {action}
    </span>
  );
}

export default function PicksTab() {
  const [sportFilter, setSportFilter] = useState<string>("ALL");

  const { data, isLoading } = useGetBestProps(
    sportFilter !== "ALL" ? { sport: sportFilter as any } : undefined,
    { query: { queryKey: ["/api/props/best", sportFilter] } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 flex-wrap">
        {SPORTS.map((s) => (
          <Button
            key={s}
            data-testid={`filter-picks-${s}`}
            variant={sportFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setSportFilter(s)}
          >
            {s}
          </Button>
        ))}
        {data?.props && (
          <span className="text-xs text-muted-foreground ml-auto">
            {data.props.length} props
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
      ) : data?.props && data.props.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.props.map((prop: any) => (
            <Card
              key={prop.id}
              data-testid={`card-prop-${prop.id}`}
              className="bg-card border-border relative overflow-hidden hover:border-primary/40 transition-colors"
            >
              {/* Colored left border by action */}
              <div className={cn("absolute left-0 top-0 bottom-0 w-1",
                prop.action === "Strong Play" ? "bg-emerald-500" :
                prop.action === "Lean"        ? "bg-amber-400"  :
                prop.action === "Trap Line"   ? "bg-red-500"    : "bg-slate-600"
              )} />

              <div className="p-4 pl-5">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <PlayerAvatar src={prop.playerImage} name={prop.playerName} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="font-bold text-white leading-tight truncate">{prop.playerName}</h3>
                      <EdgeBadge score={prop.edgeScore} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TeamLogo src={prop.teamLogo} abbr={prop.teamAbbr} />
                      <span>{prop.teamAbbr}</span>
                      <span className="opacity-50">vs</span>
                      <TeamLogo src={prop.opponentLogo} abbr={prop.opponentAbbr} />
                      <span>{prop.opponentAbbr}</span>
                    </div>
                  </div>
                </div>

                {/* Prop info */}
                <div className="grid grid-cols-3 gap-2 mb-3 bg-background/60 rounded p-2.5 border border-white/5 text-center">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Prop</p>
                    <p className="font-bold text-white text-xs leading-tight">{prop.propType}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Line</p>
                    <p className="font-bold text-white text-sm font-mono">{prop.line}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">L5 Avg</p>
                    <p className="font-bold text-accent text-sm font-mono">{prop.avg5.toFixed(1)}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="flex gap-3 text-muted-foreground">
                    <span>Hit Rate L5: <strong className="text-white">{(prop.hitRate5 * 100).toFixed(0)}%</strong></span>
                    <span>L10: <strong className="text-white">{(prop.hitRate10 * 100).toFixed(0)}%</strong></span>
                  </div>
                  <span className={cn("text-xs font-mono",
                    prop.trend === "up" ? "text-emerald-400" :
                    prop.trend === "down" ? "text-red-400" : "text-muted-foreground"
                  )}>
                    {prop.trend === "up" ? "▲" : prop.trend === "down" ? "▼" : "—"} Trend
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <p className={cn("text-sm leading-tight", RecommendationColor(prop.recommendation))}>
                    {prop.recommendation}
                  </p>
                  <ActionBadge action={prop.action} />
                </div>

                {/* Red flags */}
                {prop.redFlags?.length > 0 && (
                  <p className="text-[10px] text-red-400/80 mt-1.5 truncate">
                    ⚠ {prop.redFlags.join(" · ")}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-16 border border-border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">No props found for this selection.</p>
        </div>
      )}
    </div>
  );
}
