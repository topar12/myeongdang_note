'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ScoreGaugeProps {
  score: number; // 0 to 100
  label?: string;
  trend?: "up" | "down" | "flat";
}

export function ScoreGauge({ score, label, trend }: ScoreGaugeProps) {
  const data = [
    { name: "Score", value: score },
    { name: "Remainder", value: 100 - score },
  ];

  const getColor = (s: number) => {
    if (s >= 80) return "var(--warning-red)";
    if (s >= 50) return "var(--caution-yellow)";
    return "var(--trust-blue)";
  };

  const getTrendIcon = (t?: "up" | "down" | "flat") => {
    switch (t) {
      case "up": return "↑상승";
      case "down": return "↓하락";
      case "flat": return "→유지";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center relative h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={getColor(score)} />
            <Cell fill="var(--color-muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute bottom-4 flex flex-col items-center">
        <span className="text-3xl font-bold">{score}점</span>
        {label && <span className="text-sm font-medium text-muted-foreground mt-1">{label} {getTrendIcon(trend)}</span>}
      </div>
    </div>
  );
}
