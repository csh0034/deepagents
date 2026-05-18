import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";
import { MemorySaver, Command } from "@langchain/langgraph";
import { tool } from "langchain";
import { z } from "zod";

describe("human in the loop", () => {
  it("interruptOn 으로 도구 호출 직전에 멈추고 approve 로 재개한다", async () => {
    let executed = 0;
    const dangerousDelete = tool(
      async ({ path }: { path: string }) => {
        executed += 1;
        return `${path} 를 삭제했습니다.`;
      },
      {
        name: "delete_file",
        description: "지정된 경로의 파일을 삭제한다 (위험한 작업).",
        schema: z.object({ path: z.string().describe("삭제할 파일 경로") }),
      },
    );

    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [dangerousDelete],
      systemPrompt:
        "사용자가 파일 삭제를 요청하면 delete_file 도구를 호출해.",
      checkpointer: new MemorySaver(),
      interruptOn: { delete_file: true },
    });

    const config = { configurable: { thread_id: "hitl-approve" } };

    // 1차 invoke — delete_file 호출 직전에 graph 가 멈춰야 함
    const paused = await agent.invoke(
      { messages: [{ role: "user", content: "/tmp/old.log 파일 삭제해줘." }] },
      config,
    );

    const interrupt = (paused as { __interrupt__?: { value: unknown }[] })
      .__interrupt__?.[0];
    const actionRequests =
      ((interrupt?.value as { actionRequests?: { name: string }[] })
        ?.actionRequests) ?? [];

    console.log("\n[interrupt 발생]         ", interrupt ? "yes" : "no");
    console.log(
      "[보류된 도구 호출]         ",
      actionRequests.map((a) => a.name),
    );
    console.log("[실행 횟수 (resume 전)]   ", executed);

    expect(interrupt).toBeDefined();
    expect(actionRequests[0]?.name).toBe("delete_file");
    expect(executed).toBe(0);

    // 2차 invoke — approve 로 재개
    const resumed = await agent.invoke(
      new Command({
        resume: {
          decisions: actionRequests.map(() => ({ type: "approve" as const })),
        },
      }),
      config,
    );

    const last = resumed.messages[resumed.messages.length - 1];
    const answer =
      typeof last?.content === "string"
        ? last.content
        : JSON.stringify(last?.content ?? "");

    console.log("[실행 횟수 (resume 후)]   ", executed);
    console.log("[final answer]            ", answer);

    expect(executed).toBe(1);
  });

  it("interruptOn 으로 reject 하면 실제 도구는 실행되지 않는다", async () => {
    let executed = 0;
    const dangerousDelete = tool(
      async () => {
        executed += 1;
        return "삭제됨.";
      },
      {
        name: "delete_file",
        description: "파일 삭제 (위험).",
        schema: z.object({ path: z.string() }),
      },
    );

    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [dangerousDelete],
      systemPrompt: "사용자가 파일 삭제를 요청하면 delete_file 도구를 호출해.",
      checkpointer: new MemorySaver(),
      interruptOn: { delete_file: true },
    });

    const config = { configurable: { thread_id: "hitl-reject" } };

    const paused = await agent.invoke(
      { messages: [{ role: "user", content: "/etc/passwd 삭제해줘." }] },
      config,
    );

    const interrupt = (paused as { __interrupt__?: { value: unknown }[] })
      .__interrupt__?.[0];
    const actionRequests =
      ((interrupt?.value as { actionRequests?: { name: string }[] })
        ?.actionRequests) ?? [];

    const resumed = await agent.invoke(
      new Command({
        resume: {
          decisions: actionRequests.map(() => ({
            type: "reject" as const,
            message: "보안 정책상 시스템 파일 삭제는 거부합니다.",
          })),
        },
      }),
      config,
    );

    const last = resumed.messages[resumed.messages.length - 1];
    const answer =
      typeof last?.content === "string"
        ? last.content
        : JSON.stringify(last?.content ?? "");

    console.log("\n[reject 후 final answer]", answer);
    console.log("[실행 횟수]               ", executed);

    expect(executed).toBe(0);
  });
});
