import { useState } from "react";
import { LayoutGrid, Calendar, Receipt, Bell, MoreHorizontal, Activity, Trophy, Database, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBetSlip } from "@/lib/betSlip";
import { useNav } from "@/lib/navContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavItem {
  value: string;
  label: string;
  icon: typeof LayoutGrid;
  badge?: number;
}

interface BottomNavProps {
  alertsCount?: number;
}

const PRIMARY_TABS: { value: string; label: string; icon: typeof LayoutGrid }[] = [
  { value: "picks", label: "Board", icon: LayoutGrid },
  { value: "games", label: "Games", icon: Calendar },
  { value: "mypicks", label: "My Picks", icon: Receipt },
  { value: "alerts", label: "Alerts", icon: Bell },
];

const MORE_TABS: { value: string; label: string; icon: typeof LayoutGrid; description: string }[] = [
  { value: "overview", label: "Overview", icon: HomeIcon, description: "Top stats and the day's biggest edge" },
  { value: "live", label: "Live Edge", icon: Activity, description: "In-game projections updated every 15s" },
  { value: "results", label: "Results", icon: Trophy, description: "Hit/miss tracker and CSV export" },
  { value: "sources", label: "Data Sources", icon: Database, description: "Provider status and transparency" },
];

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`bottomnav-${item.value}`}
      className={cn(
        "relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-w-0",
        isActive ? "text-primary" : "text-muted-foreground hover:text-white",
      )}
    >
      <div className="relative">
        <Icon className="w-5 h-5" />
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={cn(
              "absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center",
              item.value === "alerts"
                ? "bg-destructive text-white"
                : "bg-primary text-primary-foreground",
            )}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-semibold leading-none truncate max-w-full">{item.label}</span>
      {isActive && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full" />
      )}
    </button>
  );
}

export function BottomNav({ alertsCount = 0 }: BottomNavProps) {
  const { activeTab, setActiveTab } = useNav();
  const slip = useBetSlip();
  const [moreOpen, setMoreOpen] = useState(false);

  const items: NavItem[] = PRIMARY_TABS.map((t) => {
    if (t.value === "mypicks") return { ...t, badge: slip.count };
    if (t.value === "alerts") return { ...t, badge: alertsCount };
    return t;
  });

  const isInMoreSection = MORE_TABS.some((t) => t.value === activeTab);

  return (
    <nav
      aria-label="Primary"
      data-testid="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-3xl mx-auto flex items-stretch h-14">
        {items.map((item) => (
          <NavButton
            key={item.value}
            item={item}
            isActive={activeTab === item.value}
            onClick={() => setActiveTab(item.value)}
          />
        ))}

        {/* "More" button → opens sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              data-testid="bottomnav-more"
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors min-w-0",
                isInMoreSection ? "text-primary" : "text-muted-foreground hover:text-white",
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-semibold leading-none">More</span>
              {isInMoreSection && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-card border-t border-border max-h-[80vh]">
            <SheetHeader>
              <SheetTitle className="text-white">More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pb-6">
              {MORE_TABS.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setActiveTab(t.value);
                      setMoreOpen(false);
                    }}
                    data-testid={`more-${t.value}`}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border text-left transition-colors",
                      isActive
                        ? "bg-primary/10 border-primary/40 text-white"
                        : "bg-background/40 border-border hover:border-primary/40 text-foreground",
                    )}
                  >
                    <div className={cn("rounded-lg p-2 shrink-0", isActive ? "bg-primary/20" : "bg-muted/40")}>
                      <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-tight">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
