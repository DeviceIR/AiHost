import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/lib/auth";

function hasProviderConfig(id?: string, secret?: string) {
  return Boolean(
    id &&
      secret &&
      id.trim() !== "" &&
      secret.trim() !== "" &&
      id.trim() !== "<set>" &&
      secret.trim() !== "<set>",
  );
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getServerSession(authOptions);
  const { locale } = await params;
  const allowGoogle = hasProviderConfig(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  const allowGitHub = hasProviderConfig(process.env.GITHUB_ID, process.env.GITHUB_SECRET);

  if (session) {
    redirect(`/${locale}/chat`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <LoginForm locale={locale} allowGoogle={allowGoogle} allowGitHub={allowGitHub} />
    </main>
  );
}
