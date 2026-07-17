import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  back?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("premium-page-header", className)}>
      {back}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <span className="premium-badge mb-3 inline-flex">{eyebrow}</span>
          )}
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {meta}
      </div>
    </header>
  );
}
