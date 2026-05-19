import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";
import { AIMessage } from "@langchain/core/messages";

describe("parallel subagent delegation", () => {
  it("메인 agent 가 동일 turn 안에서 두 subagent 에 task 를 동시 발사한다", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt:
        "독립적인 작업이 두 개 들어오면, 반드시 같은 응답 안에서 task 도구를 두 번 호출해 두 subagent 에 동시에 위임해. " +
        "한 번에 한 task 만 호출하지 마. 순차 호출 금지.",
      subagents: [
        {
          name: "translator_ko",
          description: "Translate English text to Korean.",
          systemPrompt:
            "Translate the given English text into natural Korean. Return only the translation.",
        },
        {
          name: "translator_ja",
          description: "Translate English text to Japanese.",
          systemPrompt:
            "Translate the given English text into natural Japanese. Return only the translation.",
        },
      ],
    });

    const t0 = Date.now();
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content:
            "'Hello world' 를 한국어와 일본어로 각각 번역해줘. " +
            "두 작업은 완전히 독립적이니까 task 도구를 같은 응답에서 두 번 호출해 병렬로 위임해.",
        },
      ],
    });
    const elapsed = Date.now() - t0;

    const aiMessages = result.messages.filter(AIMessage.isInstance);
    const messageWithParallelTasks = aiMessages.find(
      (m) =>
        (m.tool_calls ?? []).filter((tc) => tc.name === "task").length >= 2,
    );

    const totalTaskCalls = aiMessages
      .flatMap((m) => m.tool_calls ?? [])
      .filter((tc) => tc.name === "task").length;

    const last = result.messages[result.messages.length - 1];
    const answer =
      typeof last?.content === "string"
        ? last.content
        : JSON.stringify(last?.content ?? "");

    console.log("\n[총 task 호출 수]      ", totalTaskCalls);
    console.log(
      "[동일 turn 병렬 호출]   ",
      messageWithParallelTasks ? "yes" : "no (순차 호출됨)",
    );
    console.log("[wall clock]            ", elapsed, "ms");
    if (messageWithParallelTasks) {
      const parallelCalls = (messageWithParallelTasks.tool_calls ?? []).filter(
        (tc) => tc.name === "task",
      );
      for (const c of parallelCalls) {
        const args = c.args as {
          subagent_type?: string;
          description?: string;
        };
        console.log(
          `  - subagent=${args?.subagent_type} desc="${(args?.description ?? "").slice(0, 60)}"`,
        );
      }
    }
    console.log("[final answer]          ", answer.slice(0, 200));

    expect(totalTaskCalls).toBeGreaterThanOrEqual(2);
    expect(messageWithParallelTasks).toBeDefined();
  });
});
