import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AdminPanel } from "@/components/admin/admin-panel";
import { authOptions } from "@/lib/auth";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getServerSession(authOptions);
  const { locale } = await params;

  if (!session) {
    redirect(`/${locale}/login`);
  }

  if (session.user.role !== UserRole.MANAGER) {
    redirect(`/${locale}/chat`);
  }

  return <AdminPanel />;
}
