import { useGetLiveEdge } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { PulseDot } from "@/components/PulseDot";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function LiveRecBadge({ rec }: { rec: string }) {
  const isOver = rec.includes("Over");
  const isUnder = rec.includes("Under");
  const isStrong = rec.includes("Strong");
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border",
      isStrong && isOver  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
      !isStrong && isOver ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
      isStrong && isUnder ? "bg-red-500/20 text-red-400 border-red-500/40" :
      !isStrong && isUnder? "bg-red-500/10 text-red-300 border-red-500/20" :
                            "bg-slate-500/20 text-slate-400 border-slate-500/20"
    )}>
      {rec}
    </span>
  );
}

export default function LiveEdgeTab() {
  const { data, isLoading } = useGetLiveEdge({
    query: { queryKey: ["/api/live-edge"], refetchInterval: 15000 }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <PulseDot /> Live Projections
        </h2>
        <div className="text-xs text-muted-foreground">
          {data?.lastUpdated
            ? `Updated ${new Date(data.lastUpdated).toLocaleTimeString()}`
            : "Refreshes every 15s"}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
      ) : data?.edges && data.edges.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.edges.map((edge: any) => {
            const edgePct = edge.liveEdgePercent ?? 0;
            const isOver  = edgePct > 0;
            return (
              <Card
                key={edge.id}
                data-testid={`card-live-edge-${edge.id}`}
                className="bg-card border-border overflow-hidden"
              >
                {/* Top accent line */}
                <div className={cn("h-0.5", isOver ? "bg-emerald-500" : edgePct < 0 ? "bg-red-500" : "bg-slate-600")} />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start gap-3 mb-4">
                    {edge.playerImage && (
                      <img
                        src={edge.playerImage}
                        alt={edge.playerName}
                        className="w-14 h-14 rounded-lg object-cover object-top bg-muted shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-white text-base leading-tight">{edge.playerName}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {edge.teamAbbr} · {edge.propType} · Line {edge.line}
                          </p>
                        </div>
                        <LiveRecBadge rec={edge.liveRecommendation} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        {edge.period}{edge.clock ? ` · ${edge.clock}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Stats block */}
                  <div className="bg-background/60 rounded-lg p-3.5 border border-white/5 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Current</p>
                        <p className="font-black text-white text-xl font-mono tabular-nums">{edge.currentStat}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Projected</p>
                        <p className={cn("font-black text-xl font-mono tabular-nums",
                          isOver ? "text-emerald-400" : edgePct < 0 ? "text-red-400" : "text-white"
                        )}>
                          {edge.projectedFinal > 0 ? edge.projectedFinal.toFixed(1) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Needed</p>
                        <p className="font-black text-white text-xl font-mono tabular-nums">{edge.neededRemaining.toFixed(1)}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono mb-1">
                        <span>Game Complete</span>
                        <span>{(edge.percentComplete * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={edge.percentComplete * 100} className="h-1.5" />
                    </div>

                    {/* Edge % */}
                    {edge.liveEdgePercent !== undefined && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
                        <span className="text-muted-foreground">Live Edge</span>
                        <span className={cn("font-bold font-mono",
                          edgePct > 0 ? "text-emerald-400" : edgePct < 0 ? "text-red-400" : "text-muted-foreground"
                        )}>
                          {edgePct > 0 ? "+" : ""}{edge.liveEdgePercent.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-16 border border-border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">No live edges currently active.</p>
        </div>
      )}
    </div>
  );
}
