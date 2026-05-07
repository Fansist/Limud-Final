"use client";

// Per-course grade trend chart. Receives an already-shaped series of
// points so the server side can compute everything once.

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type GradeTrendSeries = {
  course: string;
  // Each point is a {label, grade} pair. label is something like "W1"
  // or a short ISO date — caller decides.
  points: Array<{ label: string; grade: number }>;
};

type Props = {
  series: GradeTrendSeries[];
};

const COLORS = ["#1E54B8", "#7DCFB6", "#E8B26B", "#E6A4B4"];

export function GradeTrendChart({ series }: Props): JSX.Element {
  // Recharts needs all points keyed by the same axis. Build a merged
  // data array where each row has all course grades for one label.
  const labels = new Set<string>();
  for (const s of series) {
    for (const p of s.points) labels.add(p.label);
  }
  const sortedLabels = Array.from(labels);
  const merged = sortedLabels.map((label) => {
    const row: Record<string, number | string> = { label };
    for (const s of series) {
      const found = s.points.find((p) => p.label === label);
      if (found) row[s.course] = found.grade;
    }
    return row;
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#F2F1EC" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: "#5B6472", fontSize: 12 }} />
          <YAxis
            domain={[50, 100]}
            tick={{ fill: "#5B6472", fontSize: 12 }}
            width={32}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "0.5rem",
              border: "1px solid #F2F1EC",
              fontSize: "0.875rem"
            }}
          />
          <Legend wrapperStyle={{ fontSize: "0.875rem" }} />
          {series.map((s, idx) => (
            <Line
              key={s.course}
              type="monotone"
              dataKey={s.course}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
