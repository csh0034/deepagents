import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

describe("hello deep agent", () => {
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

  it("MemorySaver + thread_id 로 멀티턴 컨텍스트를 유지한다", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt: "You are a helpful assistant. Answer concisely in Korean.",
      checkpointer: new MemorySaver(),
    });

    const config = { configurable: { thread_id: "test-thread-철수" } };

    // 1턴: 이름을 알려줌 (이전 messages 직접 누적 X — checkpointer 가 알아서 보관)
    const turn1User = "내 이름은 철수야. 기억해줘.";
    const turn1 = await agent.invoke(
      { messages: [{ role: "user", content: turn1User }] },
      config,
    );

    // 2턴: 새 메시지만 넘기면 thread_id 로 이전 state 자동 복원
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

    // 2턴 응답에 1턴 컨텍스트(이름)가 살아 있어야 한다
    expect(turn2Answer).toContain("철수");
    // checkpointer 가 state 를 이어 받아서 messages 가 누적되어야 한다
    expect(turn2.messages.length).toBeGreaterThan(turn1.messages.length);
  });

  it("다른 thread_id 는 격리된다 (이전 대화를 모름)", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt: "You are a helpful assistant. Answer concisely in Korean.",
      checkpointer: new MemorySaver(),
    });

    // thread A 에서 이름 알려줌
    await agent.invoke(
      { messages: [{ role: "user", content: "내 이름은 영희야." }] },
      { configurable: { thread_id: "thread-A" } },
    );

    // thread B 에서는 그 이름을 알 수 없어야 함
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
