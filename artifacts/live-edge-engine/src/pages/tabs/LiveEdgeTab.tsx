import { useGetLiveEdge } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { PulseDot } from "@/components/PulseDot";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function LiveEdgeTab() {
  const { data, isLoading } = useGetLiveEdge({
    query: {
      queryKey: ["/api/live-edge"],
      refetchInterval: 15000,
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <PulseDot /> Live Projections
        </h2>
        <div className="text-xs text-muted-foreground">
          Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : "Never"}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="h-40 animate-pulse bg-muted/20 border-border" />
          ))}
        </div>
      ) : data?.edges && data.edges.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.edges.map((edge: any) => (
            <Card key={edge.id} className="bg-card border-border p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{edge.playerName}</h3>
                  <p className="text-sm text-muted-foreground">{edge.propType} • Line: {edge.line}</p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider",
                    edge.liveRecommendation.includes("Over") ? "bg-primary/20 text-primary" : 
                    edge.liveRecommendation.includes("Under") ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                  )}>
                    {edge.liveRecommendation}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{edge.period} {edge.clock}</p>
                </div>
              </div>

              <div className="space-y-4 bg-background/50 rounded-lg p-4 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current: <strong className="text-white">{edge.currentStat}</strong></span>
                  <span className="text-muted-foreground">Proj: <strong className="text-accent">{edge.projectedFinal.toFixed(1)}</strong></span>
                </div>
                <Progress value={edge.percentComplete} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>{edge.percentComplete.toFixed(0)}% Time Complete</span>
                  {edge.liveEdgePercent && <span>Edge: {edge.liveEdgePercent.toFixed(1)}%</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border border-border border-dashed rounded-lg text-muted-foreground">
          No live edges currently active.
        </div>
      )}
    </div>
  );
}
