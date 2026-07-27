import type { FormHTMLAttributes, ReactNode } from "react";

export const adminControlClass =
  "h-10 rounded-xl border border-admin-line-strong bg-admin-surface px-3 text-[12.5px] text-admin-ink shadow-sm outline-none transition placeholder:text-admin-muted/70 hover:border-admin-muted/50 focus:border-admin-accent focus:ring-2 focus:ring-admin-accent-tint";

export const adminFilterButtonClass =
  "h-10 rounded-xl bg-admin-ink px-4 text-[12.5px] font-medium text-white transition hover:bg-admin-accent-strong";

export const adminResetClass =
  "inline-flex h-10 items-center px-2 text-[12.5px] text-admin-muted transition hover:text-admin-ink";

/** Consistent, responsive surface for list filters across the panel. */
export function AdminFilterBar({
  children,
  className = "",
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  children: ReactNode;
}) {
  return (
    <form
      {...props}
      className={`mb-6 flex flex-wrap items-end gap-3 rounded-[18px] border border-admin-line bg-admin-sink/45 p-3.5 font-sans text-[12.5px] sm:p-4 ${className}`}
    >
      {children}
    </form>
  );
}

export function AdminFilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[9.5px] font-medium uppercase tracking-[0.18em] text-admin-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
