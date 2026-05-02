import { useState } from "react";
import { useGetScheduleToday, useGetLiveScores } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PulseDot } from "@/components/PulseDot";

const SPORTS = ["ALL", "NBA", "MLB", "NFL"] as const;

export default function GamesTab() {
  const [sportFilter, setSportFilter] = useState<string>("ALL");

  const { data: scheduleData, isLoading: scheduleLoading } = useGetScheduleToday(
    sportFilter !== "ALL" ? { sport: sportFilter as any } : undefined,
    {
      query: {
        queryKey: ["/api/schedule/today", sportFilter !== "ALL" ? { sport: sportFilter } : undefined],
      }
    }
  );

  const { data: liveData } = useGetLiveScores({
    query: {
      queryKey: ["/api/scores/live"],
      refetchInterval: 15000,
    }
  });

  // Merge live data with scheduled data if needed, or just display live data separately.
  // For simplicity, we'll display scheduled games and update with live scores if available.
  const games = scheduleData?.games || [];
  
  const liveGamesMap = new Map((liveData?.games || []).map(g => [g.id, g]));
  
  const displayGames = games.map(g => liveGamesMap.get(g.id) || g);

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
        <div className="text-xs text-muted-foreground">
          Last updated: {liveData?.lastUpdated ? new Date(liveData.lastUpdated).toLocaleTimeString() : "Never"}
        </div>
      </div>

      {scheduleLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="h-32 animate-pulse bg-muted/20 border-border" />
          ))}
        </div>
      ) : displayGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayGames.map((game: any) => (
            <Card key={game.id} className="bg-card border-border p-4 relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <Badge variant="outline" className="text-xs font-mono">{game.sport}</Badge>
                {game.isLive ? (
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <PulseDot /> LIVE • {game.period} {game.clock}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground uppercase">{game.status}</span>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {game.awayTeam.logoUrl ? (
                      <img src={game.awayTeam.logoUrl} alt={game.awayTeam.abbreviation} className="w-8 h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold">{game.awayTeam.abbreviation}</div>
                    )}
                    <span className="font-bold text-white">{game.awayTeam.name}</span>
                  </div>
                  <span className="text-xl font-bold font-mono text-white">{game.awayScore ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {game.homeTeam.logoUrl ? (
                      <img src={game.homeTeam.logoUrl} alt={game.homeTeam.abbreviation} className="w-8 h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-bold">{game.homeTeam.abbreviation}</div>
                    )}
                    <span className="font-bold text-white">{game.homeTeam.name}</span>
                  </div>
                  <span className="text-xl font-bold font-mono text-white">{game.homeScore ?? '-'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border border-border border-dashed rounded-lg text-muted-foreground">
          No games found for this selection.
        </div>
      )}
    </div>
  );
}
