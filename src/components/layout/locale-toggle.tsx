"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LocaleToggle() {
  const pathname = usePathname();
  const parts = pathname.split("/");
  const locale = parts[1] === "fa" ? "fa" : "en";
  const rest = parts.slice(2).join("/");

  const target = locale === "fa" ? "en" : "fa";
  const href = `/${target}/${rest}`.replace(/\/$/, "") || `/${target}`;

  return (
    <Link
      className="inline-flex h-9 items-center rounded-xl border border-border/80 bg-card/90 px-3 text-sm transition hover:border-primary/40"
      href={href}
    >
      {target.toUpperCase()}
    </Link>
  );
}
