import React, { useMemo } from 'react';
import type { PuntoGrafico } from '../../services/adminService';

interface GraficoTransaccionesProps {
  datos: PuntoGrafico[];
  dias?: number;
}

const GraficoTransacciones: React.FC<GraficoTransaccionesProps> = ({ datos, dias = 14 }) => {
  const W = 700;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Fill missing days with 0
  const filled = useMemo(() => {
    const map = new Map(datos.map((d) => [d.fecha, d.total]));
    const result: PuntoGrafico[] = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result.push({ fecha: key, total: map.get(key) ?? 0 });
    }
    return result;
  }, [datos, dias]);

  const maxVal = Math.max(...filled.map((d) => d.total), 1);

  const xScale = (i: number) => PAD.left + (i / (filled.length - 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  const points = filled.map((d, i) => ({ x: xScale(i), y: yScale(d.total), ...d }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M${points[0].x},${points[0].y}`,
    ...points.slice(1).map((p) => `L${p.x},${p.y}`),
    `L${points[points.length - 1].x},${PAD.top + innerH}`,
    `L${points[0].x},${PAD.top + innerH}`,
    'Z',
  ].join(' ');

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxVal));

  // X axis: show every ~3 labels
  const xLabels = filled
    .map((d, i) => ({ ...d, i }))
    .filter((_, i) => i % Math.ceil(filled.length / 7) === 0 || i === filled.length - 1);

  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  return (
    <div className="grafico-wrapper">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Gráfico de transacciones"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((val) => (
          <g key={val}>
            <line
              x1={PAD.left}
              y1={yScale(val)}
              x2={PAD.left + innerW}
              y2={yScale(val)}
              stroke="#E5E7EB"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={PAD.left - 8}
              y={yScale(val) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#6B7280"
            >
              {val}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#22C55E"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? 6 : 4}
              fill={hoveredIdx === i ? '#1A3D2B' : '#22C55E'}
              stroke="#fff"
              strokeWidth={2}
              style={{ cursor: 'pointer', transition: 'r 0.15s' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            {hoveredIdx === i && (
              <g>
                <rect
                  x={p.x - 42}
                  y={p.y - 38}
                  width={84}
                  height={28}
                  rx={6}
                  fill="#1A3D2B"
                />
                <text x={p.x} y={p.y - 21} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>
                  {p.total} ops
                </text>
                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.7)">
                  {p.fecha}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* X axis labels */}
        {xLabels.map(({ i, fecha }) => (
          <text
            key={i}
            x={xScale(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fill="#6B7280"
          >
            {fecha.slice(5)} {/* MM-DD */}
          </text>
        ))}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="#E5E7EB" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="#E5E7EB" strokeWidth={1} />
      </svg>
    </div>
  );
};

export default GraficoTransacciones;
