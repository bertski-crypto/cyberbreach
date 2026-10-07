import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "success" | "outline";
  children: ReactNode;
}

const styles: Record<string, string> = {
  primary:
    "bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 disabled:opacity-50",
  ghost: "bg-transparent text-slate-300 hover:bg-slate-800 disabled:opacity-50",
  danger:
    "bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 disabled:opacity-50",
  success:
    "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 disabled:opacity-50",
  outline:
    "bg-transparent text-cyan-300 border border-cyan-400/40 hover:bg-cyan-400/10 disabled:opacity-50",
};

export default function Button({ variant = "primary", children, className = "", ...rest }: Props) {
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
