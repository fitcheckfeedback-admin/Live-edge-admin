import { useState } from "react";
import { useGetBestProps } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EdgeBadge } from "@/components/EdgeBadge";
import { cn } from "@/lib/utils";

const SPORTS = ["ALL", "NBA", "MLB", "NFL"] as const;

export default function PicksTab() {
  const [sportFilter, setSportFilter] = useState<string>("ALL");

  const { data, isLoading } = useGetBestProps(
    sportFilter !== "ALL" ? { sport: sportFilter as any } : undefined,
    {
      query: {
        queryKey: ["/api/props/best", sportFilter !== "ALL" ? { sport: sportFilter } : undefined],
      }
    }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {SPORTS.map(s => (
            <Button
              key={s}
              variant={sportFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setSportFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-muted/20 border-border" />
          ))}
        </div>
      ) : data?.props && data.props.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.props.map((prop: any) => (
            <Card key={prop.id} className="bg-card border-border p-4 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {prop.playerImage ? (
                    <img src={prop.playerImage} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">NA</div>
                  )}
                  <div>
                    <h3 className="font-bold text-white leading-tight">{prop.playerName}</h3>
                    <p className="text-xs text-muted-foreground">{prop.teamAbbr} vs {prop.opponentAbbr}</p>
                  </div>
                </div>
                <EdgeBadge score={prop.edgeScore} />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 bg-background/50 rounded p-3 border border-border">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Prop Type</p>
                  <p className="font-bold text-white text-sm">{prop.propType}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Line</p>
                  <p className="font-bold text-white text-sm">{prop.line}</p>
                </div>
              </div>

              <div className="mt-auto pt-2 border-t border-border/50 flex justify-between items-center">
                <p className={cn(
                  "text-sm font-bold",
                  prop.recommendation.includes("Over") ? "text-primary" : 
                  prop.recommendation.includes("Under") ? "text-destructive" : "text-muted-foreground"
                )}>
                  {prop.recommendation}
                </p>
                <p className="text-xs text-muted-foreground font-mono">Action: {prop.action}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border border-border border-dashed rounded-lg text-muted-foreground">
          No props found for this selection.
        </div>
      )}
    </div>
  );
}
