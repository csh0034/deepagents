import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";
import { AIMessage } from "@langchain/core/messages";

const buildAgent = () =>
  createDeepAgent({
    model: "openai:gpt-4o-mini",
    tools: [],
    systemPrompt:
      "사용자가 알려준 경로에 write_file 도구로 짧은 한 줄을 작성해줘.",
    permissions: [
      // /workspace 아래는 모두 허용
      { operations: ["write"], paths: ["/workspace/**"], mode: "allow" },
      // 그 외 다른 경로의 write 는 모두 차단
      { operations: ["write"], paths: ["/**"], mode: "deny" },
    ],
  });

describe("filesystem permissions", () => {
  it("allow 룰에 매칭되는 경로(/workspace/**)는 write 성공", async () => {
    const agent = buildAgent();

    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: "/workspace/ok.txt 에 'allowed' 라고 한 줄 적어줘.",
        },
      ],
    });

    const writeCalls = result.messages
      .filter(AIMessage.isInstance)
      .flatMap((m) => m.tool_calls ?? [])
      .filter((tc) => tc.name === "write_file");

    const target = writeCalls.find((tc) => {
      const p = (tc.args as { file_path?: string })?.file_path;
      return typeof p === "string" && p.startsWith("/workspace/");
    });

    console.log("\n[write 시도]", writeCalls.length, "회");
    if (target) {
      console.log(
        "[허용 경로 호출]",
        JSON.stringify((target.args as { file_path?: string })?.file_path),
      );
    }

    expect(target).toBeDefined();
  });

  it("deny 룰에 매칭되는 경로(/etc/**)는 write_file 이 'permission denied' 로 throw 한다", async () => {
    const agent = buildAgent();

    // deepagents 의 permission 차단은 ToolMessage 가 아니라 그래프 자체에서 throw
    // → invoke 호출이 reject 됨
    await expect(
      agent.invoke({
        messages: [
          {
            role: "user",
            content: "/etc/secret.txt 에 'denied' 라고 한 줄 적어줘.",
          },
        ],
      }),
    ).rejects.toThrowError(/permission denied/i);

    console.log("\n[expected] /etc/** write 는 permission denied 로 throw 됐다");
  });
});
