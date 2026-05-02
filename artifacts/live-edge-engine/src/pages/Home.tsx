import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetDashboardSummary, useRefreshData, useHealthCheck } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, AlertTriangle, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OverviewTab from "./tabs/OverviewTab";
import GamesTab from "./tabs/GamesTab";
import PicksTab from "./tabs/PicksTab";
import LiveEdgeTab from "./tabs/LiveEdgeTab";
import AlertsTab from "./tabs/AlertsTab";
import ResultsTab from "./tabs/ResultsTab";
import DataSourcesTab from "./tabs/DataSourcesTab";

export default function Home() {
  const { toast } = useToast();
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useGetDashboardSummary({
    query: {
      queryKey: ["/api/dashboard/summary"]
    }
  });

  const refreshMutation = useRefreshData({
    mutation: {
      onSuccess: () => {
        toast({ title: "Data Refreshed", description: "Latest odds and edges loaded." });
        refetchSummary();
      },
      onError: () => {
        toast({ title: "Refresh Failed", description: "Could not fetch latest data.", variant: "destructive" });
      }
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans dark">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-white">Live Edge Engine</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {summary && summary.liveGames > 0 && (
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {summary.liveGames} Live
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 mb-6 border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="games">Today's Games</TabsTrigger>
            <TabsTrigger value="picks">Best Picks</TabsTrigger>
            <TabsTrigger value="live">Live Edge</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
              {summary && summary.activeAlerts > 0 && (
                <span className="ml-2 rounded-full bg-destructive w-5 h-5 flex items-center justify-center text-[10px] text-white">
                  {summary.activeAlerts}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="results">Results Tracker</TabsTrigger>
            <TabsTrigger value="sources">Data Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
            <OverviewTab summary={summary} isLoading={summaryLoading} />
          </TabsContent>
          <TabsContent value="games" className="mt-0 focus-visible:outline-none">
            <GamesTab />
          </TabsContent>
          <TabsContent value="picks" className="mt-0 focus-visible:outline-none">
            <PicksTab />
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
          <TabsContent value="sources" className="mt-0 focus-visible:outline-none">
            <DataSourcesTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-auto">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            For research purposes only. Does not constitute gambling advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
