import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TrafficLightBadgeProps {
  status: "safe" | "caution" | "danger";
  label?: string;
}

export function TrafficLightBadge({ status, label }: TrafficLightBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "safe":
        return { text: label || "안전", bg: "bg-safe-green text-white" };
      case "caution":
        return { text: label || "주의", bg: "bg-caution-yellow text-white" };
      case "danger":
        return { text: label || "위험", bg: "bg-warning-red text-white" };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge className={cn("px-4 py-1.5 text-base font-bold border-none shadow-sm", config.bg)}>
      {config.text}
    </Badge>
  );
}
