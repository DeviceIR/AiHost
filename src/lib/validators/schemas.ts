import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(100),
});

export const createChatSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

export const createProviderSchema = z.object({
  name: z.string().min(2).max(60),
  type: z.enum(["OPENROUTER", "OPENAI", "DEEPSEEK", "XAI", "GEMINI"]),
  baseUrl: z.url(),
  apiKey: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const createModelSchema = z.object({
  label: z.string().min(2).max(80),
  modelId: z.string().min(2).max(120),
  providerConfigId: z.string().min(1),
  isFree: z.boolean().optional(),
  isActive: z.boolean().optional(),
  supportsVision: z.boolean().optional(),
});
