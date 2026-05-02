import { useState } from "react";
import { useGetScheduleToday, useGetLiveScores } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PulseDot } from "@/components/PulseDot";
import { Skeleton } from "@/components/ui/skeleton";

// Only sports currently in season (May = NBA playoffs + MLB)
const SPORTS = ["ALL", "NBA", "MLB"] as const;

function TeamLogo({ logoUrl, abbreviation, color }: { logoUrl?: string; abbreviation: string; color?: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={abbreviation}
        className="w-9 h-9 object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className="w-9 h-9 rounded flex items-center justify-center text-[10px] font-bold text-white"
      style={{ backgroundColor: color ?? "#334155" }}
    >
      {abbreviation}
    </div>
  );
}

function GameCard({ game }: { game: any }) {
  const isLive = game.isLive;
  const isFinal = game.status === "final";
  const startTime = game.startTime ? new Date(game.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <Card
      data-testid={`card-game-${game.id}`}
      className="bg-card border-border p-4 relative overflow-hidden hover:border-primary/40 transition-colors"
    >
      {/* Top row: sport badge + status */}
      <div className="flex justify-between items-center mb-4">
        <Badge variant="outline" className="text-[10px] font-mono tracking-widest">{game.sport}</Badge>
        {isLive ? (
          <div className="flex items-center gap-2 text-primary font-bold text-xs">
            <PulseDot />
            <span>{game.period} {game.clock && `· ${game.clock}`}</span>
          </div>
        ) : isFinal ? (
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Final</span>
        ) : (
          <span className="text-xs text-muted-foreground">{startTime}</span>
        )}
      </div>

      {/* Away team */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <TeamLogo logoUrl={game.awayTeam.logoUrl} abbreviation={game.awayTeam.abbreviation} color={game.awayTeam.color} />
          <span className="font-semibold text-white truncate">{game.awayTeam.name}</span>
        </div>
        {(isLive || isFinal) && (
          <span className="text-2xl font-black font-mono text-white tabular-nums ml-2">{game.awayScore ?? "-"}</span>
        )}
      </div>

      {/* Home team */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <TeamLogo logoUrl={game.homeTeam.logoUrl} abbreviation={game.homeTeam.abbreviation} color={game.homeTeam.color} />
          <span className="font-semibold text-white truncate">{game.homeTeam.name}</span>
        </div>
        {(isLive || isFinal) && (
          <span className="text-2xl font-black font-mono text-white tabular-nums ml-2">{game.homeScore ?? "-"}</span>
        )}
      </div>

      {/* Accent line for live games using team color */}
      {isLive && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, ${game.awayTeam.color ?? "#22c55e"}, ${game.homeTeam.color ?? "#3b82f6"})` }}
        />
      )}
    </Card>
  );
}

export default function GamesTab() {
  const [sportFilter, setSportFilter] = useState<string>("ALL");

  const { data: scheduleData, isLoading } = useGetScheduleToday(
    sportFilter !== "ALL" ? { sport: sportFilter as any } : undefined,
    { query: { queryKey: ["/api/schedule/today", sportFilter] } }
  );

  const { data: liveData } = useGetLiveScores({
    query: { queryKey: ["/api/scores/live"], refetchInterval: 15000 }
  });

  const games = scheduleData?.games ?? [];
  const liveMap = new Map((liveData?.games ?? []).map((g) => [g.id, g]));
  const displayGames = games.map((g) => liveMap.get(g.id) ?? g);

  const liveCount = displayGames.filter((g) => g.isLive).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {SPORTS.map((s) => (
            <Button
              key={s}
              data-testid={`filter-sport-${s}`}
              variant={sportFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setSportFilter(s)}
            >
              {s}
            </Button>
          ))}
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-primary font-semibold ml-2">
              <PulseDot /> {liveCount} Live
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Updated: {liveData?.lastUpdated ? new Date(liveData.lastUpdated).toLocaleTimeString() : "—"}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      ) : displayGames.length > 0 ? (
        <>
          {/* Live games first */}
          {displayGames.filter((g) => g.isLive).length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Live Now</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayGames.filter((g) => g.isLive).map((game) => <GameCard key={game.id} game={game} />)}
              </div>
            </div>
          )}
          {/* Upcoming */}
          {displayGames.filter((g) => !g.isLive && g.status !== "final").length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Upcoming</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayGames.filter((g) => !g.isLive && g.status !== "final").map((game) => <GameCard key={game.id} game={game} />)}
              </div>
            </div>
          )}
          {/* Final */}
          {displayGames.filter((g) => g.status === "final").length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Final</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayGames.filter((g) => g.status === "final").map((game) => <GameCard key={game.id} game={game} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-16 border border-border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">No games found for this selection.</p>
        </div>
      )}
    </div>
  );
}
