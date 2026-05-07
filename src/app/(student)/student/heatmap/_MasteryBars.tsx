"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type Row = {
  topic: string;
  mastery: number; // 0..100
  ci: number; // confidence interval half-width, 0..100
};

function colorFor(m: number): string {
  if (m >= 80) return "#3FA66B"; // ok
  if (m >= 60) return "#7DCFB6"; // mint
  if (m >= 40) return "#D89B2C"; // warn
  return "#C45C5C"; // alert
}

export function MasteryBars({ data }: { data: Row[] }) {
  const height = Math.max(220, data.length * 44);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#F2F1EC" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} stroke="#5B6472" fontSize={12} />
          <YAxis
            type="category"
            dataKey="topic"
            stroke="#5B6472"
            fontSize={12}
            width={180}
            interval={0}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #F2F1EC",
              fontSize: 12
            }}
            formatter={(value: number) => `${Math.round(value)}%`}
          />
          <Bar dataKey="mastery" isAnimationActive={false} radius={4}>
            {data.map((row) => (
              <Cell key={row.topic} fill={colorFor(row.mastery)} />
            ))}
            <ErrorBar dataKey="ci" width={4} stroke="#5B6472" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
