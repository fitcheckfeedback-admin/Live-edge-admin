import { createContext, useContext, type ReactNode } from "react";

interface NavContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({
  value,
  children,
}: {
  value: NavContextValue;
  children: ReactNode;
}) {
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used inside <NavProvider>");
  return ctx;
}
