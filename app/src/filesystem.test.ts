import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";
import { AIMessage } from "@langchain/core/messages";

describe("filesystem backend", () => {
  it("write_file 과 read_file 내장 도구를 자동으로 사용한다", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt:
        "파일 작성 요청이 들어오면 반드시 write_file 도구로 작성한 뒤, read_file 로 같은 경로를 다시 읽어 검증하고 그 내용을 사용자에게 보여줘.",
    });

    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content:
            "'/notes.txt' 파일에 '안녕하세요, 파일시스템 테스트' 라고 한 줄 적어줘. 작성 후 다시 read_file 로 읽어와서 그 내용을 사용자에게 보여줘.",
        },
      ],
    });

    const writeCalls = result.messages
      .filter(AIMessage.isInstance)
      .flatMap((m) => m.tool_calls ?? [])
      .filter((tc) => tc.name === "write_file");

    const readCalls = result.messages
      .filter(AIMessage.isInstance)
      .flatMap((m) => m.tool_calls ?? [])
      .filter((tc) => tc.name === "read_file");

    const last = result.messages[result.messages.length - 1];
    const answer =
      typeof last?.content === "string"
        ? last.content
        : JSON.stringify(last?.content ?? "");

    console.log("\n[write_file 호출 횟수]", writeCalls.length);
    if (writeCalls[0]) {
      console.log("[write_file args]      ", JSON.stringify(writeCalls[0].args));
    }
    console.log("[read_file 호출 횟수] ", readCalls.length);
    console.log("[final answer]         ", answer);

    expect(writeCalls.length).toBeGreaterThan(0);
    expect(readCalls.length).toBeGreaterThan(0);
    expect(answer).toContain("안녕하세요");
  });
});
