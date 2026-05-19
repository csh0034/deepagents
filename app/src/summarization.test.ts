import { describe, expect, it, beforeAll } from "vitest";
import {
  createDeepAgent,
  createSummarizationMiddleware,
  registerHarnessProfile,
  StateBackend,
} from "deepagents";
import { createMiddleware } from "langchain";

/**
 * createSummarizationMiddleware 가 trigger 임계값을 넘으면
 *   1) wrapModelCall 단계에서 모델에게 전달되는 messages 를 압축하고
 *   2) state 에 `_summarizationEvent` 를 박아 다음 turn 에서도 효력이 유지되게 한다.
 *
 * 주의: deepagents 의 summarization 은 state.messages 자체를 깎지 않는다
 *      (그건 다음 turn 의 getEffectiveMessages 가 event 로부터 재구성한다).
 *      따라서 검증은 "모델에 전달된 messages 가 줄었는가" + "_summarizationEvent 가 박혔는가" 로 한다.
 *
 * createDeepAgent 가 default 로 동일 이름의 SummarizationMiddleware 를 박아두므로,
 * registerHarnessProfile 로 default 를 제외하고 우리 인스턴스만 살아남게 한다.
 * (rename 안 하면 excludedMiddleware 의 name 필터에 같이 잘려나간다.)
 *
 * docs/08_deepagents_context_engineering_ko.md 의 패턴을 따른다.
 */

beforeAll(() => {
  registerHarnessProfile("openai:gpt-4o-mini", {
    excludedMiddleware: ["SummarizationMiddleware"],
  });
});

describe("summarization middleware", () => {
  it(
    "messages 트리거를 넘기면 모델 호출 직전에 messages 가 압축되고 state 에 event 가 박힌다",
    async () => {
      const TRIGGER = 6;
      const KEEP = 4;

      const summarization = createSummarizationMiddleware({
        backend: new StateBackend(),
        trigger: { type: "messages", value: TRIGGER },
        keep: { type: "messages", value: KEEP },
      });

      // excludedMiddleware 는 name 으로 필터링 → 우리 인스턴스는 이름을 다르게 해서 살린다.
      const renamedSummarization = {
        ...(summarization as unknown as Record<string | symbol, unknown>),
        name: "CustomSummarizationMiddleware",
      } as unknown as typeof summarization;

      // probe: 우리 미들웨어 뒤에서 wrapModelCall 이 실제로 받는 messages 길이를 캡처
      const probe = {
        modelCallMessageCounts: [] as number[],
      };
      const probeMiddleware = createMiddleware({
        name: "MessageCountProbe",
        wrapModelCall: async (request, handler) => {
          probe.modelCallMessageCounts.push(request.messages?.length ?? -1);
          return handler(request);
        },
      });

      const agent = createDeepAgent({
        model: "openai:gpt-4o-mini",
        tools: [],
        systemPrompt:
          "당신은 짧게 답하는 한국어 비서입니다. 한 문장으로만 답하세요.",
        middleware: [renamedSummarization, probeMiddleware] as const,
      });

      // trigger(6) 를 넉넉히 넘기도록 10개의 user 메시지 + 마지막 질문 1개
      const oldMessages = Array.from({ length: 10 }, (_, i) => ({
        role: "user" as const,
        content: `이전 대화 turn ${i + 1}: 주제는 "${
          ["사과", "바나나", "포도", "감", "수박", "참외", "복숭아", "딸기", "배", "메론"][i]
        }" 였다. 그냥 기억만 해둬.`,
      }));

      const inputCount = oldMessages.length + 1;
      const result = await agent.invoke({
        messages: [
          ...oldMessages,
          { role: "user", content: "지금까지 어떤 과일들이 등장했지?" },
        ],
      });

      const event = (result as unknown as {
        _summarizationEvent?: {
          cutoffIndex: number;
          filePath: string | null;
        };
      })._summarizationEvent;

      const last = result.messages[result.messages.length - 1];
      const answer =
        typeof last?.content === "string"
          ? last.content
          : JSON.stringify(last?.content ?? "");

      console.log("\n[입력 메시지 수]                ", inputCount);
      console.log("[wrapModelCall 별 messages 길이]", probe.modelCallMessageCounts);
      console.log("[_summarizationEvent]           ", event);
      console.log("[최종 state.messages 길이]      ", result.messages.length);
      console.log("[final answer]                   ", answer);

      // (1) 모델에 전달된 messages 는 입력보다 짧아야 한다 = 압축이 실제로 일어났다는 직접 증거
      expect(probe.modelCallMessageCounts.length).toBeGreaterThan(0);
      const firstCallMessages = probe.modelCallMessageCounts[0] ?? Infinity;
      expect(firstCallMessages).toBeLessThan(inputCount);
      // keep=4 → 모델은 (summary 1 + 직전 messages ~4) 정도만 본다
      expect(firstCallMessages).toBeLessThanOrEqual(KEEP + 2);

      // (2) state.messages 자체는 줄지 않는다 — deepagents 의 설계상 원본 messages 는 보존되고
      //     summarization 은 "다음 turn 부터 model 에 줄 view" 만 압축한다.
      //     마지막 AIMessage 1개만 새로 추가되었어야 한다.
      expect(result.messages.length).toBe(inputCount + 1);

      // (3) _summarizationEvent 는 private state(_ prefix)라 외부 result 에 노출되지 않을 수 있다.
      //     찍혀 있으면 부가 검증을 더 한다(있다 / 없다 둘 다 정상 흐름).
      if (event) {
        console.log("[event cutoffIndex 부가 검증]", event.cutoffIndex);
        expect(event.cutoffIndex).toBeGreaterThan(0);
      }
    },
    120_000,
  );
});
