"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Provider = {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  isActive: boolean;
  _count: { models: number };
};

type Model = {
  id: string;
  label: string;
  modelId: string;
  isFree: boolean;
  isActive: boolean;
  providerConfig: { name: string };
};

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: "MANAGER" | "VIP" | "MEMBER";
};

export function AdminPanel() {
  const queryClient = useQueryClient();
  const [providerForm, setProviderForm] = useState({
    name: "",
    type: "OPENROUTER",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "",
  });

  const [modelForm, setModelForm] = useState({
    label: "",
    modelId: "",
    providerConfigId: "",
    isFree: false,
    supportsVision: false,
  });

  const providersQuery = useQuery({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/providers");
      if (!response.ok) throw new Error("Cannot load providers");
      return (await response.json()) as Provider[];
    },
  });

  const modelsQuery = useQuery({
    queryKey: ["admin-models"],
    queryFn: async () => {
      const response = await fetch("/api/admin/models");
      if (!response.ok) throw new Error("Cannot load models");
      return (await response.json()) as Model[];
    },
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Cannot load users");
      return (await response.json()) as User[];
    },
  });

  const createProvider = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(providerForm),
      });
      if (!response.ok) throw new Error("Failed creating provider");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      setProviderForm({ name: "", type: "OPENROUTER", baseUrl: "https://openrouter.ai/api/v1", apiKey: "" });
    },
  });

  const createModel = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelForm),
      });
      if (!response.ok) throw new Error("Failed creating model");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-models"] });
      setModelForm({ label: "", modelId: "", providerConfigId: "", isFree: false, supportsVision: false });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: User["role"] }) => {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!response.ok) throw new Error("Role update failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <div className="space-y-6 p-4">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Providers</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <input placeholder="name" value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} className="rounded-xl border border-border bg-bg px-3 py-2" />
          <select value={providerForm.type} onChange={(e) => setProviderForm({ ...providerForm, type: e.target.value })} className="rounded-xl border border-border bg-bg px-3 py-2">
            <option>OPENROUTER</option><option>OPENAI</option><option>DEEPSEEK</option><option>XAI</option><option>GEMINI</option>
          </select>
          <input placeholder="baseUrl" value={providerForm.baseUrl} onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })} className="rounded-xl border border-border bg-bg px-3 py-2" />
          <input placeholder="apiKey" value={providerForm.apiKey} onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })} className="rounded-xl border border-border bg-bg px-3 py-2" />
        </div>
        <button type="button" onClick={() => createProvider.mutate()} className="mt-2 rounded-xl bg-primary px-4 py-2 text-primaryText">Add provider</button>
        <div className="mt-4 space-y-2">
          {providersQuery.data?.map((provider) => (
            <div key={provider.id} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
              {provider.name} | {provider.type} | models: {provider._count.models}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Models</h2>
        <div className="grid gap-2 md:grid-cols-5">
          <input placeholder="label" value={modelForm.label} onChange={(e) => setModelForm({ ...modelForm, label: e.target.value })} className="rounded-xl border border-border bg-bg px-3 py-2" />
          <input placeholder="modelId" value={modelForm.modelId} onChange={(e) => setModelForm({ ...modelForm, modelId: e.target.value })} className="rounded-xl border border-border bg-bg px-3 py-2" />
          <select value={modelForm.providerConfigId} onChange={(e) => setModelForm({ ...modelForm, providerConfigId: e.target.value })} className="rounded-xl border border-border bg-bg px-3 py-2">
            <option value="">provider</option>
            {providersQuery.data?.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm"><input type="checkbox" checked={modelForm.isFree} onChange={(e) => setModelForm({ ...modelForm, isFree: e.target.checked })} /> free</label>
          <label className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm"><input type="checkbox" checked={modelForm.supportsVision} onChange={(e) => setModelForm({ ...modelForm, supportsVision: e.target.checked })} /> vision</label>
        </div>
        <button type="button" onClick={() => createModel.mutate()} className="mt-2 rounded-xl bg-primary px-4 py-2 text-primaryText">Add model</button>
        <div className="mt-4 space-y-2">
          {modelsQuery.data?.map((model) => (
            <div key={model.id} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
              {model.label} ({model.modelId}) | {model.providerConfig.name} | {model.isFree ? "free" : "pro"}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Users</h2>
        <div className="space-y-2">
          {usersQuery.data?.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between rounded-xl border border-border bg-bg px-3 py-2">
              <div>
                <p className="font-medium">{user.name || user.email}</p>
                <p className="text-sm text-muted">{user.email}</p>
              </div>
              <select
                value={user.role}
                onChange={(e) => updateRole.mutate({ userId: user.id, role: e.target.value as User["role"] })}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="MANAGER">MANAGER</option>
                <option value="VIP">VIP</option>
                <option value="MEMBER">MEMBER</option>
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
