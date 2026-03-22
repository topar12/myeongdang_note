import { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AIComment } from "@/components/report/AIComment";

interface ReportCardProps {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  aiComment?: string;
}

export function ReportCard({ icon, title, children, aiComment }: ReportCardProps) {
  return (
    <Card className="rounded-card shadow-card w-full mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[20px] font-bold">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {children}
        {aiComment && <AIComment text={aiComment} />}
      </CardContent>
    </Card>
  );
}
