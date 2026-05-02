import { useMemo, useState } from "react";
import { useGetBestProps } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WinProbBadge } from "@/components/WinProbBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBetSlip, type SlipPick } from "@/lib/betSlip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, ListChecks } from "lucide-react";

const SPORTS = ["ALL", "NBA", "MLB"] as const;

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
      {/* Selection checkmark */}
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
        {/* Header */}
        <div className="flex items-start gap-3 mb-4 pr-8">
          <PlayerAvatar src={prop.playerImage} name={prop.playerName} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white leading-tight truncate">{prop.playerName}</h3>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {prop.teamAbbr} vs {prop.opponentAbbr}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <WinProbBadge probability={wp} />
              {isStrong && (
                <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Strong
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Line + recommendation pill — PrizePicks style */}
        <div className="bg-background/70 rounded-lg p-3 border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
              {prop.propType}
            </p>
            <p className="text-2xl font-black text-white font-mono tabular-nums leading-none">
              {prop.line}
            </p>
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

        {/* Stats footer */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3">
          <span>L5 hit: <strong className="text-white">{Math.round(prop.hitRate5 * 100)}%</strong></span>
          <span>L10 hit: <strong className="text-white">{Math.round(prop.hitRate10 * 100)}%</strong></span>
          <span>L5 avg: <strong className="text-white">{prop.avg5.toFixed(1)}</strong></span>
        </div>

        {prop.redFlags?.length > 0 && (
          <p className="text-[10px] text-red-400/80 mt-2 truncate">
            ⚠ {prop.redFlags.join(" · ")}
          </p>
        )}
      </div>
    </Card>
  );
}

export default function PicksTab() {
  const [sportFilter, setSportFilter] = useState<string>("ALL");
  const slip = useBetSlip();

  const { data, isLoading } = useGetBestProps(
    sportFilter !== "ALL" ? { sport: sportFilter as any } : undefined,
    { query: { queryKey: ["/api/props/best", sportFilter] } },
  );

  // Group props: Sport → Game (by gameId, safe for doubleheaders) → sorted by winProbability desc
  const grouped = useMemo(() => {
    const props = data?.props ?? [];
    const bySport = new Map<string, Map<string, any[]>>();
    for (const p of props as any[]) {
      const sportMap = bySport.get(p.sport) ?? new Map<string, any[]>();
      const gameKey = String(p.gameId ?? p.gameLabel ?? `${p.teamAbbr}-${p.opponentAbbr}`);
      const arr = sportMap.get(gameKey) ?? [];
      arr.push(p);
      sportMap.set(gameKey, arr);
      bySport.set(p.sport, sportMap);
    }
    const out: { sport: string; games: { gameId: string; gameLabel: string; gameStartTime?: string; props: any[] }[] }[] = [];
    for (const [sport, gamesMap] of [...bySport.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const games = [...gamesMap.entries()].map(([gameId, props]) => ({
        gameId,
        gameLabel: props[0]?.gameLabel ?? `${props[0]?.teamAbbr} vs ${props[0]?.opponentAbbr}`,
        gameStartTime: props[0]?.gameStartTime,
        props: props.sort((a, b) => (b.winProbability ?? 0) - (a.winProbability ?? 0)),
      }));
      games.sort((a, b) => {
        if (!a.gameStartTime || !b.gameStartTime) return 0;
        return a.gameStartTime.localeCompare(b.gameStartTime);
      });
      out.push({ sport, games });
    }
    return out;
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Sport pill filters */}
      <div className="flex items-center gap-2 flex-wrap sticky top-16 bg-background/95 backdrop-blur z-30 py-2 -mx-4 px-4 border-b border-border">
        {SPORTS.map((s) => (
          <Button
            key={s}
            data-testid={`filter-picks-${s}`}
            variant={sportFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setSportFilter(s)}
            className={cn(
              "rounded-full px-4",
              sportFilter === s && "bg-primary text-primary-foreground",
            )}
          >
            {s}
          </Button>
        ))}
        {data?.props && (
          <span className="text-xs text-muted-foreground ml-auto">{data.props.length} props</span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center p-16 border border-border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">No props found for this selection.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ sport, games }) => (
            <section key={sport}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
                  {sport}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {games.reduce((n, g) => n + g.props.length, 0)} picks
                </span>
              </div>
              <div className="space-y-6">
                {games.map(({ gameId, gameLabel, gameStartTime, props }) => (
                  <div key={gameId}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-sm font-bold text-white">{gameLabel}</p>
                      {gameStartTime && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {new Date(gameStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {props.map((prop) => (
                        <PropCard key={prop.id} prop={prop} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Floating bet slip CTA */}
      {slip.count > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8">
          <div className="flex items-center gap-3 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-2xl shadow-primary/40 border border-primary/40">
            <ListChecks className="w-5 h-5" />
            <span className="font-bold text-sm">
              {slip.count} pick{slip.count === 1 ? "" : "s"} in My Picks
            </span>
            <Check className="w-4 h-4 opacity-70" />
          </div>
        </div>
      )}
    </div>
  );
}
