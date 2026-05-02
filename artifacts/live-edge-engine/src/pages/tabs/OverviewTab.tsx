import { EdgeBadge } from "@/components/EdgeBadge";
import { WinProbBadge } from "@/components/WinProbBadge";

function StatCard({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="bg-card border border-border p-4 rounded-lg">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <p className={`text-3xl font-mono font-black ${className ?? "text-white"}`}>{value}</p>
    </div>
  );
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

export default function OverviewTab({ summary, isLoading }: { summary: any; isLoading: boolean }) {
  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border p-4 rounded-lg h-20 animate-pulse" />
          ))}
        </div>
        <div className="bg-card border border-border p-6 rounded-lg h-28 animate-pulse" />
      </div>
    );
  }

  const top = summary.topEdgeProp;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Games Today"   value={summary.totalGamesToday} />
        <StatCard label="Strong Plays"  value={summary.strongPlays}     className="text-primary" />
        <StatCard label="Total Props"   value={summary.totalProps} />
        <StatCard label="Avg Edge"      value={summary.avgEdgeScore.toFixed(1)} className="text-accent" />
      </div>

      {/* Top edge prop */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Top Edge Prop Today</h2>
        </div>
        {top ? (
          <div className="p-5 flex items-center gap-4">
            <PlayerAvatar src={top.playerImage} name={top.playerName} />
            <div className="flex-1 min-w-0">
              <p className="text-xl font-black text-white leading-tight">{top.playerName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {top.propType} &middot; Line: <strong className="text-white font-mono">{top.line}</strong>
              </p>
              <div className="flex items-center gap-2 mt-2">
                {top.teamLogo && (
                  <img
                    src={top.teamLogo}
                    alt={top.teamAbbr}
                    className="w-5 h-5 object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <span className="text-xs text-muted-foreground">{top.teamAbbr} vs {top.opponentAbbr}</span>
              </div>
            </div>
            <div className="text-right shrink-0 space-y-2 flex flex-col items-end">
              {typeof top.winProbability === "number" && (
                <WinProbBadge probability={top.winProbability} size="lg" />
              )}
              <EdgeBadge score={top.edgeScore} />
              <p className={`text-sm font-bold ${top.recommendation.includes("Over") ? "text-emerald-400" : top.recommendation.includes("Under") ? "text-red-400" : "text-muted-foreground"}`}>
                {top.recommendation}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">No top prop available.</div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground/50 text-center uppercase tracking-widest">
        For research purposes only. Does not constitute gambling advice.
      </p>
    </div>
  );
}
