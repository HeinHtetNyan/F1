import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useRaceStore } from '../../store/raceStore';
import { useLiveStore } from '../../store/liveStore';
import { TEAM_COLORS } from '../../data/f1Data';

const FALLBACK_CODES = ['VER', 'NOR', 'LEC', 'HAM'];

const CustomTooltip = React.memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[--panel2] border border-[--border] rounded px-2 py-1.5">
      <p className="font-mono text-[9px] text-[--text-muted] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-mono text-[10px]" style={{ color: p.color }}>
          {p.dataKey}: {p.value?.toFixed(3)}s
        </p>
      ))}
    </div>
  );
});

export const LapTimeChart = React.memo(function LapTimeChart() {
  const liveLapHistory = useLiveStore(s => s.lapHistory);
  const simLapHistory  = useRaceStore(s => s.lapHistory);
  const liveChartCodes = useLiveStore(s => s.chartCodes);
  const lapHistory = liveLapHistory.length >= 2 ? liveLapHistory : simLapHistory;
  const codes      = liveChartCodes.length > 0 ? liveChartCodes : FALLBACK_CODES;

  return (
    <div className="w-full h-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={lapHistory} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false} />
          <XAxis
            dataKey="lap"
            tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fill: '#6b7280' }}
            axisLine={{ stroke: '#1e2130' }}
            tickLine={false}
            height={16}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={v => v.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={5}
            wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, paddingTop: 0 }}
          />
          {codes.map(code => (
            <Line
              key={code}
              type="monotone"
              dataKey={code}
              stroke={TEAM_COLORS[code] ?? '#6b7280'}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
