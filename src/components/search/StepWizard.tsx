import { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

export interface Step {
  id: number;
  label: string;
}

interface StepWizardProps {
  currentStep: number;
  steps: Step[];
  children: ReactNode;
}

export function StepWizard({ currentStep, steps, children }: StepWizardProps) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="w-full p-4 bg-background sticky top-14 z-40 border-b">
        <div className="flex items-center justify-between mb-4 px-2">
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shadow-sm transition-colors
                  ${isCompleted ? 'bg-trust-blue text-white' : isCurrent ? 'bg-trust-blue/10 text-trust-blue ring-2 ring-trust-blue' : 'bg-muted text-muted-foreground'}`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span className={`text-xs mt-2 font-medium ${isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        <Progress value={progress} className="h-2 bg-muted w-[calc(100%-2rem)] mx-auto" />
      </div>
      <div className="flex-1 w-full p-4">
        {children}
      </div>
    </div>
  );
}
