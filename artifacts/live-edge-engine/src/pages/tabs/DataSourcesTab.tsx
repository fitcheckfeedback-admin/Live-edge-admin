import { useGetApiStatus } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DataSourcesTab() {
  const { data, isLoading } = useGetApiStatus({
    query: {
      queryKey: ["/api/status"]
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-bold text-white">System Status</h2>
        {data?.mockMode && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-accent/20 text-accent border border-accent/30">
            MOCK MODE ACTIVE
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="h-32 animate-pulse bg-muted/20 border-border" />
          ))}
        </div>
      ) : data?.providers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.providers.map((provider: any) => (
            <Card key={provider.name} className="bg-card border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-white">{provider.name}</h3>
                {provider.status === "live" ? (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                ) : provider.status === "mock" ? (
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn(
                    "font-bold uppercase tracking-wider text-xs",
                    provider.status === "live" ? "text-primary" : 
                    provider.status === "mock" ? "text-accent" : "text-destructive"
                  )}>
                    {provider.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="text-white font-mono">{provider.mockMode ? "Mock Data" : "Live API"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Checked</span>
                  <span className="text-white font-mono text-xs">{new Date(provider.lastChecked).toLocaleString()}</span>
                </div>
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
