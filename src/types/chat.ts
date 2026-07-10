export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type ChatModel = {
  id: string;
  label: string;
  isFree: boolean;
  providerConfig: { name: string };
};

export type ChatAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments: ChatAttachment[];
  model?: { label: string } | null;
};

export type MessageStatus = "thinking" | "streaming" | "error";

export type MessageView = ChatMessage & {
  status?: MessageStatus;
};

export type StreamEvent =
  | { type: "user"; message: ChatMessage }
  | { type: "token"; text: string }
  | { type: "done"; message: ChatMessage; chatTitle?: string }
  | { type: "error"; error: string };
