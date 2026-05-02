import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WinProbBadge } from "@/components/WinProbBadge";
import { useBetSlip } from "@/lib/betSlip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Trash2, ListChecks, Trophy } from "lucide-react";

function PlayerAvatar({ src, name }: { src?: string; name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="relative w-12 h-12 shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-12 h-12 rounded-lg object-cover object-top bg-muted border border-white/10"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
            const fb = el.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 items-center justify-center text-white font-bold text-xs border border-white/10"
        style={{ display: src ? "none" : "flex" }}
      >
        {initials}
      </div>
    </div>
  );
}

export default function MyPicksTab() {
  const slip = useBetSlip();
  const { toast } = useToast();

  // Aggregate stats: avg win prob across slip
  const stats = useMemo(() => {
    if (slip.picks.length === 0) return null;
    const avgWp = slip.picks.reduce((s, p) => s + p.winProbability, 0) / slip.picks.length;
    // Naive parlay-style combined probability assuming independence
    const combined = slip.picks.reduce((p, x) => p * (x.winProbability / 100), 1) * 100;
    const strongCount = slip.picks.filter((p) => p.winProbability >= 65).length;
    return {
      avgWp: Math.round(avgWp),
      combined: Math.round(combined * 10) / 10,
      strongCount,
    };
  }, [slip.picks]);

  if (slip.picks.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="text-center p-16 border border-border border-dashed rounded-xl">
          <ListChecks className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-base font-bold text-white mb-1">Your bet slip is empty</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Head to <strong className="text-primary">Best Picks</strong> and tap any pick to add it
            to your slip for review.
          </p>
        </div>
      </div>
    );
  }

  // Group by sport then game
  const byGame = new Map<string, typeof slip.picks>();
  for (const p of slip.picks) {
    const key = `${p.sport}__${p.gameLabel ?? `${p.teamAbbr} vs ${p.opponentAbbr}`}`;
    byGame.set(key, [...(byGame.get(key) ?? []), p]);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      {/* Aggregate header */}
      {stats && (
        <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-white">My Bet Slip</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {slip.count} pick{slip.count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Avg Win %</p>
              <p className="text-2xl font-black font-mono text-white tabular-nums">{stats.avgWp}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Strong Picks</p>
              <p className="text-2xl font-black font-mono text-emerald-400 tabular-nums">{stats.strongCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Combined*</p>
              <p className="text-2xl font-black font-mono text-accent tabular-nums">{stats.combined}%</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/70 text-center mt-3">
            *Naive product of individual win probabilities (assumes independence). Research only.
          </p>
        </Card>
      )}

      {/* Picks list grouped */}
      <div className="space-y-6">
        {[...byGame.entries()].map(([key, picks]) => {
          const [sport, gameLabel] = key.split("__");
          return (
            <section key={key}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                  {sport}
                </span>
                <span className="text-sm font-bold text-white">{gameLabel}</span>
              </div>
              <div className="space-y-2">
                {picks.map((p) => {
                  const isOver = p.side === "Over";
                  return (
                    <Card
                      key={p.id}
                      data-testid={`slip-pick-${p.id}`}
                      className="bg-card border-border p-3 flex items-center gap-3"
                    >
                      <PlayerAvatar src={p.playerImage} name={p.playerName} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{p.playerName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {p.propType} · {p.teamAbbr} vs {p.opponentAbbr}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border",
                              isOver
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                : "bg-red-500/15 text-red-300 border-red-500/40",
                            )}
                          >
                            {isOver ? "▲ More" : "▼ Less"} {p.line}
                          </span>
                          <WinProbBadge probability={p.winProbability} size="sm" />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          slip.remove(p.id);
                          toast({ title: "Removed", description: `${p.playerName} ${p.recommendation} ${p.line}` });
                        }}
                        aria-label="Remove pick"
                        data-testid={`button-remove-${p.id}`}
                        className="text-muted-foreground hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Clear all */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            slip.clear();
            toast({ title: "Cleared all picks" });
          }}
          data-testid="button-clear-slip"
          className="w-full text-muted-foreground hover:text-red-400 border-dashed"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Clear all picks
        </Button>
      </div>
    </div>
  );
}
