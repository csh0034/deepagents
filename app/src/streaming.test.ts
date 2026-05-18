import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";

describe("streaming", () => {
  it("agent.stream() 으로 chunk 단위 응답을 받는다", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt: "한국어로 답변해.",
    });

    const stream = await agent.stream(
      {
        messages: [
          { role: "user", content: "1 부터 5 까지 한국어 단어로 세줘." },
        ],
      },
      { streamMode: "updates" },
    );

    let chunkCount = 0;
    const nodeNames: string[] = [];
    for await (const chunk of stream) {
      chunkCount += 1;
      const node = Object.keys(chunk as Record<string, unknown>)[0];
      if (node) nodeNames.push(node);
    }

    console.log("\n[stream chunk 수]", chunkCount);
    console.log("[방문한 노드들]  ", nodeNames.join(" → "));

    expect(chunkCount).toBeGreaterThan(0);
  });

  it("streamMode: 'messages' 로 LLM 토큰 chunk 를 실시간 수신한다", async () => {
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt: "한국어로 답변해.",
    });

    const stream = await agent.stream(
      {
        messages: [
          { role: "user", content: "1 부터 10 까지 한국어 단어로 줄바꿈 없이 한 줄에 세줘." },
        ],
      },
      { streamMode: "messages" },
    );

    let chunkCount = 0;
    let totalText = "";
    for await (const item of stream) {
      // messages 모드는 [BaseMessageChunk, metadata] tuple
      const chunk = Array.isArray(item) ? item[0] : item;
      const content =
        typeof (chunk as { content?: unknown })?.content === "string"
          ? ((chunk as { content: string }).content)
          : "";
      if (content) {
        totalText += content;
        chunkCount += 1;
      }
    }

    console.log("\n[token chunk 수]", chunkCount);
    console.log("[누적 텍스트]   ", totalText);

    // gpt-4o-mini 도 토큰 단위로 여러 chunk 가 와야 정상
    expect(chunkCount).toBeGreaterThan(3);
    expect(totalText.length).toBeGreaterThan(0);
  });
});
