import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Last5Chart } from "@/components/Last5Chart";
import { WinProbBadge } from "@/components/WinProbBadge";
import { cn } from "@/lib/utils";
import { useBetSlip, type SlipPick } from "@/lib/betSlip";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Star, X, CloudRain, Sun, Wind, Home, Shield, History, Check } from "lucide-react";

function PlayerAvatar({ src, name, size = 16 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const px = `${size * 4}px`;
  return (
    <div className="relative shrink-0" style={{ width: px, height: px }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="rounded-xl object-cover object-top bg-muted border border-white/10"
          style={{ width: px, height: px }}
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
            const fb = el.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 items-center justify-center text-white font-bold border border-white/10"
        style={{ display: src ? "none" : "flex", width: px, height: px, fontSize: `${size * 0.9}px` }}
      >
        {initials}
      </div>
    </div>
  );
}

function WeatherIcon({ conditions }: { conditions?: string }) {
  if (!conditions) return null;
  if (conditions.includes("Rain")) return <CloudRain className="w-3.5 h-3.5" />;
  if (conditions.includes("Wind")) return <Wind className="w-3.5 h-3.5" />;
  if (conditions === "Dome") return <Home className="w-3.5 h-3.5" />;
  return <Sun className="w-3.5 h-3.5" />;
}

function FactorChip({
  label,
  value,
  impact,
  icon,
  testId,
}: {
  label: string;
  value: string;
  impact: number;
  icon: React.ReactNode;
  testId: string;
}) {
  const sign = impact > 0 ? "+" : "";
  const color = impact > 2 ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
    : impact < -2 ? "text-red-300 bg-red-500/10 border-red-500/30"
    : "text-muted-foreground bg-muted/20 border-border";
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px]", color)} data-testid={testId}>
      {icon}
      <span className="font-semibold">{label}:</span>
      <span className="truncate">{value}</span>
      <span className="font-bold tabular-nums">{sign}{impact}pp</span>
    </div>
  );
}

function propToSlip(prop: any, side: "Over" | "Under"): SlipPick {
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
    recommendation: side === "Over" ? "Lean Over" : "Lean Under",
    side,
    winProbability: prop.winProbability ?? 50,
    edgeScore: prop.edgeScore,
    gameLabel: prop.gameLabel,
    gameStartTime: prop.gameStartTime,
    addedAt: new Date().toISOString(),
  };
}

function CategoryRow({ prop }: { prop: any }) {
  const [open, setOpen] = useState(false);
  const slip = useBetSlip();
  const { toast } = useToast();
  const existing = slip.picks.find((p) => p.id === prop.id);
  const selectedSide: "Over" | "Under" | null = existing?.side ?? null;
  const isInSlip = existing !== undefined;
  const recommendedSide: "Over" | "Under" = prop.recommendation.includes("Over") ? "Over" : "Under";
  const wp: number = prop.winProbability ?? 50;

  function pick(side: "Over" | "Under") {
    if (selectedSide === side) {
      // Same side tapped → remove
      slip.remove(prop.id);
      toast({ title: "Removed", description: `${prop.playerName} ${prop.propType} ${prop.line}` });
      return;
    }
    if (selectedSide && selectedSide !== side) {
      // Different side selected → replace by removing then re-adding
      slip.remove(prop.id);
      slip.add(propToSlip(prop, side));
      toast({ title: "Switched to " + side, description: `${prop.playerName} ${side} ${prop.line} ${prop.propType}` });
      return;
    }
    // Nothing in slip yet → add
    slip.add(propToSlip(prop, side));
    toast({ title: "Added to My Picks", description: `${prop.playerName} ${side} ${prop.line} ${prop.propType}` });
  }

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden transition-colors",
        prop.bestPick ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-card",
        isInSlip && "ring-1 ring-emerald-500/60",
      )}
      data-testid={`category-row-${prop.id}`}
    >
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white font-mono tabular-nums">{prop.line}</span>
            <WinProbBadge probability={wp} />
            {prop.bestPick && (
              <span
                className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40"
                data-testid="badge-best-pick"
              >
                <Star className="w-3 h-3 fill-amber-300" /> Best Pick
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {prop.propType} · L5 avg <span className="text-white font-semibold">{prop.avg5}</span>
            {" · "}Recommended: <span className={cn("font-semibold", recommendedSide === "Over" ? "text-emerald-300" : "text-red-300")}>{recommendedSide === "Over" ? "▲ More" : "▼ Less"}</span>
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded body */}
      {open && (
        <div className="p-3 pt-0 space-y-3 border-t border-white/5">
          {/* Last 5 chart */}
          <Last5Chart games={prop.recentGames ?? []} line={prop.line} />

          {/* Factors */}
          <div className="flex flex-wrap gap-1.5">
            <FactorChip
              label="Opp"
              value={`#${prop.factors.opponent.rank} ${prop.factors.opponent.rating}`}
              impact={prop.factors.opponent.impact}
              icon={<Shield className="w-3.5 h-3.5" />}
              testId="chip-opponent"
            />
            <FactorChip
              label="H2H"
              value={`${prop.factors.h2h.avgVsOpponent} avg`}
              impact={prop.factors.h2h.impact}
              icon={<History className="w-3.5 h-3.5" />}
              testId="chip-h2h"
            />
            {prop.factors.weather && (
              <FactorChip
                label="Weather"
                value={prop.factors.weather.indoor ? "Dome" : (prop.factors.weather.conditions ?? "—")}
                impact={prop.factors.weather.impact}
                icon={<WeatherIcon conditions={prop.factors.weather.conditions} />}
                testId="chip-weather"
              />
            )}
          </div>

          {/* Reasoning */}
          {prop.reasoning && (
            <p className="text-[11px] text-muted-foreground/90 leading-relaxed">{prop.reasoning}</p>
          )}

          {/* Red flags */}
          {prop.redFlags?.length > 0 && (
            <div className="text-[10px] text-red-400/80 space-y-0.5">
              {prop.redFlags.map((f: string, i: number) => <p key={i}>⚠ {f}</p>)}
            </div>
          )}

          {/* Pick buttons — selected state reflects ACTUAL side in slip, not recommendation */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant={selectedSide === "Over" ? "default" : "outline"}
              size="sm"
              onClick={() => pick("Over")}
              data-testid={`pick-over-${prop.id}`}
              className={cn(
                "font-bold",
                selectedSide !== "Over" && recommendedSide === "Over" &&
                  "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10",
                selectedSide === "Over" && "bg-emerald-600 hover:bg-emerald-500 text-white",
              )}
            >
              {selectedSide === "Over" && <Check className="w-3.5 h-3.5 mr-1" />}
              ▲ More {prop.line}
            </Button>
            <Button
              type="button"
              variant={selectedSide === "Under" ? "default" : "outline"}
              size="sm"
              onClick={() => pick("Under")}
              data-testid={`pick-under-${prop.id}`}
              className={cn(
                "font-bold",
                selectedSide !== "Under" && recommendedSide === "Under" &&
                  "border-red-500/40 text-red-300 hover:bg-red-500/10",
                selectedSide === "Under" && "bg-red-600 hover:bg-red-500 text-white",
              )}
            >
              {selectedSide === "Under" && <Check className="w-3.5 h-3.5 mr-1" />}
              ▼ Less {prop.line}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PlayerDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: {
    playerId: string;
    playerName: string;
    playerImage?: string;
    sport: string;
    position?: string;
    teamAbbr: string;
    teamLogo?: string;
    opponentAbbr: string;
    opponentLogo?: string;
    gameLabel?: string;
    gameStartTime?: string;
  } | null;
  props: any[]; // all props for this player
}

export function PlayerDetailSheet({ open, onOpenChange, player, props }: PlayerDetailSheetProps) {
  if (!player) return null;

  // Best pick first, then sort remaining by win probability descending
  const sorted = [...props].sort((a, b) => {
    if (a.bestPick && !b.bestPick) return -1;
    if (!a.bestPick && b.bestPick) return 1;
    return (b.winProbability ?? 0) - (a.winProbability ?? 0);
  });

  const startTime = player.gameStartTime
    ? new Date(player.gameStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-card border-t border-border max-h-[92vh] p-0 flex flex-col"
        data-testid="player-detail-sheet"
      >
        <VisuallyHidden.Root>
          <SheetTitle>{player.playerName} — stat lines</SheetTitle>
          <SheetDescription>
            All available prop categories for {player.playerName}, {player.teamAbbr} vs {player.opponentAbbr}.
          </SheetDescription>
        </VisuallyHidden.Root>
        {/*
          Sticky close bar — lives at the TOP of the sheet as a real flex
          row. Earlier iterations used a faint translucent X button that
          users said they "couldn't see"; this version is a clearly-labeled
          pill button with high contrast against the dark sheet background
          plus a drag-handle bar that signals "swipeable sheet" by mobile
          UI convention.
        */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-border bg-card shrink-0 relative"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          {/* iOS-style drag handle (visual affordance only) */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-white/20" />
          <span className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground pl-1">
            Player Detail
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-white text-slate-900 font-bold text-sm shadow-md active:scale-95 transition-transform"
            data-testid="button-close-sheet"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={3} />
            <span>Close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
        {/* Hero header */}
        <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-background p-4 pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <PlayerAvatar src={player.playerImage} name={player.playerName} size={16} />
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-white leading-tight" data-testid="text-player-name">{player.playerName}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {player.sport} · {player.teamAbbr}
                {player.position ? ` · ${player.position}` : ""}
              </p>
            </div>
          </div>

          {/* Game card */}
          <div className="mt-4 bg-background/60 rounded-xl p-3 flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              {player.opponentLogo ? (
                <img src={player.opponentLogo} alt={player.opponentAbbr} className="w-7 h-7 object-contain shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-7 h-7 rounded bg-slate-700 text-[9px] font-bold text-white flex items-center justify-center shrink-0">
                  {player.opponentAbbr.slice(0, 3)}
                </div>
              )}
              <span className="font-bold text-white text-sm">{player.opponentAbbr}</span>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              <p>Today</p>
              {startTime && <p className="font-mono text-[11px]">{startTime}</p>}
            </div>
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span className="font-bold text-white text-sm">{player.teamAbbr}</span>
              {player.teamLogo ? (
                <img src={player.teamLogo} alt={player.teamAbbr} className="w-7 h-7 object-contain shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-7 h-7 rounded bg-slate-700 text-[9px] font-bold text-white flex items-center justify-center shrink-0">
                  {player.teamAbbr.slice(0, 3)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 space-y-2 pb-8">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
            Stat Lines · {sorted.length} {sorted.length === 1 ? "category" : "categories"}
          </p>
          {sorted.map((p) => <CategoryRow key={p.id} prop={p} />)}
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
