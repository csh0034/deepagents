import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";
import { tool } from "langchain";
import { ToolMessage, AIMessage } from "@langchain/core/messages";
import { z } from "zod";

describe("tools & subagents", () => {
  it("커스텀 tool 을 실제로 호출하고 그 결과를 답변에 반영한다", async () => {
    const calcSchema = z.object({
      a: z.number().describe("첫 번째 숫자"),
      b: z.number().describe("두 번째 숫자"),
    });

    let callCount = 0;
    const calculator = tool(
      async ({ a, b }: z.infer<typeof calcSchema>) => {
        callCount += 1;
        return `결과는 ${a + b} 입니다.`;
      },
      {
        name: "calculator",
        description:
          "두 숫자의 합을 정확하게 계산한다. 산수 질문에는 반드시 이 도구를 사용해야 한다.",
        schema: calcSchema,
      },
    );

    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [calculator],
      systemPrompt:
        "산수 질문이 들어오면 절대 직접 계산하지 말고 calculator 도구를 호출해. 도구가 돌려준 값을 그대로 사용자에게 전달.",
    });

    const result = await agent.invoke({
      messages: [
        { role: "user", content: "1234 + 5678 은 얼마야? 도구를 써서 계산해줘." },
      ],
    });

    const toolMessages = result.messages.filter(ToolMessage.isInstance);
    const last = result.messages[result.messages.length - 1];
    const answer =
      typeof last?.content === "string"
        ? last.content
        : JSON.stringify(last?.content ?? "");

    console.log("\n[tool 호출 횟수] ", callCount);
    console.log("[ToolMessage 수] ", toolMessages.length);
    console.log("[final answer]   ", answer);

    expect(callCount).toBeGreaterThan(0);
    expect(toolMessages.length).toBeGreaterThan(0);
    expect(answer).toContain("6912");
  });

  it("복잡한 작업 요청 시 write_todos 로 자체 계획을 만든다", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt:
        "복잡하거나 다단계 작업이 들어오면 먼저 write_todos 도구로 단계별 계획을 만들고 진행해. 한국어로 답변.",
    });

    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content:
            "다음 세 단계 작업을 순서대로 수행해줘:\n" +
            "1) 영어 인사 표현 3개 나열\n" +
            "2) 각 표현을 한국어로 번역\n" +
            "3) 가장 격식 있는 것 하나 선택\n" +
            "각 단계마다 todo 를 만들고 끝나면 completed 로 마킹해.",
        },
      ],
    });

    const todos = (result as { todos?: { content: string; status: string }[] })
      .todos ?? [];

    // deepagents 가 write_todos 내장 도구를 실제로 호출했는지 — 자체 계획 수립의 핵심 신호
    const writeTodosCalls = result.messages
      .filter(AIMessage.isInstance)
      .flatMap((m) => m.tool_calls ?? [])
      .filter((tc) => tc.name === "write_todos");

    console.log("\n[write_todos 호출 횟수]", writeTodosCalls.length);
    console.log("[최종 todos]            ", todos.length, "개");
    for (const t of todos) {
      console.log(`  - [${t.status}] ${t.content}`);
    }

    expect(writeTodosCalls.length).toBeGreaterThan(0);
    expect(todos.length).toBeGreaterThan(0);
  });

  it("subagent 에게 task 도구로 작업을 위임한다", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt:
        "조사가 필요한 질문은 반드시 researcher 서브에이전트에게 task 도구로 위임해. 직접 답하지 마.",
      subagents: [
        {
          name: "researcher",
          description:
            "Use this agent to look up factual information about science or geography topics.",
          systemPrompt:
            "당신은 짧고 정확하게 사실을 정리하는 연구원입니다. 핵심 한 문장으로 답합니다.",
        },
      ],
    });

    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content:
            "지구에서 달까지의 평균 거리를 researcher 에이전트에게 조사하라고 시켜줘.",
        },
      ],
    });

    const taskCalls = result.messages
      .filter(AIMessage.isInstance)
      .flatMap((m) => m.tool_calls ?? [])
      .filter((tc) => tc.name === "task");

    const last = result.messages[result.messages.length - 1];
    const answer =
      typeof last?.content === "string"
        ? last.content
        : JSON.stringify(last?.content ?? "");

    console.log("\n[task 호출 횟수]", taskCalls.length);
    if (taskCalls[0]) {
      console.log("[첫 task args]   ", JSON.stringify(taskCalls[0].args));
    }
    console.log("[final answer]    ", answer);

    expect(taskCalls.length).toBeGreaterThan(0);
    expect(taskCalls[0]?.args).toBeDefined();
  });
});
