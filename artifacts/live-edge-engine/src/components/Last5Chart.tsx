import { cn } from "@/lib/utils";

interface RecentGame {
  date: string;
  opponent: string;
  isHome: boolean;
  value: number;
  beatLine: boolean;
}

interface Last5ChartProps {
  games: RecentGame[];
  line: number;
  unit?: string;
}

export function Last5Chart({ games, line, unit }: Last5ChartProps) {
  if (!games || games.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-md">
        No recent game data
      </div>
    );
  }

  const maxValue = Math.max(line * 1.6, ...games.map((g) => g.value), 1);
  const avg = games.reduce((s, g) => s + g.value, 0) / games.length;
  const linePercent = (line / maxValue) * 100;

  return (
    <div className="bg-background/50 rounded-lg p-3 border border-white/5">
      <div className="relative h-32">
        {/* Line marker */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-white/40 z-10"
          style={{ bottom: `${linePercent}%` }}
        >
          <span className="absolute -top-2.5 right-0 text-[10px] font-bold text-white bg-background/90 px-1 rounded">
            {line}
          </span>
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end justify-around gap-2 pb-0">
          {games.map((g, i) => {
            const heightPct = (g.value / maxValue) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity bg-background px-1 rounded whitespace-nowrap">
                  {g.value}
                </div>
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all min-h-[4px]",
                    g.beatLine ? "bg-emerald-500" : "bg-red-500/80",
                  )}
                  style={{ height: `${Math.max(4, heightPct)}%` }}
                  data-testid={`bar-game-${i}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-around gap-2 mt-1.5">
        {games.map((g, i) => {
          const d = new Date(g.date);
          const dateLbl = `${d.getMonth() + 1}/${d.getDate()}`;
          return (
            <div key={i} className="flex-1 text-center">
              <p className="text-[10px] font-bold text-white tabular-nums">{g.value}</p>
              <p className="text-[9px] text-muted-foreground truncate">{g.opponent}</p>
              <p className="text-[9px] text-muted-foreground/70 tabular-nums">{dateLbl}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 text-center">
        <span className="text-[11px] text-muted-foreground">
          {avg.toFixed(1)} avg last {games.length}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
    </div>
  );
}
