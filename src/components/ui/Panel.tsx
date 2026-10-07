import type { ReactNode } from "react";

export default function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title ?? "panel"}
      className={`glass-panel rounded-lg p-4 sm:p-5 ${className}`}
    >
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
