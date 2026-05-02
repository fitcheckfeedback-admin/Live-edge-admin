import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
  pickIds: Set<number>;
  has: (id: number) => boolean;
  add: (pick: SlipPick) => void;
  remove: (id: number) => void;
  toggle: (pick: SlipPick) => void;
  clear: () => void;
  count: number;
}

const STORAGE_KEY = "live-edge-bet-slip-v1";

const BetSlipContext = createContext<BetSlipContextValue | null>(null);

function loadFromStorage(): SlipPick[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SlipPick[];
  } catch {
    return [];
  }
}

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [picks, setPicks] = useState<SlipPick[]>(() => loadFromStorage());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    } catch {
      // ignore quota errors
    }
  }, [picks]);

  const pickIds = useMemo(() => new Set(picks.map((p) => p.id)), [picks]);

  const add = useCallback((pick: SlipPick) => {
    setPicks((prev) => (prev.find((p) => p.id === pick.id) ? prev : [...prev, pick]));
  }, []);

  const remove = useCallback((id: number) => {
    setPicks((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggle = useCallback((pick: SlipPick) => {
    setPicks((prev) => (prev.find((p) => p.id === pick.id) ? prev.filter((p) => p.id !== pick.id) : [...prev, pick]));
  }, []);

  const clear = useCallback(() => setPicks([]), []);

  const value = useMemo<BetSlipContextValue>(
    () => ({
      picks,
      pickIds,
      has: (id: number) => pickIds.has(id),
      add,
      remove,
      toggle,
      clear,
      count: picks.length,
    }),
    [picks, pickIds, add, remove, toggle, clear],
  );

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

export function useBetSlip(): BetSlipContextValue {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used inside <BetSlipProvider>");
  return ctx;
}
