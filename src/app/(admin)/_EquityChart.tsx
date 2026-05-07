"use client";

// Equity view chart: average mastery split by learning style for one
// subject. Horizontal bars, all four canonical styles always shown so a
// missing bar is itself a signal.

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type EquityRow = {
  style: string;
  mastery: number;
};

type Props = {
  rows: EquityRow[];
};

export function EquityChart({ rows }: Props) {
  const data = rows.map((r) => ({
    style: r.style.replace(/_/g, " "),
    mastery: Math.round(r.mastery * 100)
  }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, left: 16, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F2F1EC" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#5B6472", fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="style"
            tick={{ fill: "#1B2028", fontSize: 12 }}
            width={110}
          />
          <Tooltip
            cursor={{ fill: "rgba(47,111,224,0.06)" }}
            formatter={(value: number | string) => [`${value}%`, "Avg mastery"]}
          />
          <Bar dataKey="mastery" fill="#1E54B8" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
