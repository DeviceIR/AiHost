export const publicRoutes = ["/login", "/signup"];

export const locales = ["en", "fa"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
