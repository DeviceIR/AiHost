import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";
import { createModelSchema } from "@/lib/validators/schemas";

export async function GET() {
  const manager = await requireManager();
  if (manager instanceof NextResponse) {
    return manager;
  }

  const models = await prisma.aIModel.findMany({
    include: { providerConfig: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(models);
}

export async function POST(request: Request) {
  const manager = await requireManager();
  if (manager instanceof NextResponse) {
    return manager;
  }

  const body = await request.json();
  const parsed = createModelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const model = await prisma.aIModel.create({
    data: {
      label: parsed.data.label,
      modelId: parsed.data.modelId,
      providerConfigId: parsed.data.providerConfigId,
      isFree: parsed.data.isFree ?? false,
      isActive: parsed.data.isActive ?? true,
      supportsVision: parsed.data.supportsVision ?? false,
    },
  });

  return NextResponse.json(model);
}
