'use client';

interface ScoreGaugeProps {
  score: number; // 0 to 100
  label?: string;
  trend?: "up" | "down" | "flat";
  size?: number;
}

export function ScoreGauge({ score, label, trend, size = 200 }: ScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  // SVG 반원 게이지 계산
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = size / 2 - 16;
  const strokeWidth = 14;

  // 반원 둘레 (180도)
  const circumference = Math.PI * radius;
  const fillLength = (clampedScore / 100) * circumference;
  const emptyLength = circumference - fillLength;

  // 색상
  const getColor = (s: number) => {
    if (s >= 70) return '#DC2626'; // 빨강 (뜨거움)
    if (s >= 40) return '#F59E0B'; // 노랑
    return '#2563EB'; // 파랑 (차가움)
  };

  const color = getColor(clampedScore);

  const getTrendText = (t?: string) => {
    switch (t) {
      case 'up': return '↑ 상승';
      case 'down': return '↓ 하락';
      case 'flat': return '→ 유지';
      default: return '';
    }
  };

  const getTrendColor = (t?: string) => {
    switch (t) {
      case 'up': return '#16A34A';
      case 'down': return '#DC2626';
      default: return '#94A3B8';
    }
  };

  return (
    <div className="flex flex-col items-center" style={{ width: size, margin: '0 auto' }}>
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
        {/* 배경 트랙 */}
        <path
          d={describeArc(cx, cy, radius, 180, 360)}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* 점수 채우기 */}
        <path
          d={describeArc(cx, cy, radius, 180, 180 + (clampedScore / 100) * 180)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 2px 4px ${color}40)`,
            transition: 'all 0.8s ease-out',
          }}
        />
        {/* 눈금 라벨 */}
        <text x={16} y={cy + 20} fontSize="11" fill="#94A3B8" textAnchor="start">0</text>
        <text x={size - 16} y={cy + 20} fontSize="11" fill="#94A3B8" textAnchor="end">100</text>
      </svg>

      {/* 중앙 숫자 */}
      <div className="flex flex-col items-center -mt-14">
        <span className="text-[42px] font-extrabold leading-none" style={{ color }}>{clampedScore}</span>
        <span className="text-sm text-slate-400 font-medium mt-1">/ 100점</span>
        {(label || trend) && (
          <div className="flex items-center gap-2 mt-2">
            {trend && (
              <span className="text-sm font-bold" style={{ color: getTrendColor(trend) }}>
                {getTrendText(trend)}
              </span>
            )}
            {label && <span className="text-sm text-slate-500">{label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// SVG 호(arc) 경로 생성
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}
