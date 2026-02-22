import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";

const updateSchema = z.object({
  userId: z.string(),
  role: z.enum([UserRole.MANAGER, UserRole.VIP, UserRole.MEMBER]),
});

export async function GET() {
  const manager = await requireManager();
  if (manager instanceof NextResponse) {
    return manager;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function PATCH(request: Request) {
  const manager = await requireManager();
  if (manager instanceof NextResponse) {
    return manager;
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
    select: { id: true, role: true },
  });

  return NextResponse.json(user);
}
