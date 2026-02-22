import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { authOptions } from "@/lib/auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  return session;
}

export async function requireManager() {
  const session = await requireSession();
  if (!session || session.user.role !== UserRole.MANAGER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}
