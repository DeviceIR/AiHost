import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { resolveUploadPath } from "@/lib/uploads";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { message: { include: { chat: true } } },
  });

  if (!attachment || attachment.message.chat.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attachment.path.startsWith("http://") || attachment.path.startsWith("https://")) {
    return NextResponse.redirect(attachment.path);
  }

  const content = await readFile(resolveUploadPath(attachment.path));

  return new NextResponse(content, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${attachment.fileName}"`,
    },
  });
}
