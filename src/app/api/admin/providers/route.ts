import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";
import { createProviderSchema } from "@/lib/validators/schemas";

export async function GET() {
  const manager = await requireManager();
  if (manager instanceof NextResponse) {
    return manager;
  }

  const providers = await prisma.providerConfig.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { models: true } } },
  });

  return NextResponse.json(providers);
}

export async function POST(request: Request) {
  const manager = await requireManager();
  if (manager instanceof NextResponse) {
    return manager;
  }

  const body = await request.json();
  const parsed = createProviderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const provider = await prisma.providerConfig.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      baseUrl: parsed.data.baseUrl,
      apiKey: parsed.data.apiKey,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json(provider);
}
