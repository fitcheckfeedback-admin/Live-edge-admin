import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface SlipPick {
  id: number;
  sport: string;
  playerName: string;
  playerImage?: string;
  teamAbbr: string;
  teamLogo?: string;
  opponentAbbr: string;
  propType: string;
  line: number;
  recommendation: string;
  side: "Over" | "Under";
  winProbability: number;
  edgeScore: number;
  gameLabel?: string;
  gameStartTime?: string;
  addedAt: string;
}

interface BetSlipContextValue {
  picks: SlipPick[];
  has: (id: number) => boolean;
  getSide: (id: number) => "Over" | "Under" | null;
  add: (pick: SlipPick) => void;
  remove: (id: number) => void;
  toggle: (pick: SlipPick) => void;
  clear: () => void;
  count: number;
  hydrated: boolean;
}

const STORAGE_KEY = "live-edge.bet-slip.v1";

const BetSlipContext = createContext<BetSlipContextValue | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [picks, setPicks] = useState<SlipPick[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from AsyncStorage on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setPicks(parsed as SlipPick[]);
          } catch {
            /* ignore parse errors */
          }
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change (after hydration so we don't overwrite with empty).
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(picks)).catch(() => {});
  }, [picks, hydrated]);

  const sideMap = useMemo(() => {
    const m = new Map<number, "Over" | "Under">();
    for (const p of picks) m.set(p.id, p.side);
    return m;
  }, [picks]);

  const add = useCallback((pick: SlipPick) => {
    setPicks((prev) => (prev.some((p) => p.id === pick.id) ? prev : [...prev, pick]));
  }, []);
  const remove = useCallback((id: number) => {
    setPicks((prev) => prev.filter((p) => p.id !== id));
  }, []);
  const toggle = useCallback((pick: SlipPick) => {
    setPicks((prev) =>
      prev.some((p) => p.id === pick.id)
        ? prev.filter((p) => p.id !== pick.id)
        : [...prev, pick],
    );
  }, []);
  const clear = useCallback(() => setPicks([]), []);

  const value = useMemo<BetSlipContextValue>(
    () => ({
      picks,
      has: (id) => sideMap.has(id),
      getSide: (id) => sideMap.get(id) ?? null,
      add,
      remove,
      toggle,
      clear,
      count: picks.length,
      hydrated,
    }),
    [picks, sideMap, add, remove, toggle, clear, hydrated],
  );

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

export function useBetSlip(): BetSlipContextValue {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used inside <BetSlipProvider>");
  return ctx;
}
