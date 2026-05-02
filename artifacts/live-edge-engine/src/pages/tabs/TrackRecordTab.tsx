import { useState } from "react";
import { useGetTrackRecord, useGradeTrackRecord } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, RefreshCw, TrendingUp, Trophy, Target, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type WindowKey = "7d" | "30d" | "all";

interface Bucket {
  label: string;
  graded: number;
  hits: number;
  misses: number;
  pushes: number;
  dnp: number;
  pending: number;
  hitRate: number;
}

function rateColor(rate: number, graded: number): string {
  if (graded < 5) return "text-muted-foreground";
  if (rate >= 60) return "text-emerald-400";
  if (rate >= 52) return "text-emerald-300";
  if (rate >= 47) return "text-yellow-300";
  return "text-rose-400";
}

function StatCard({
  icon: Icon,
  title,
  bucket,
  emphasize,
}: {
  icon: typeof BarChart3;
  title: string;
  bucket: Bucket;
  emphasize?: boolean;
}) {
  const noData = bucket.graded === 0;
  return (
    <Card
      className={cn(
        "p-4 border",
        emphasize ? "bg-primary/5 border-primary/30" : "bg-card/60 border-border",
      )}
      data-testid={`statcard-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn("w-4 h-4 shrink-0", emphasize ? "text-primary" : "text-muted-foreground")} />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{title}</p>
        </div>
      </div>
      {noData ? (
        <p className="text-sm text-muted-foreground italic">Awaiting graded picks</p>
      ) : (
        <>
          <p className={cn("text-3xl font-bold tabular-nums leading-none", rateColor(bucket.hitRate, bucket.graded))}>
            {bucket.hitRate}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
            {bucket.hits}–{bucket.misses}
            {bucket.pushes > 0 && <span className="opacity-70"> · {bucket.pushes}P</span>}
            {bucket.dnp > 0 && <span className="opacity-70"> · {bucket.dnp} DNP</span>}
            {bucket.pending > 0 && <span className="opacity-70"> · {bucket.pending} pend</span>}
          </p>
        </>
      )}
    </Card>
  );
}

function BucketRow({ bucket, highlight }: { bucket: Bucket; highlight?: boolean }) {
  const noData = bucket.graded === 0;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border",
        highlight ? "bg-primary/5 border-primary/30" : "bg-background/40 border-border",
      )}
      data-testid={`bucket-${bucket.label.toLowerCase().replace(/[^\w]+/g, "-")}`}
    >
      <p className="text-sm font-medium text-white truncate min-w-0 flex-1">{bucket.label}</p>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {bucket.hits}–{bucket.misses}
          {bucket.pushes > 0 && ` · ${bucket.pushes}P`}
        </span>
        <span className={cn("text-sm font-bold tabular-nums w-14 text-right", rateColor(bucket.hitRate, bucket.graded))}>
          {noData ? "—" : `${bucket.hitRate}%`}
        </span>
      </div>
    </div>
  );
}

function ResultPill({ result }: { result: string }) {
  const map: Record<string, string> = {
    HIT: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    MISS: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    PUSH: "bg-yellow-500/20 text-yellow-200 border-yellow-500/40",
    DNP: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase", map[result] ?? map.DNP)}>
      {result}
    </span>
  );
}

export default function TrackRecordTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [window, setWindow] = useState<WindowKey>("30d");

  const { data, isLoading, refetch } = useGetTrackRecord(
    { window },
    { query: { queryKey: ["/api/track-record", window] } },
  );

  const gradeMutation = useGradeTrackRecord({
    mutation: {
      onSuccess: (res) => {
        toast({ title: "Grading complete", description: res.message });
        queryClient.invalidateQueries({ queryKey: ["/api/track-record"] });
        refetch();
      },
      onError: () => {
        toast({ title: "Grading failed", description: "Could not grade pending picks.", variant: "destructive" });
      },
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="h-24 bg-muted/20 rounded-lg animate-pulse" />
        <div className="h-40 bg-muted/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  const tierLabels: Record<string, string> = {
    "Tier 1": "T1: Balanced + volume",
    "Tier 2": "T2: Balanced",
    "Tier 3": "T3: Volume only",
    "Tier 4": "T4: Fallback",
    "Non-Best": "Other recommended picks",
  };

  return (
    <div className="space-y-5" data-testid="trackrecord-tab">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Track Record
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            Every recommended pick is auto-snapshotted daily, then graded against real game logs.
            The system uses these results to auto-tune which Best Pick tiers it favors.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => gradeMutation.mutate(undefined)}
          disabled={gradeMutation.isPending}
          className="gap-2 h-8 shrink-0"
          data-testid="button-grade-now"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", gradeMutation.isPending && "animate-spin")} />
          Grade now
        </Button>
      </div>

      {/* Window selector */}
      <Tabs value={window} onValueChange={(v) => setWindow(v as WindowKey)}>
        <TabsList className="grid grid-cols-3 w-full bg-muted/30">
          <TabsTrigger value="7d" data-testid="window-7d">Last 7 days</TabsTrigger>
          <TabsTrigger value="30d" data-testid="window-30d">Last 30 days</TabsTrigger>
          <TabsTrigger value="all" data-testid="window-all">All time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Headline stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={Trophy} title="Best Picks" bucket={data.bestPicks as Bucket} emphasize />
        <StatCard icon={Target} title="Other Picks" bucket={data.otherPicks as Bucket} />
        <StatCard icon={TrendingUp} title="Overall" bucket={data.overall as Bucket} />
      </div>

      {/* By tier (auto-tune driver) */}
      <Card className="p-4 bg-card/60 border-border">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">By Best-Pick Tier</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
          Tiers with ≥10 graded picks adjust the model's pick weighting. Tier weights refresh hourly.
        </p>
        <div className="space-y-1.5">
          {(data.byTier as Bucket[]).length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No graded picks yet — check back tomorrow.</p>
          ) : (
            (data.byTier as Bucket[]).map((b) => (
              <BucketRow
                key={b.label}
                bucket={{ ...b, label: tierLabels[b.label] ?? b.label }}
                highlight={b.label.startsWith("Tier")}
              />
            ))
          )}
        </div>
      </Card>

      {/* By sport */}
      <Card className="p-4 bg-card/60 border-border">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">By Sport</h3>
        <div className="space-y-1.5">
          {(data.bySport as Bucket[]).length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No graded picks yet.</p>
          ) : (
            (data.bySport as Bucket[]).map((b) => <BucketRow key={b.label} bucket={b} />)
          )}
        </div>
      </Card>

      {/* By prop type */}
      <Card className="p-4 bg-card/60 border-border">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">By Prop Type</h3>
        <div className="space-y-1.5">
          {(data.byPropType as Bucket[]).length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No graded picks yet.</p>
          ) : (
            (data.byPropType as Bucket[]).slice(0, 12).map((b) => <BucketRow key={b.label} bucket={b} />)
          )}
        </div>
      </Card>

      {/* Recent graded picks */}
      <Card className="p-4 bg-card/60 border-border">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
          Recent Graded ({data.recent.length})
        </h3>
        {data.recent.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            Snapshots from today's slate will be graded after games finish.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {data.recent.slice(0, 25).map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 py-2 text-xs"
                data-testid={`recent-pick-${p.id}`}
              >
                <ResultPill result={p.result} />
                <span className="text-muted-foreground tabular-nums w-16 shrink-0">{p.date.slice(5)}</span>
                <span className="text-white font-medium truncate flex-1 min-w-0">{p.playerName}</span>
                <span className="text-muted-foreground truncate shrink-0">
                  {p.propType} {p.side === "Over" ? "O" : "U"}{p.line}
                </span>
                {p.actualValue != null && (
                  <span className="text-white font-bold tabular-nums shrink-0 w-8 text-right">{p.actualValue}</span>
                )}
                {p.isBestPick && (
                  <span className="text-[9px] font-bold text-primary uppercase shrink-0">★</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
