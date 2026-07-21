export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; file_url?: { url: string; mime_type: string } }>;
};

export type LLMOptions = {
  model?: string;
  messages: LLMMessage[];
  response_format?: {
    type: "json_schema";
    json_schema: { name: string; strict: boolean; schema: Record<string, unknown> };
  };
  thinking?: { type: "enabled"; budget_tokens: number };
  temperature?: number;
  max_tokens?: number;
};

export type LLMResponse = {
  choices: Array<{ message: { content: string } }>;
};

export function listLLMModels(): string[] {
  return ["claude-sonnet-4-6", "gpt-4o"];
}

export async function invokeLLM(options: LLMOptions): Promise<LLMResponse> {
  const model = options.model ?? "claude-sonnet-4-6";
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const systemMsg = options.messages.find((m) => m.role === "system");
  const userMsg = options.messages.find((m) => m.role === "user");
  const systemText =
    typeof systemMsg?.content === "string" ? systemMsg.content : JSON.stringify(systemMsg?.content ?? "");
  const userText =
    typeof userMsg?.content === "string" ? userMsg.content : JSON.stringify(userMsg?.content ?? "");

  if (model.startsWith("claude") && anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: options.max_tokens ?? 4096,
        system: systemText,
        messages: [{ role: "user", content: userText }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status}`);
    }
    const data = (await res.json()) as { content: Array<{ text: string }> };
    return { choices: [{ message: { content: data.content[0]?.text ?? "" } }] };
  }

  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: model.startsWith("gpt") ? model : "gpt-4o",
        messages: options.messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 4096,
        response_format: options.response_format?.type === "json_schema" ? { type: "json_object" } : undefined,
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status}`);
    }
    const data = (await res.json()) as LLMResponse;
    return data;
  }

  // Offline fallback for dev/test without API keys
  if (options.response_format?.type === "json_schema") {
    return {
      choices: [
        {
          message: {
            content: JSON.stringify({
              writingTone: "formal",
              citationStyle: "Bluebook",
              formattingNotes: "Standard headings",
              argumentativePatterns: "Issue-rule-application",
              vocabularyLevel: "professional",
              sentenceStructure: "complex",
            }),
          },
        },
      ],
    };
  }

  return {
    choices: [
      {
        message: {
          content: `[DRAFT — configure ANTHROPIC_API_KEY or OPENAI_API_KEY for live output]\n\n${systemText.slice(0, 500)}\n\n---\n\n${userText}`,
        },
      },
    ],
  };
}
