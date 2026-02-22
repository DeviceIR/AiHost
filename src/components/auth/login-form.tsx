"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { loginSchema } from "@/lib/validators/schemas";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string>("");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setError("");
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials");
      return;
    }

    router.push(`/${locale}/chat`);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">{t("loginTitle")}</h2>
      <input
        placeholder={t("email")}
        className="w-full rounded-xl border border-border bg-bg px-3 py-2"
        {...form.register("email")}
      />
      <input
        placeholder={t("password")}
        type="password"
        className="w-full rounded-xl border border-border bg-bg px-3 py-2"
        {...form.register("password")}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="w-full rounded-xl bg-primary px-4 py-2 text-primaryText">
        {t("submit")}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: `/${locale}/chat` })}
          className="rounded-xl border border-border px-3 py-2"
        >
          Google
        </button>
        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl: `/${locale}/chat` })}
          className="rounded-xl border border-border px-3 py-2"
        >
          GitHub
        </button>
      </div>
      <Link className="block text-sm text-muted" href={`/${locale}/signup`}>
        {t("goSignup")}
      </Link>
    </form>
  );
}
