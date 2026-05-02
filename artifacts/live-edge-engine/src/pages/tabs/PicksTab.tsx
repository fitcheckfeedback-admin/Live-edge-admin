import { useEffect, useMemo, useState } from "react";
import { useGetBestProps, useGetScheduleToday, useGetLiveScores } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WinProbBadge } from "@/components/WinProbBadge";
import { PlayerDetailSheet } from "@/components/PlayerDetailSheet";
import { useBetSlip } from "@/lib/betSlip";
import { useNav } from "@/lib/navContext";
import { cn } from "@/lib/utils";
import { Star, ListChecks, ChevronLeft, Flame, ChevronRight } from "lucide-react";

const SPORTS = ["ALL", "NBA", "MLB"] as const;
type SportFilter = (typeof SPORTS)[number];

interface PlayerGroup {
  playerId: string;
  playerName: string;
  playerImage?: string;
  sport: string;
  position?: string;
  teamAbbr: string;
  teamLogo?: string;
  opponentAbbr: string;
  opponentLogo?: string;
  gameId?: string;
  gameLabel?: string;
  gameStartTime?: string;
  props: any[];
  bestProp: any;
}

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

function PlayerCard({
  group,
  selectedCount,
  onClick,
}: {
  group: PlayerGroup;
  selectedCount: number;
  onClick: () => void;
}) {
  const best = group.bestProp;
  const isOver = best.recommendation.includes("Over");
  const startTime = group.gameStartTime
    ? new Date(group.gameStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Card
      onClick={onClick}
      data-testid={`card-player-${group.playerId}`}
      className={cn(
        "relative cursor-pointer overflow-hidden transition-all border bg-card hover:border-primary/50 active:scale-[0.99]",
        selectedCount > 0 && "ring-1 ring-emerald-500/40 border-emerald-500/40",
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <PlayerAvatar src={group.playerImage} name={group.playerName} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white leading-tight truncate" data-testid="text-player-card-name">
                  {group.playerName}
                </h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  {group.sport} · {group.teamAbbr}
                  {group.position ? ` · ${group.position}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  vs {group.opponentAbbr}
                  {startTime && <> · {startTime}</>}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-1" />
            </div>

            {selectedCount > 0 && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {selectedCount} in slip
              </span>
            )}
          </div>
        </div>

        {/* Best Pick row */}
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-2.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
            <Star className="w-3 h-3 fill-amber-300" /> Best
          </span>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-lg font-black text-white font-mono tabular-nums">{best.line}</span>
            <span className="text-[11px] text-muted-foreground truncate">{best.propType}</span>
          </div>
          <WinProbBadge probability={best.winProbability ?? 50} />
          <span
            className={cn(
              "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border-2 shrink-0",
              isOver ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/60"
                : "bg-red-500/15 text-red-300 border-red-500/60",
            )}
            data-testid={`badge-side-${group.playerId}`}
          >
            {isOver ? "▲ MORE" : "▼ LESS"}
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground/70 mt-2 text-center">
          Tap to see all {group.props.length} stat {group.props.length === 1 ? "category" : "categories"}
        </p>
      </div>
    </Card>
  );
}

function GameStripCard({
  game,
  onSelect,
}: {
  game: any;
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
      className="shrink-0 w-[200px] rounded-xl border bg-card border-border hover:border-primary/40 p-3 text-left transition-all"
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
                  <img src={team.logoUrl} alt={team.abbreviation} className="w-5 h-5 object-contain shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-5 h-5 rounded text-[8px] flex items-center justify-center font-bold text-white shrink-0"
                    style={{ backgroundColor: team.color ?? "#334155" }}>
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
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
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
    query: { queryKey: ["/api/scores/live"], refetchInterval: 15000 },
  });

  // Merge live data into schedule, then keep only games that haven't ended yet
  // (live + upcoming). Sort: live first, then upcoming by start time ascending.
  const games = useMemo(() => {
    const baseGames = scheduleData?.games ?? [];
    const liveMap = new Map((liveData?.games ?? []).map((g) => [g.id, g]));
    const merged = baseGames.map((g) => liveMap.get(g.id) ?? g);
    return merged
      .filter((g) => g.isLive || g.status !== "final")
      .sort((a, b) => {
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
        const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
        return ta - tb;
      });
  }, [scheduleData, liveData]);

  // Local "Today" label that respects the user's timezone
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
    [],
  );
  const tzAbbr = useMemo(() => {
    const parts = new Intl.DateTimeFormat([], { timeZoneName: "short" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  }, []);

  function handleSportChange(s: SportFilter) {
    setSportFilter(s);
    setSelectedGameId(null);
  }

  // Group props by playerId so each player gets one card with all categories
  const playerGroups: PlayerGroup[] = useMemo(() => {
    const all = (propsData?.props ?? []) as any[];
    const filtered = selectedGameId ? all.filter((p) => String(p.gameId) === selectedGameId) : all;
    const map = new Map<string, PlayerGroup>();
    for (const p of filtered) {
      const key = `${p.playerId}:${p.gameId ?? ""}`;
      let group = map.get(key);
      if (!group) {
        group = {
          playerId: p.playerId,
          playerName: p.playerName,
          playerImage: p.playerImage,
          sport: p.sport,
          position: p.position,
          teamAbbr: p.teamAbbr,
          teamLogo: p.teamLogo,
          opponentAbbr: p.opponentAbbr,
          opponentLogo: p.opponentLogo,
          gameId: p.gameId,
          gameLabel: p.gameLabel,
          gameStartTime: p.gameStartTime,
          props: [],
          bestProp: p,
        };
        map.set(key, group);
      }
      group.props.push(p);
      if (p.bestPick) group.bestProp = p;
      else if (!group.props.some((x) => x.bestPick) && (p.winProbability ?? 0) > (group.bestProp.winProbability ?? 0)) {
        group.bestProp = p;
      }
    }
    // Interleave MORE (Over) and LESS (Under) picks so the user always sees a
    // mix at the top of the board. We rank each side internally by win
    // probability, then weave them together: best Over, best Under, 2nd Over,
    // 2nd Under, … Without this the list skews heavily Under because
    // low-volume "rare-event" Unders are mathematically more confident than
    // common-event Overs.
    const allGroups = Array.from(map.values());
    const overs = allGroups
      .filter((g) => g.bestProp.recommendation.includes("Over"))
      .sort((a, b) => (b.bestProp.winProbability ?? 0) - (a.bestProp.winProbability ?? 0));
    const unders = allGroups
      .filter((g) => g.bestProp.recommendation.includes("Under"))
      .sort((a, b) => (b.bestProp.winProbability ?? 0) - (a.bestProp.winProbability ?? 0));
    const others = allGroups
      .filter((g) => !g.bestProp.recommendation.includes("Over") && !g.bestProp.recommendation.includes("Under"))
      .sort((a, b) => (b.bestProp.winProbability ?? 0) - (a.bestProp.winProbability ?? 0));
    const interleaved: PlayerGroup[] = [];
    const maxLen = Math.max(overs.length, unders.length);
    for (let i = 0; i < maxLen; i++) {
      if (overs[i]) interleaved.push(overs[i]!);
      if (unders[i]) interleaved.push(unders[i]!);
    }
    interleaved.push(...others);
    return interleaved;
  }, [propsData, selectedGameId]);

  const selectedGame = useMemo(
    () => (selectedGameId ? games.find((g) => g.id === selectedGameId) : null),
    [games, selectedGameId],
  );

  useEffect(() => {
    if (selectedGameId && games.length > 0 && !games.some((g) => g.id === selectedGameId)) {
      setSelectedGameId(null);
    }
  }, [games, selectedGameId]);

  const openPlayer = openPlayerId
    ? playerGroups.find((g) => g.playerId === openPlayerId) ?? null
    : null;

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
        {playerGroups.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {playerGroups.length} player{playerGroups.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {selectedGameId && selectedGame ? (
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
        games.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Today's Games
                <span className="ml-2 text-[10px] font-normal text-muted-foreground tracking-normal normal-case">
                  · {todayLabel}{tzAbbr ? ` · times in ${tzAbbr}` : ""}
                </span>
              </h2>
              <span className="text-[10px] text-muted-foreground">Tap to see both teams' players</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {games.map((g) => (
                <div key={g.id} className="snap-start">
                  <GameStripCard game={g} onSelect={() => setSelectedGameId(g.id)} />
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Player cards grid */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Flame className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            {selectedGameId
              ? `Players from both teams · ${selectedGame?.awayTeam.abbreviation} @ ${selectedGame?.homeTeam.abbreviation}`
              : "Today's Players"}
          </h2>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">— tap any player for full stat board</span>
        </div>

        {propsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
          </div>
        ) : playerGroups.length === 0 ? (
          <div className="text-center p-12 border border-border border-dashed rounded-lg">
            <p className="text-muted-foreground text-sm">
              {selectedGameId ? "No picks available for this game yet." : "No players found for this selection."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {playerGroups.map((g) => {
              const selectedCount = g.props.filter((p) => slip.has(p.id)).length;
              return (
                <PlayerCard
                  key={`${g.playerId}-${g.gameId ?? ""}`}
                  group={g}
                  selectedCount={selectedCount}
                  onClick={() => setOpenPlayerId(g.playerId)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Player detail sheet */}
      <PlayerDetailSheet
        open={openPlayerId !== null}
        onOpenChange={(o) => { if (!o) setOpenPlayerId(null); }}
        player={openPlayer}
        props={openPlayer?.props ?? []}
      />

      {/* Floating clickable bet-slip CTA */}
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
          </span>
        </button>
      )}
    </div>
  );
}
