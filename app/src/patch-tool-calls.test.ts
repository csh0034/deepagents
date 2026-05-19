import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";
import { createMiddleware, tool } from "langchain";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";

/**
 * 도구 호출 인자를 mid-flight 로 가로채 수정하는 패턴.
 *
 * 참고: deepagents 의 createPatchToolCallsMiddleware() 는 이름이 비슷하지만
 * 실제 역할은 "AIMessage 의 tool_calls 와 ToolMessage 의 parity 보정" 이다
 * (Gemini 등이 거부하는 dangling tool_call / orphan ToolMessage 을 자동으로 메움).
 * 인자 자체를 다시 쓰려면 langchain 의 createMiddleware + wrapToolCall 훅을
 * 쓰는 게 맞다 — 이 테스트가 검증하는 정확한 동작은 후자.
 *
 * 검증 시나리오:
 *   - 사용자가 "10 과 -5 를 add_numbers 도구로 더해라" 라고 시킨다
 *   - 모델은 add_numbers(a=10, b=-5) 로 호출한다
 *   - 미들웨어가 b 음수를 가로채 abs(b) 로 패치한다 → 도구는 a=10, b=5 를 본다
 *   - 결과는 15 (모델 그대로면 5)
 */
describe("wrapToolCall middleware (mid-flight arg patching)", () => {
  it(
    "wrapToolCall 훅으로 도구 인자를 강제로 보정하면 도구 실행은 패치된 값으로 진행된다",
    async () => {
      const seen: {
        // wrapToolCall 가 본 원본 args
        intercepted: Array<{ a: number; b: number }>;
        // 실제 도구 핸들러가 본 args
        executed: Array<{ a: number; b: number }>;
      } = { intercepted: [], executed: [] };

      const addNumbers = tool(
        async ({ a, b }) => {
          seen.executed.push({ a, b });
          return `result=${a + b}`;
        },
        {
          name: "add_numbers",
          description: "두 정수를 더해 result=<합> 형태로 돌려준다.",
          schema: z.object({
            a: z.number().describe("첫 번째 정수"),
            b: z.number().describe("두 번째 정수"),
          }),
        },
      );

      const clampNegativeB = createMiddleware({
        name: "ClampNegativeB",
        wrapToolCall: async (request, handler) => {
          if (request.toolCall.name !== "add_numbers") {
            return handler(request);
          }
          const args = request.toolCall.args as { a: number; b: number };
          seen.intercepted.push({ ...args });

          if (args.b < 0) {
            const patched = { ...args, b: Math.abs(args.b) };
            return handler({
              ...request,
              toolCall: { ...request.toolCall, args: patched },
            });
          }
          return handler(request);
        },
      });

      const agent = createDeepAgent({
        model: "openai:gpt-4o-mini",
        tools: [addNumbers],
        middleware: [clampNegativeB] as const,
        systemPrompt:
          "당신은 산수 비서입니다. 사용자의 덧셈 요청에는 반드시 add_numbers 도구를 정확히 한 번 호출해서 답하세요. " +
          "직접 계산하지 말고, 도구가 돌려준 'result=<숫자>' 의 숫자를 그대로 사용자에게 알려주세요.",
      });

      const result = await agent.invoke({
        messages: [
          {
            role: "user",
            content:
              "10 과 -5 를 add_numbers 도구로 더해. 도구가 돌려준 숫자만 한 단어로 알려줘.",
          },
        ],
      });

      const toolCalls = result.messages
        .filter(AIMessage.isInstance)
        .flatMap((m) => m.tool_calls ?? [])
        .filter((tc) => tc.name === "add_numbers");

      const toolMessages = result.messages
        .filter(ToolMessage.isInstance)
        .map((m) =>
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        );

      const last = result.messages[result.messages.length - 1];
      const answer =
        typeof last?.content === "string"
          ? last.content
          : JSON.stringify(last?.content ?? "");

      console.log("\n[모델이 만든 tool_calls]");
      for (const tc of toolCalls) {
        console.log("  - args =", JSON.stringify(tc.args));
      }
      console.log("[wrapToolCall 가 가로챈 원본]", seen.intercepted);
      console.log("[실제 도구 핸들러가 본 args]", seen.executed);
      console.log("[ToolMessage 본문]           ", toolMessages);
      console.log("[final answer]               ", answer);

      // (1) 모델은 b=-5 로 호출했다
      expect(seen.intercepted.length).toBeGreaterThan(0);
      expect(seen.intercepted[0]?.b).toBe(-5);

      // (2) 미들웨어가 b 를 abs 로 패치 → 도구 핸들러는 b=5 를 봐야 한다
      expect(seen.executed.length).toBeGreaterThan(0);
      expect(seen.executed[0]?.a).toBe(10);
      expect(seen.executed[0]?.b).toBe(5);

      // (3) ToolMessage 에는 패치된 결과(15)가 들어와야 한다
      expect(toolMessages.some((c) => c.includes("result=15"))).toBe(true);
      // 그리고 패치 안 했을 때 나올 5 가 단독으로 들어와선 안 된다
      expect(toolMessages.some((c) => c.includes("result=5\n") || c === "result=5"))
        .toBe(false);

      // (4) 최종 답변도 15 를 그대로 흘려야 한다
      expect(answer).toMatch(/15/);
    },
    120_000,
  );
});
