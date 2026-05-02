import { useGetAlerts, useMarkAlertRead } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function AlertsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetAlerts(
    { unreadOnly: false },
    {
      query: {
        queryKey: ["/api/alerts", { unreadOnly: false }],
        refetchInterval: 15000,
      }
    }
  );

  const markReadMutation = useMarkAlertRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      }
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high": return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "medium": return <AlertCircle className="w-5 h-5 text-accent" />;
      case "low": return <Info className="w-5 h-5 text-primary" />;
      default: return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <Card key={i} className="h-24 animate-pulse bg-muted/20 border-border" />
          ))}
        </div>
      ) : data?.alerts && data.alerts.length > 0 ? (
        <div className="space-y-3">
          {data.alerts.map((alert: any) => (
            <Card 
              key={alert.id} 
              className={cn(
                "p-4 border-l-4 border-y-border border-r-border flex items-start gap-4 transition-colors",
                alert.severity === "high" ? "border-l-destructive" :
                alert.severity === "medium" ? "border-l-accent" : "border-l-primary",
                alert.isRead ? "opacity-60 bg-card/50" : "bg-card"
              )}
            >
              <div className="mt-1">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-white text-sm">{alert.title}</h4>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                {alert.edgeScore && (
                  <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-background border border-border text-white">
                    EDGE: {alert.edgeScore.toFixed(1)}
                  </span>
                )}
              </div>
              {!alert.isRead && (
                <button 
                  onClick={() => markReadMutation.mutate({ id: alert.id })}
                  disabled={markReadMutation.isPending}
                  className="p-2 text-muted-foreground hover:text-white transition-colors"
                  title="Mark as read"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border border-border border-dashed rounded-lg text-muted-foreground">
          No alerts at this time.
        </div>
      )}
    </div>
  );
}
