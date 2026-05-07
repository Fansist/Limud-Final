"use client";

// Tiny sparkline used in the classroom card. Recharts is client-only.

import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

type Props = {
  data: Array<{ x: number; grade: number }>;
  color?: string;
  height?: number;
};

export function GradeSparkline({ data, color = "#1E54B8", height = 48 }: Props) {
  if (data.length === 0) return null;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
          <Line
            type="monotone"
            dataKey="grade"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
