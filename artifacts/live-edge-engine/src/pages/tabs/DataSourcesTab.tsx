import { useGetApiStatus } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Settings, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DataSourcesTab() {
  const { data, isLoading } = useGetApiStatus({
    query: {
      queryKey: ["/api/api-status"]
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-bold text-white">Data Sources & System Status</h2>
      </div>

      {/* Honesty banner — explains why "PrizePicks/Underdog" props are model-generated */}
      <Card className="bg-accent/10 border-accent/30 p-5">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-bold text-white">How Live Edge Engine sources its data</p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="text-primary font-semibold">Games, scores, schedules, rosters and player headshots</span> are
              fetched live from ESPN's public APIs — there is no mock data for these.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="text-accent font-semibold">PrizePicks and Underdog do not publish public APIs.</span> Their
              projection endpoints are gated behind mobile-app authentication and rate-limited per device.
              Live Edge Engine does <span className="text-white">not</span> bypass those protections. Instead, props are
              algorithmically generated for the actual players on tonight's real ESPN rosters using a transparent
              line-bias + recent-form model. Edge scores reflect <span className="text-white">model confidence</span>,
              not posted PrizePicks/Underdog prices.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              To wire up real sportsbook odds (DraftKings, FanDuel) add an <code className="text-primary font-mono">ODDS_API_KEY</code> environment
              variable — see The Odds API card below.
            </p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="h-40 animate-pulse bg-muted/20 border-border" />
          ))}
        </div>
      ) : data?.providers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.providers.map((provider: any) => (
            <Card key={provider.name} className="bg-card border-border p-5">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-base text-white">{provider.name}</h3>
                  <span className={cn(
                    "inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                    provider.status === "live"
                      ? "text-primary border-primary/40 bg-primary/10"
                      : provider.status === "mock"
                      ? "text-accent border-accent/40 bg-accent/10"
                      : "text-destructive border-destructive/40 bg-destructive/10"
                  )}>
                    {provider.status === "live" ? "Live API" : provider.status === "mock" ? "Model / Optional" : "Offline"}
                  </span>
                </div>
                {provider.status === "live" ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : provider.status === "mock" ? (
                  <AlertTriangle className="w-5 h-5 text-accent shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive shrink-0" />
                )}
              </div>

              {provider.description && (
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {provider.description}
                </p>
              )}

              <div className="flex justify-between text-xs pt-3 border-t border-border">
                <span className="text-muted-foreground">Last checked</span>
                <span className="text-white font-mono">{new Date(provider.lastChecked).toLocaleTimeString()}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border border-border border-dashed rounded-lg text-muted-foreground">
          No provider data available.
        </div>
      )}
    </div>
  );
}
