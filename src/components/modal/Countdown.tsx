import { useCountdown } from "../../hooks/useCountdown";
import { useServerTime } from "../../providers/ServerTimeProvider";
import { pad } from "../../utils/format";
import { Badge } from "../ui/Badge";

interface CountdownProps {
  closeDate: Date;
}

const URGENT_THRESHOLD_MS = 3 * 3600 * 1000; // 3 horas

export function Countdown({ closeDate }: CountdownProps) {
  const { getServerNow, synced } = useServerTime();
  const parts = useCountdown(closeDate, getServerNow);

  if (!synced) {
    return (
      <div className="countdown-block">
        <span style={{ color: "var(--text-3)", fontSize: 13 }}>Sincronizando hora del servidor…</span>
      </div>
    );
  }

  const msRemaining = closeDate.getTime() - getServerNow().getTime();
  const urgent = !parts.done && msRemaining < URGENT_THRESHOLD_MS;
  const numClass = urgent ? "countdown-num urgent" : "countdown-num";

  return (
    <div className="countdown-block">
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".6px",
            color: "var(--text-3)",
            marginBottom: 8,
            fontWeight: 500,
          }}
        >
          ⏱ Tiempo restante
        </div>

        {parts.done ? (
          <div className="countdown-num closed" style={{ fontSize: 14, minWidth: "auto", padding: "8px 14px" }}>
            Tiempo agotado
          </div>
        ) : (
          <div className="countdown-timer">
            {parts.days > 0 && (
              <>
                <div className="countdown-unit">
                  <div className={numClass}>{pad(parts.days)}</div>
                  <div className="countdown-label">días</div>
                </div>
                <span className="countdown-sep">:</span>
              </>
            )}
            <div className="countdown-unit">
              <div className={numClass}>{pad(parts.hours)}</div>
              <div className="countdown-label">horas</div>
            </div>
            <span className="countdown-sep">:</span>
            <div className="countdown-unit">
              <div className={numClass}>{pad(parts.minutes)}</div>
              <div className="countdown-label">min</div>
            </div>
            <span className="countdown-sep">:</span>
            <div className="countdown-unit">
              <div className={numClass}>{pad(parts.seconds)}</div>
              <div className="countdown-label">seg</div>
            </div>
          </div>
        )}
      </div>

      <div>
        {parts.done ? (
          <Badge label="Cerrado" badgeClass="badge-red" icon="🔒" />
        ) : urgent ? (
          <Badge label="Urgente" badgeClass="badge-amber" icon="⚠️" />
        ) : (
          <Badge label="Abierto" badgeClass="badge-green" icon="🟢" />
        )}
      </div>
    </div>
  );
}
