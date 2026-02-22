"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { signupSchema } from "@/lib/validators/schemas";

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignupValues) {
    setError("");
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      setError("Could not create account");
      return;
    }

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push(`/${locale}/chat`);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">{t("signupTitle")}</h2>
      <input
        placeholder={t("name")}
        className="w-full rounded-xl border border-border bg-bg px-3 py-2"
        {...form.register("name")}
      />
      <input
        placeholder={t("email")}
        className="w-full rounded-xl border border-border bg-bg px-3 py-2"
        {...form.register("email")}
      />
      <div className="flex gap-2">
        <input
          placeholder={t("password")}
          type={showPassword ? "text" : "password"}
          className="w-full rounded-xl border border-border bg-bg px-3 py-2"
          {...form.register("password")}
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="w-full rounded-xl bg-primary px-4 py-2 text-primaryText">
        {t("submit")}
      </button>
      <Link className="block text-sm text-muted" href={`/${locale}/login`}>
        {t("goLogin")}
      </Link>
    </form>
  );
}
