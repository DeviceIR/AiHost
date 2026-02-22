import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/lib/auth";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getServerSession(authOptions);
  const { locale } = await params;

  if (session) {
    redirect(`/${locale}/chat`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <LoginForm locale={locale} />
    </main>
  );
}
