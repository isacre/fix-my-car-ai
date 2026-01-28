import { useState, type ReactNode } from "react";
import {
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type AppendMessage,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { sendMessageStream } from "@/services";

//Todo: replace this with proper types
type MyMessage = {
  role: "user" | "assistant";
  content: string;
};

const convertMessage = (message: MyMessage): ThreadMessageLike => {
  return {
    role: message.role,
    content: [{ type: "text", text: message.content }],
  };
};

export function MyRuntimeProvider({
  children,
  ThreadId,
}: Readonly<{
  children: ReactNode;
  ThreadId: string;
}>) {
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<MyMessage[]>([]);
  const [threadId, setThreadId] = useState<string>(ThreadId);

  const onNew = async (message: AppendMessage) => {
    if (message.content[0]?.type !== "text")
      throw new Error("Only text messages are supported");

    const input = message.content[0].text;
    setMessages((currentConversation) => [
      ...currentConversation,
      { role: "user", content: input },
    ]);

    // Create assistant message placeholder
    setMessages((currentConversation) => [
      ...currentConversation,
      { role: "assistant", content: "" },
    ]);

    setIsRunning(true);

    let accumulatedContent = "";

    await sendMessageStream(
      input,
      threadId,
      (chunk: string) => {
        // Update the assistant message incrementally
        accumulatedContent += chunk;
        setMessages((currentConversation) => {
          const newMessages = [...currentConversation];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && newMessages[lastIndex]?.role === "assistant") {
            // Create a new object to ensure React detects the change
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: accumulatedContent,
            };
          }
          return newMessages;
        });
      },
      (receivedThreadId?: string) => {
        if (receivedThreadId) {
          setThreadId(receivedThreadId);
        }
        setIsRunning(false);
      },
      (error: Error) => {
        console.error("Failed to send message:", error);
        setMessages((currentConversation) => {
          const newMessages = [...currentConversation];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && newMessages[lastIndex]?.role === "assistant") {
            // Create a new object to ensure React detects the change
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: accumulatedContent || "Sorry, I encountered an error. Please try again.",
            };
          }
          return newMessages;
        });
        setIsRunning(false);
      }
    );
  };

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage,
    onNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}