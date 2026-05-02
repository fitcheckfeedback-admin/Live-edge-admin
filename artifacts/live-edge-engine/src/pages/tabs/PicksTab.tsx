import { useEffect, useMemo, useState } from "react";
import { useGetBestProps, useGetScheduleToday, useGetLiveScores } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WinProbBadge } from "@/components/WinProbBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBetSlip, type SlipPick } from "@/lib/betSlip";
import { useNav } from "@/lib/navContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, ListChecks, ChevronLeft, Flame } from "lucide-react";

const SPORTS = ["ALL", "NBA", "MLB"] as const;
type SportFilter = (typeof SPORTS)[number];

function PlayerAvatar({ src, name }: { src?: string; name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="relative w-16 h-16 shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-16 h-16 rounded-xl object-cover object-top bg-muted border border-white/10"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
            const fb = el.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 items-center justify-center text-white font-bold text-base border border-white/10"
        style={{ display: src ? "none" : "flex" }}
      >
        {initials}
      </div>
    </div>
  );
}

function propToSlip(prop: any): SlipPick {
  const isOver = prop.recommendation.includes("Over");
  return {
    id: prop.id,
    sport: prop.sport,
    playerName: prop.playerName,
    playerImage: prop.playerImage,
    teamAbbr: prop.teamAbbr,
    teamLogo: prop.teamLogo,
    opponentAbbr: prop.opponentAbbr,
    propType: prop.propType,
    line: prop.line,
    recommendation: prop.recommendation,
    side: isOver ? "Over" : "Under",
    winProbability: prop.winProbability ?? 50,
    edgeScore: prop.edgeScore,
    gameLabel: prop.gameLabel,
    gameStartTime: prop.gameStartTime,
    addedAt: new Date().toISOString(),
  };
}

function PropCard({ prop }: { prop: any }) {
  const slip = useBetSlip();
  const { toast } = useToast();
  const isInSlip = slip.has(prop.id);
  const isOver = prop.recommendation.includes("Over");
  const isStrong = prop.action === "Strong Play";
  const wp: number = prop.winProbability ?? 50;

  function onToggle() {
    const next = propToSlip(prop);
    slip.toggle(next);
    toast({
      title: isInSlip ? "Removed from My Picks" : "Added to My Picks",
      description: `${prop.playerName} ${prop.recommendation} ${prop.line}`,
    });
  }

  return (
    <Card
      data-testid={`card-prop-${prop.id}`}
      onClick={onToggle}
      className={cn(
        "relative cursor-pointer overflow-hidden transition-all border",
        isInSlip
          ? "bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/40"
          : "bg-card border-border hover:border-primary/50",
      )}
    >
      {/* Selection checkbox */}
      <div className="absolute top-3 right-3 z-10">
        <Checkbox
          checked={isInSlip}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          aria-label={isInSlip ? "Remove from My Picks" : "Add to My Picks"}
          data-testid={`checkbox-prop-${prop.id}`}
          className="h-5 w-5 rounded border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-4 pr-8">
          <PlayerAvatar src={prop.playerImage} name={prop.playerName} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white leading-tight truncate">{prop.playerName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {prop.teamAbbr} vs {prop.opponentAbbr}
              {prop.gameStartTime && (
                <> · {new Date(prop.gameStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <WinProbBadge probability={wp} />
              {isStrong && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Flame className="w-3 h-3" /> Strong
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-background/70 rounded-lg p-3 border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{prop.propType}</p>
            <p className="text-2xl font-black text-white font-mono tabular-nums leading-none">{prop.line}</p>
          </div>
          <div
            className={cn(
              "px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider border-2",
              isOver
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/60"
                : "bg-red-500/15 text-red-300 border-red-500/60",
            )}
          >
            {isOver ? "▲ More" : "▼ Less"}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3">
          <span>L5 hit: <strong className="text-white">{Math.round(prop.hitRate5 * 100)}%</strong></span>
          <span>L10 hit: <strong className="text-white">{Math.round(prop.hitRate10 * 100)}%</strong></span>
          <span>L5 avg: <strong className="text-white">{prop.avg5.toFixed(1)}</strong></span>
        </div>

        {prop.redFlags?.length > 0 && (
          <p className="text-[10px] text-red-400/80 mt-2 truncate">⚠ {prop.redFlags.join(" · ")}</p>
        )}
      </div>
    </Card>
  );
}

function GameStripCard({
  game,
  isSelected,
  onSelect,
}: {
  game: any;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const start = game.startTime ? new Date(game.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const isLive = game.isLive;
  const isFinal = game.status === "final";

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`game-strip-${game.id}`}
      className={cn(
        "shrink-0 w-[200px] rounded-xl border p-3 text-left transition-all",
        isSelected
          ? "bg-primary/10 border-primary/60 ring-1 ring-primary/40"
          : "bg-card border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{game.sport}</span>
        {isLive ? (
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">● Live</span>
        ) : isFinal ? (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Final</span>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground">{start}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {[game.awayTeam, game.homeTeam].map((team: any, i: number) => {
          const score = i === 0 ? game.awayScore : game.homeScore;
          return (
            <div key={team.abbreviation} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {team.logoUrl ? (
                  <img
                    src={team.logoUrl}
                    alt={team.abbreviation}
                    className="w-5 h-5 object-contain shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded text-[8px] flex items-center justify-center font-bold text-white shrink-0"
                    style={{ backgroundColor: team.color ?? "#334155" }}
                  >
                    {team.abbreviation.slice(0, 2)}
                  </div>
                )}
                <span className="text-xs font-semibold text-white truncate">{team.abbreviation}</span>
              </div>
              {(isLive || isFinal) && score !== undefined && score !== null && (
                <span className="text-sm font-black text-white font-mono tabular-nums">{score}</span>
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
}

export default function PicksTab() {
  const [sportFilter, setSportFilter] = useState<SportFilter>("ALL");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const slip = useBetSlip();
  const nav = useNav();

  const { data: propsData, isLoading: propsLoading } = useGetBestProps(
    sportFilter !== "ALL" ? { sport: sportFilter as any } : undefined,
    { query: { queryKey: ["/api/props/best", sportFilter] } },
  );

  const { data: scheduleData } = useGetScheduleToday(
    sportFilter !== "ALL" ? { sport: sportFilter as any } : undefined,
    { query: { queryKey: ["/api/schedule/today", sportFilter] } },
  );
  const { data: liveData } = useGetLiveScores({
    query: { queryKey: ["/api/scores/live"], refetchInterval: 30000 },
  });

  // Merge live scores into schedule
  const games = useMemo(() => {
    const baseGames = scheduleData?.games ?? [];
    const liveMap = new Map((liveData?.games ?? []).map((g) => [g.id, g]));
    return baseGames.map((g) => liveMap.get(g.id) ?? g);
  }, [scheduleData, liveData]);

  // Reset selected game when sport pill changes (game might not belong to filtered sport)
  function handleSportChange(s: SportFilter) {
    setSportFilter(s);
    setSelectedGameId(null);
  }

  // Filter + sort props
  const visibleProps = useMemo(() => {
    const all = (propsData?.props ?? []) as any[];
    const filtered = selectedGameId ? all.filter((p) => String(p.gameId) === selectedGameId) : all;
    return [...filtered].sort((a, b) => (b.winProbability ?? 0) - (a.winProbability ?? 0));
  }, [propsData, selectedGameId]);

  const selectedGame = useMemo(
    () => (selectedGameId ? games.find((g) => g.id === selectedGameId) : null),
    [games, selectedGameId],
  );

  // Auto-clear stale drill-in if the game vanishes from the schedule
  // (e.g. user changed sport, schedule refreshed, or game ended and rolled off).
  useEffect(() => {
    if (selectedGameId && games.length > 0 && !games.some((g) => g.id === selectedGameId)) {
      setSelectedGameId(null);
    }
  }, [games, selectedGameId]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-4">
      {/* Sport pill filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {SPORTS.map((s) => (
          <Button
            key={s}
            data-testid={`filter-picks-${s}`}
            variant={sportFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => handleSportChange(s)}
            className={cn("rounded-full px-4", sportFilter === s && "bg-primary text-primary-foreground")}
          >
            {s}
          </Button>
        ))}
        {visibleProps.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {visibleProps.length} pick{visibleProps.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {selectedGameId && selectedGame ? (
        // ── DRILL-IN: single-game view ─────────────────────────────────────
        <>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedGameId(null)}
              data-testid="button-back-to-board"
              className="text-muted-foreground hover:text-white -ml-2"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> All games
            </Button>
          </div>
          <Card className="bg-card border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">{selectedGame.sport}</span>
              {selectedGame.isLive ? (
                <span className="text-xs font-bold text-primary">● Live · {selectedGame.period} {selectedGame.clock ? `· ${selectedGame.clock}` : ""}</span>
              ) : selectedGame.status === "final" ? (
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Final</span>
              ) : (
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedGame.startTime ? new Date(selectedGame.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {[selectedGame.awayTeam, selectedGame.homeTeam].map((team: any, i: number) => {
                const score = i === 0 ? selectedGame.awayScore : selectedGame.homeScore;
                return (
                  <div key={team.abbreviation} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.abbreviation} className="w-8 h-8 object-contain shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-8 h-8 rounded text-[10px] flex items-center justify-center font-bold text-white shrink-0"
                          style={{ backgroundColor: team.color ?? "#334155" }}>
                          {team.abbreviation.slice(0, 2)}
                        </div>
                      )}
                      <span className="font-bold text-white truncate">{team.name}</span>
                    </div>
                    {(selectedGame.isLive || selectedGame.status === "final") && score !== undefined && score !== null && (
                      <span className="text-2xl font-black text-white font-mono tabular-nums">{score}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : (
        // ── BOARD VIEW: featured games strip ─────────────────────────────
        games.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Featured Games</h2>
              <span className="text-[10px] text-muted-foreground">Tap a game to filter picks</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {games.map((g) => (
                <div key={g.id} className="snap-start">
                  <GameStripCard game={g} isSelected={false} onSelect={() => setSelectedGameId(g.id)} />
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Picks list — flat, sorted by win probability desc */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Flame className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            {selectedGameId ? "Picks for this game" : "Popular Picks"}
          </h2>
          <span className="text-[11px] text-muted-foreground">— sorted by win probability</span>
        </div>

        {propsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
          </div>
        ) : visibleProps.length === 0 ? (
          <div className="text-center p-12 border border-border border-dashed rounded-lg">
            <p className="text-muted-foreground text-sm">
              {selectedGameId ? "No picks available for this game yet." : "No props found for this selection."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {visibleProps.map((prop) => <PropCard key={prop.id} prop={prop} />)}
          </div>
        )}
      </div>

      {/* Floating clickable bet-slip CTA — sits above bottom nav, safe-area aware */}
      {slip.count > 0 && (
        <button
          type="button"
          onClick={() => nav.setActiveTab("mypicks")}
          data-testid="button-floating-slip"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
          className="fixed left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 hover:scale-105 active:scale-100 transition-transform"
        >
          <span className="flex items-center gap-3 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-2xl shadow-primary/40 border border-primary/40">
            <ListChecks className="w-5 h-5" />
            <span className="font-bold text-sm">
              View {slip.count} pick{slip.count === 1 ? "" : "s"} in My Picks
            </span>
            <Check className="w-4 h-4 opacity-70" />
          </span>
        </button>
      )}
    </div>
  );
}
