import { useGetResults, useUpdateResult } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ResultsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data, isLoading } = useGetResults({}, {
    query: {
      queryKey: ["/api/results", {}]
    }
  });

  const updateMutation = useUpdateResult({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/results"] });
        toast({ title: "Result Updated", description: "The result status has been updated." });
      }
    }
  });

  const handleExport = () => {
    // Basic CSV generation for frontend
    if (!data?.results) return;
    const headers = ["Date", "Sport", "Player", "Prop", "Line", "Status", "P/L"];
    const csvContent = [
      headers.join(","),
      ...data.results.map(r => 
        `"${r.date}","${r.sport}","${r.playerName}","${r.propType}","${r.line}","${r.status}","${r.profitLoss || 0}"`
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "live_edge_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Win": return "text-primary bg-primary/10";
      case "Loss": return "text-destructive bg-destructive/10";
      case "Push": return "text-accent bg-accent/10";
      default: return "text-muted-foreground bg-muted/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="bg-card border border-border px-4 py-2 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
            <p className="font-mono font-bold text-lg text-white">{data?.summary?.winRate ? data.summary.winRate.toFixed(1) : 0}%</p>
          </div>
          <div className="bg-card border border-border px-4 py-2 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Profit/Loss</p>
            <p className={cn("font-mono font-bold text-lg", (data?.summary?.totalProfitLoss || 0) >= 0 ? "text-primary" : "text-destructive")}>
              {(data?.summary?.totalProfitLoss || 0) >= 0 ? "+" : ""}{data?.summary?.totalProfitLoss || 0}u
            </p>
          </div>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Matchup</TableHead>
                <TableHead className="text-muted-foreground">Player</TableHead>
                <TableHead className="text-muted-foreground">Prop</TableHead>
                <TableHead className="text-muted-foreground">Rec.</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading results...</TableCell>
                </TableRow>
              ) : data?.results && data.results.length > 0 ? (
                data.results.map((result: any) => (
                  <TableRow key={result.id} className="border-border hover:bg-muted/10 transition-colors">
                    <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {new Date(result.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-bold text-white">{result.sport}</span> • {result.teamAbbr} v {result.opponentAbbr}
                    </TableCell>
                    <TableCell className="font-medium text-white">{result.playerName}</TableCell>
                    <TableCell className="font-mono text-sm">{result.propType} <span className="text-muted-foreground">{result.line}</span></TableCell>
                    <TableCell className="text-xs">{result.recommendation}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-7 px-2 text-xs font-bold w-24 justify-between border border-transparent", getStatusColor(result.status))}>
                            {result.status}
                            <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          {["Pending", "Win", "Loss", "Push", "DNP", "Line Removed"].map((s) => (
                            <DropdownMenuItem 
                              key={s} 
                              onClick={() => {
                                if (s !== result.status) {
                                  updateMutation.mutate({ id: result.id, data: { status: s as any } })
                                }
                              }}
                              className="text-xs focus:bg-muted"
                            >
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground border-dashed">No results found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
