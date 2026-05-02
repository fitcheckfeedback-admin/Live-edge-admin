import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useGetDashboardSummary, useRefreshData } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BetSlipProvider } from "@/lib/betSlip";
import { NavProvider } from "@/lib/navContext";
import { BottomNav } from "@/components/BottomNav";
import OverviewTab from "./tabs/OverviewTab";
import GamesTab from "./tabs/GamesTab";
import PicksTab from "./tabs/PicksTab";
import MyPicksTab from "./tabs/MyPicksTab";
import LiveEdgeTab from "./tabs/LiveEdgeTab";
import AlertsTab from "./tabs/AlertsTab";
import ResultsTab from "./tabs/ResultsTab";
import DataSourcesTab from "./tabs/DataSourcesTab";
import TrackRecordTab from "./tabs/TrackRecordTab";

function HomeInner() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("picks");

  const { data: summary, refetch: refetchSummary } = useGetDashboardSummary({
    query: { queryKey: ["/api/dashboard/summary"] },
  });

  const refreshMutation = useRefreshData({
    mutation: {
      onSuccess: () => {
        toast({ title: "Data Refreshed", description: "Latest odds and edges loaded." });
        refetchSummary();
      },
      onError: () => {
        toast({ title: "Refresh Failed", description: "Could not fetch latest data.", variant: "destructive" });
      },
    },
  });

  return (
    <NavProvider value={{ activeTab, setActiveTab }}>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans dark">
        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-base font-bold tracking-tight text-white truncate">Live Edge Engine</h1>
            </div>

            <div className="flex items-center gap-3">
              {summary && summary.liveGames > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  {summary.liveGames}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                className="gap-2 h-8"
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content — controlled Tabs, no top tab list (bottom nav handles it) */}
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 pb-24">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
              <OverviewTab summary={summary} isLoading={!summary} />
            </TabsContent>
            <TabsContent value="games" className="mt-0 focus-visible:outline-none">
              <GamesTab />
            </TabsContent>
            <TabsContent value="picks" className="mt-0 focus-visible:outline-none">
              <PicksTab />
            </TabsContent>
            <TabsContent value="mypicks" className="mt-0 focus-visible:outline-none">
              <MyPicksTab />
            </TabsContent>
            <TabsContent value="live" className="mt-0 focus-visible:outline-none">
              <LiveEdgeTab />
            </TabsContent>
            <TabsContent value="alerts" className="mt-0 focus-visible:outline-none">
              <AlertsTab />
            </TabsContent>
            <TabsContent value="results" className="mt-0 focus-visible:outline-none">
              <ResultsTab />
            </TabsContent>
            <TabsContent value="trackrecord" className="mt-0 focus-visible:outline-none">
              <TrackRecordTab />
            </TabsContent>
            <TabsContent value="sources" className="mt-0 focus-visible:outline-none">
              <DataSourcesTab />
            </TabsContent>
          </Tabs>
        </main>

        {/* Disclaimer footer (above bottom nav) */}
        <div className="max-w-3xl w-full mx-auto px-4 py-3 pb-16">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest flex items-center justify-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            For research only. Not gambling advice.
          </p>
        </div>

        {/* Fixed Bottom Navigation */}
        <BottomNav alertsCount={summary?.activeAlerts ?? 0} />
      </div>
    </NavProvider>
  );
}

export default function Home() {
  return (
    <BetSlipProvider>
      <HomeInner />
    </BetSlipProvider>
  );
}
