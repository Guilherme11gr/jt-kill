import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg bg-muted/5 animate-in fade-in-50 duration-500", className)}>
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-muted transition-transform hover:scale-110 duration-300">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-700 delay-100">{action}</div>}
    </div>
  );
}
