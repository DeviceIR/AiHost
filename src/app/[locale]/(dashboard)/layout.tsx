import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const session = await getServerSession(authOptions);
  const { locale } = await params;

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return children;
}
