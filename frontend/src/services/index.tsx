export async function sendMessageStream(
  message: string,
  threadId: string | undefined,
  onChunk: (chunk: string) => void,
  onComplete: (threadId?: string) => void,
  onError: (error: Error) => void
) {
    console.log("Teste",threadId);
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}chat/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, threadId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let receivedThreadId: string | undefined = threadId;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      // Decode the chunk and send it directly as text
      // Most streaming APIs send plain text chunks
      const chunk = decoder.decode(value, { stream: true });
      
      // Try to parse as JSON if it looks like JSON (starts with { or [)
      // Otherwise treat as plain text
      if (chunk.trim().startsWith("{") || chunk.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(chunk);
          if (parsed.content) {
            onChunk(parsed.content);
          } else if (parsed.text) {
            onChunk(parsed.text);
          } else if (parsed.threadId) {
            receivedThreadId = parsed.threadId;
          } else if (typeof parsed === "string") {
            onChunk(parsed);
          } else if (parsed.message) {
            onChunk(parsed.message);
          }
        } catch {
          // If JSON parsing fails, treat as plain text
          onChunk(chunk);
        }
      } else {
        // Plain text chunk - send directly
        onChunk(chunk);
      }
    }

    onComplete(receivedThreadId);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}