import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isMember = session.user.role === UserRole.MEMBER;

  const models = await prisma.aIModel.findMany({
    where: {
      isActive: true,
      providerConfig: { isActive: true },
      ...(isMember ? { isFree: true } : {}),
    },
    include: {
      providerConfig: {
        select: { id: true, name: true, type: true },
      },
    },
    orderBy: [{ isFree: "desc" }, { label: "asc" }],
  });

  return NextResponse.json(models);
}
