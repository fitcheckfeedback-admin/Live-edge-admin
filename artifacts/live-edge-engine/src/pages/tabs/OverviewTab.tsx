export default function OverviewTab({ summary, isLoading }: { summary: any, isLoading: boolean }) {
  if (isLoading || !summary) return <div className="text-center p-12 text-muted-foreground">Loading overview...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-lg">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Total Games</p>
          <p className="text-3xl font-mono font-bold text-white">{summary.totalGamesToday}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-lg">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Strong Plays</p>
          <p className="text-3xl font-mono font-bold text-primary">{summary.strongPlays}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-lg">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Total Props</p>
          <p className="text-3xl font-mono font-bold text-white">{summary.totalProps}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-lg">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Avg Edge</p>
          <p className="text-3xl font-mono font-bold text-accent">{summary.avgEdgeScore.toFixed(1)}</p>
        </div>
      </div>
      
      <div className="bg-card border border-border p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-4">Top Edge Prop</h2>
        {summary.topEdgeProp ? (
          <div className="flex items-center justify-between p-4 bg-background rounded border border-border">
            <div className="flex items-center gap-4">
              {summary.topEdgeProp.playerImage ? (
                <img src={summary.topEdgeProp.playerImage} alt="" className="w-12 h-12 rounded-full border border-border object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  NA
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-white">{summary.topEdgeProp.playerName}</p>
                <p className="text-sm text-muted-foreground">{summary.topEdgeProp.propType} • Line: {summary.topEdgeProp.line}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-primary text-primary-foreground mb-1">
                {summary.topEdgeProp.edgeScore.toFixed(1)} EDGE
              </div>
              <p className="text-sm font-medium text-white">{summary.topEdgeProp.recommendation}</p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No top prop available.</p>
        )}
      </div>
    </div>
  );
}
