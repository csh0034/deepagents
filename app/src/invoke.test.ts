import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";

describe("invoke", () => {
  it("OPENAI_API_KEY 가 환경에 설정되어 있다", () => {
    expect(
      process.env.OPENAI_API_KEY,
      "app/.env 에 OPENAI_API_KEY 를 채워주세요.",
    ).toBeTruthy();
  });

  it("createDeepAgent.invoke() 가 사용자 메시지에 응답한다", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt: "You are a helpful assistant. Answer concisely in Korean.",
    });

    const userMessage = "한 단어로만 답해줘. '안녕'에 대한 응답?";

    const result = await agent.invoke({
      messages: [{ role: "user", content: userMessage }],
    });

    expect(result.messages.length).toBeGreaterThan(1);

    const last = result.messages[result.messages.length - 1];
    const content =
      typeof last?.content === "string"
        ? last.content
        : JSON.stringify(last?.content ?? "");

    console.log("\n[user]      ", userMessage);
    console.log("[assistant] ", content);
    console.log("[messages]  ", result.messages.length, "개");

    expect(content.length).toBeGreaterThan(0);
  });
});
