import { useEffect, useState } from "react";
import { msToCountdown, type CountdownParts } from "../utils/format";

/**
 * Cuenta regresiva hasta `targetDate`, recalculando cada segundo contra la
 * hora del servidor (getServerNow), no contra Date.now() directo.
 */
export function useCountdown(targetDate: Date, getServerNow: () => Date): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>(() =>
    msToCountdown(targetDate.getTime() - getServerNow().getTime())
  );

  useEffect(() => {
    const tick = () => setParts(msToCountdown(targetDate.getTime() - getServerNow().getTime()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate, getServerNow]);

  return parts;
}
