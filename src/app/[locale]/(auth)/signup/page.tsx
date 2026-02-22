import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SignupForm } from "@/components/auth/signup-form";
import { authOptions } from "@/lib/auth";

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getServerSession(authOptions);
  const { locale } = await params;

  if (session) {
    redirect(`/${locale}/chat`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <SignupForm locale={locale} />
    </main>
  );
}
