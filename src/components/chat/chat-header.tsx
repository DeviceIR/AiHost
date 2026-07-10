"use client";

import { Menu, Settings, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@prisma/client";

export function ChatHeader({
  locale,
  role,
  title,
  adminLabel,
  logoutLabel,
  onOpenSidebar,
}: {
  locale: string;
  role: UserRole;
  title: string;
  adminLabel: string;
  logoutLabel: string;
  onOpenSidebar: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/50 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="secondary" size="icon" className="md:hidden" onClick={onOpenSidebar} aria-label="Open sidebar">
          <Menu size={16} />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight md:text-base">{title}</p>
          <p className="text-[11px] text-muted">AiHost</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <LocaleToggle />
        {role === "MANAGER" ? (
          <Link
            href={`/${locale}/admin`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/80 bg-card/90 px-3 text-sm transition hover:border-primary/40"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">{adminLabel}</span>
          </Link>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
        >
          <User size={14} />
          <span className="hidden sm:inline">{logoutLabel}</span>
        </Button>
      </div>
    </header>
  );
}
