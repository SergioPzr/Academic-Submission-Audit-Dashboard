import { createContext, useContext, type ReactNode } from "react";
import { useServerTimeSync } from "../hooks/useServerTimeSync";

interface ServerTimeContextValue {
  getServerNow: () => Date;
  synced: boolean;
}

const ServerTimeContext = createContext<ServerTimeContextValue | null>(null);

export function ServerTimeProvider({ children }: { children: ReactNode }) {
  const value = useServerTimeSync();
  return <ServerTimeContext.Provider value={value}>{children}</ServerTimeContext.Provider>;
}

export function useServerTime() {
  const ctx = useContext(ServerTimeContext);
  if (!ctx) throw new Error("useServerTime debe usarse dentro de <ServerTimeProvider>");
  return ctx;
}
