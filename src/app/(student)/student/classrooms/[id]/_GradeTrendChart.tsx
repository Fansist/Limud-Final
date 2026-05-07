"use client";

import {
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type Point = { label: string; grade: number };

export function GradeTrendChart({ data }: { data: Point[] }) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="#F2F1EC" />
          <XAxis dataKey="label" stroke="#5B6472" fontSize={12} />
          <YAxis domain={[50, 100]} stroke="#5B6472" fontSize={12} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #F2F1EC",
              fontSize: 12
            }}
            formatter={(value: number) => `${value}%`}
          />
          <Line
            type="monotone"
            dataKey="grade"
            stroke="#1E54B8"
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
