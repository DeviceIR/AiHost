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
    <Link className="rounded-xl border border-border bg-card px-3 py-2 text-sm" href={href}>
      {target.toUpperCase()}
    </Link>
  );
}
