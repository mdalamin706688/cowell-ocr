import { cn } from "@/lib/utils";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <div className={cn("premium-panel overflow-hidden", className)}>
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PanelHeader({ title, description, action, icon }: PanelHeaderProps) {
  return (
    <div className="premium-panel-header">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="icon-box icon-box-sm shrink-0">{icon}</div>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold tracking-tight truncate">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PanelBody({ children, className }: PanelProps) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}
