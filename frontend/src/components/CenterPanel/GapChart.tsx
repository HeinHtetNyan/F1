import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useRaceStore } from '../../store/raceStore';
import { useLiveStore } from '../../store/liveStore';
import { TEAM_COLORS } from '../../data/f1Data';

const FALLBACK_CODES = ['NOR', 'LEC', 'HAM'];

const CustomTooltip = React.memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[--panel2] border border-[--border] rounded px-2 py-1.5">
      <p className="font-mono text-[9px] text-[--text-muted] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-mono text-[10px]" style={{ color: p.color }}>
          {p.dataKey}: +{p.value?.toFixed(3)}s
        </p>
      ))}
    </div>
  );
});

export const GapChart = React.memo(function GapChart() {
  const liveLapHistory = useLiveStore(s => s.lapHistory);
  const simLapHistory  = useRaceStore(s => s.lapHistory);
  const liveChartCodes = useLiveStore(s => s.chartCodes);
  const lapHistory = liveLapHistory.length >= 2 ? liveLapHistory : simLapHistory;

  // Top code = P1 leader; remaining codes = P2-P4
  const allCodes   = liveChartCodes.length > 0 ? liveChartCodes : ['VER', ...FALLBACK_CODES];
  const leaderCode = allCodes[0];
  const gapCodes   = allCodes.slice(1);

  const gapData = lapHistory.map(point => {
    const base = (point[leaderCode] as number | undefined) ?? 0;
    const row: Record<string, unknown> = { lap: point.lap };
    for (const code of gapCodes) {
      const v = point[code] as number | undefined;
      if (v != null && base > 0) row[code] = +(v - base).toFixed(3);
    }
    return row;
  });

  return (
    <div className="w-full h-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={gapData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {gapCodes.map(code => (
              <linearGradient key={code} id={`grad-${code}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={TEAM_COLORS[code] ?? '#6b7280'} stopOpacity={0.15} />
                <stop offset="95%" stopColor={TEAM_COLORS[code] ?? '#6b7280'} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false} />
          <XAxis
            dataKey="lap"
            tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fill: '#6b7280' }}
            axisLine={{ stroke: '#1e2130' }}
            tickLine={false}
            height={16}
          />
          <YAxis
            tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={v => `+${v.toFixed(1)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          {gapCodes.map(code => (
            <Area
              key={code}
              type="monotone"
              dataKey={code}
              stroke={TEAM_COLORS[code] ?? '#6b7280'}
              strokeWidth={1.5}
              fill={`url(#grad-${code})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
