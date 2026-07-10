"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primaryText shadow-sm hover:brightness-110 disabled:opacity-50",
  secondary: "border border-border/80 bg-card/90 text-text hover:border-primary/40 hover:bg-card",
  ghost: "text-muted hover:bg-card/80 hover:text-text",
  danger: "border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-300",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9 p-0",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(function Button({ className, variant = "secondary", size = "md", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-200 ease-out disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
