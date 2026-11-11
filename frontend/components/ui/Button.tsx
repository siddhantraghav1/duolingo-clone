/**
 * Duolingo's signature "3D" button: a solid colour with a darker bottom edge
 * (box-shadow). When pressed it moves down 4px and the edge disappears,
 * so it feels like a real key being pushed.
 */
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "gold" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-green text-white shadow-[0_4px_0_var(--color-green-dark)]",
  secondary: "bg-blue text-white shadow-[0_4px_0_var(--color-blue-dark)]",
  danger: "bg-red text-white shadow-[0_4px_0_var(--color-red-dark)]",
  gold: "bg-gold text-white shadow-[0_4px_0_var(--color-gold-dark)]",
  outline: "border-2 border-line bg-surface text-muted shadow-[0_4px_0_var(--color-line)] hover:bg-surface-2",
  ghost: "bg-transparent text-blue hover:bg-surface-2",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-[15px]",
  lg: "h-[52px] px-8 text-base",
};

const DISABLED = "bg-line text-faint shadow-none border-0";

/** The classes of a button. Also used to make a <Link> look like a button. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  { disabled = false, fullWidth = false } = {},
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold uppercase tracking-wide",
    "transition-[transform,box-shadow,filter] duration-75",
    SIZES[size],
    fullWidth && "w-full",
    disabled
      ? DISABLED
      : cn(VARIANTS[variant], "hover:brightness-105 active:translate-y-[4px] active:shadow-none"),
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(buttonClasses(variant, size, { disabled, fullWidth }), className)}
      {...props}
    />
  );
}
