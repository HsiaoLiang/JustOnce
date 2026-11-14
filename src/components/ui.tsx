import Link from "next/link";
import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { cn, formatRating, initials } from "@/lib/cn";

type Variant = "primary" | "dark" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-ink hover:bg-accent-hover shadow-[inset_0_-2px_0_rgb(0_0_0/0.08)]",
  dark: "bg-ink text-white hover:bg-ink-2",
  secondary: "bg-paper text-ink border border-line-strong hover:border-ink hover:bg-surface",
  ghost: "text-ink hover:bg-surface",
  danger: "bg-paper text-danger border border-line-strong hover:border-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-[0.95rem] gap-2",
  lg: "h-13 px-6 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        sizes={`${size * 2}px`}
        className={cn("shrink-0 rounded-full object-cover bg-surface", className)}
        style={style}
      />
    );
  }
  // Initials on a tint derived from the name, so the same person always gets the same colour.
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold", className)}
      style={{ ...style, fontSize: size * 0.38, background: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 45% 28%)` }}
    >
      {initials(name)}
    </span>
  );
}

export function VerifiedBadge({ verified, compact = false }: { verified: boolean; compact?: boolean }) {
  if (!verified) return compact ? null : <span className="text-xs font-medium text-muted">ID not yet verified</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink" title="Identity verified">
      <BadgeCheck className="size-4 fill-accent text-paper" strokeWidth={2.2} aria-hidden />
      {!compact && "Verified"}
      {compact && <span className="sr-only">Verified</span>}
    </span>
  );
}

export function Rating({
  sum,
  count,
  showCount = true,
  className,
  newLabel = "New",
}: {
  sum: number;
  count: number;
  showCount?: boolean;
  className?: string;
  newLabel?: string;
}) {
  const value = formatRating(sum, count);
  if (!value) return <span className={cn("text-sm font-medium text-muted", className)}>{newLabel}</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-3.5 fill-ink text-ink" aria-hidden />
      <span className="font-semibold">{value}</span>
      {showCount && <span className="text-muted">({count})</span>}
      <span className="sr-only"> out of 5 from {count} {count === 1 ? "review" : "reviews"}</span>
    </span>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          style={{ width: size, height: size }}
          className={n <= value ? "fill-ink text-ink" : "fill-surface-2 text-surface-2"}
        />
      ))}
    </span>
  );
}

export function Chip({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "muted" | "danger" | "dark"; className?: string }) {
  const tones = {
    neutral: "bg-surface text-ink-2",
    accent: "bg-accent text-ink",
    success: "bg-success-soft text-success",
    muted: "bg-surface text-muted",
    danger: "bg-danger-soft text-danger",
    dark: "bg-ink text-white",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-paper", className)}>{children}</div>;
}

export function SectionHeading({ title, action, kicker }: { title: string; action?: ReactNode; kicker?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {kicker && <p className="mb-1 font-mono text-xs tracking-[0.14em] text-muted uppercase">{kicker}</p>}
        <h2 className="text-2xl font-semibold sm:text-[1.7rem]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
      {hint && <span className="ml-1.5 font-normal text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "block w-full rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-muted/80 transition-colors focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:bg-surface aria-invalid:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-28 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        inputClass,
        "h-11 appearance-none bg-[length:16px] bg-[right_0.85rem_center] bg-no-repeat pr-10",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2316161d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function FormAlert({ children, tone = "danger" }: { children?: ReactNode; tone?: "danger" | "success" | "info" }) {
  if (!children) return null;
  const tones = {
    danger: "bg-danger-soft text-danger border-danger/20",
    success: "bg-success-soft text-success border-success/20",
    info: "bg-surface text-ink-2 border-line",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm font-medium", tones[tone])}>
      {children}
    </div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
