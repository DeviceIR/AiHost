import { PrismaClient, ProviderType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const managerEmail = process.env.MANAGER_EMAIL || "manager@example.com";
  const managerPassword = process.env.MANAGER_PASSWORD || "Manager123!";

  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: {
      role: UserRole.MANAGER,
      passwordHash: await bcrypt.hash(managerPassword, 10),
    },
    create: {
      email: managerEmail,
      name: "Manager",
      role: UserRole.MANAGER,
      passwordHash: await bcrypt.hash(managerPassword, 10),
    },
  });

  const providers = [
    {
      id: "openrouter-seed",
      name: "OpenRouter",
      type: ProviderType.OPENROUTER,
      baseUrl: "https://openrouter.ai/api/v1",
    },
    {
      id: "openai-seed",
      name: "OpenAI",
      type: ProviderType.OPENAI,
      baseUrl: "https://api.openai.com/v1",
    },
    {
      id: "gemini-seed",
      name: "Gemini",
      type: ProviderType.GEMINI,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    },
    {
      id: "deepseek-seed",
      name: "DeepSeek",
      type: ProviderType.DEEPSEEK,
      baseUrl: "https://api.deepseek.com",
    },
    {
      id: "xai-seed",
      name: "xAI",
      type: ProviderType.XAI,
      baseUrl: "https://api.x.ai/v1",
    },
  ];

  for (const provider of providers) {
    await prisma.providerConfig.upsert({
      where: { id: provider.id },
      update: { name: provider.name, type: provider.type, baseUrl: provider.baseUrl },
      create: { ...provider, apiKey: "", isActive: true },
    });
  }

  const openrouter = await prisma.providerConfig.findUniqueOrThrow({ where: { id: "openrouter-seed" } });
  const openai = await prisma.providerConfig.findUniqueOrThrow({ where: { id: "openai-seed" } });
  const gemini = await prisma.providerConfig.findUniqueOrThrow({ where: { id: "gemini-seed" } });

  const models = [
    { providerConfigId: openrouter.id, label: "DeepSeek R1 Free", modelId: "deepseek/deepseek-r1:free", isFree: true, supportsVision: false },
    { providerConfigId: openrouter.id, label: "Qwen Free", modelId: "qwen/qwen3-14b:free", isFree: true, supportsVision: false },
    { providerConfigId: openai.id, label: "GPT-4o mini", modelId: "gpt-4o-mini", isFree: false, supportsVision: true },
    { providerConfigId: gemini.id, label: "Gemini 2.0 Flash", modelId: "gemini-2.0-flash", isFree: false, supportsVision: true },
  ];

  for (const model of models) {
    await prisma.aIModel.upsert({
      where: {
        modelId_providerConfigId: {
          modelId: model.modelId,
          providerConfigId: model.providerConfigId,
        },
      },
      update: model,
      create: model,
    });
  }

  console.log(`Seed completed. Manager: ${manager.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
