import { Lightbulb } from "lucide-react";

interface AICommentProps {
  text: string;
}

export function AIComment({ text }: AICommentProps) {
  return (
    <div className="flex items-start gap-3 p-5 bg-trust-blue/5 rounded-xl border border-trust-blue/20 shadow-sm">
      <Lightbulb className="h-7 w-7 text-trust-blue shrink-0 mt-0.5" />
      <p className="text-[18px] text-foreground leading-relaxed font-medium">
        {text}
      </p>
    </div>
  );
}
