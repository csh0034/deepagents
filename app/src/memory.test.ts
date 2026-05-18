import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

describe("memory & thread", () => {
  it("MemorySaver + thread_id 로 멀티턴 컨텍스트를 유지한다", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt: "You are a helpful assistant. Answer concisely in Korean.",
      checkpointer: new MemorySaver(),
    });

    const config = { configurable: { thread_id: "test-thread-철수" } };

    const turn1User = "내 이름은 철수야. 기억해줘.";
    const turn1 = await agent.invoke(
      { messages: [{ role: "user", content: turn1User }] },
      config,
    );

    const turn2User = "내 이름이 뭐였지? 이름만 한 단어로 답해.";
    const turn2 = await agent.invoke(
      { messages: [{ role: "user", content: turn2User }] },
      config,
    );

    const turn1Last = turn1.messages[turn1.messages.length - 1];
    const turn1Answer =
      typeof turn1Last?.content === "string"
        ? turn1Last.content
        : JSON.stringify(turn1Last?.content ?? "");

    const turn2Last = turn2.messages[turn2.messages.length - 1];
    const turn2Answer =
      typeof turn2Last?.content === "string"
        ? turn2Last.content
        : JSON.stringify(turn2Last?.content ?? "");

    console.log("\n[turn1 user]      ", turn1User);
    console.log("[turn1 assistant] ", turn1Answer);
    console.log("[turn2 user]      ", turn2User);
    console.log("[turn2 assistant] ", turn2Answer);
    console.log(
      "[messages]         turn1:",
      turn1.messages.length,
      "→ turn2:",
      turn2.messages.length,
    );

    expect(turn2Answer).toContain("철수");
    expect(turn2.messages.length).toBeGreaterThan(turn1.messages.length);
  });

  it("다른 thread_id 는 격리된다 (이전 대화를 모름)", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt: "You are a helpful assistant. Answer concisely in Korean.",
      checkpointer: new MemorySaver(),
    });

    await agent.invoke(
      { messages: [{ role: "user", content: "내 이름은 영희야." }] },
      { configurable: { thread_id: "thread-A" } },
    );

    const otherThread = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content:
              "내 이름이 뭔지 알아? 모르면 '모름' 이라고만 답해. 추측 금지.",
          },
        ],
      },
      { configurable: { thread_id: "thread-B" } },
    );

    const last = otherThread.messages[otherThread.messages.length - 1];
    const answer =
      typeof last?.content === "string"
        ? last.content
        : JSON.stringify(last?.content ?? "");

    console.log("\n[thread-B answer] ", answer);

    expect(answer).not.toContain("영희");
  });
});
