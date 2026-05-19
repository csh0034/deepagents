import { describe, expect, it } from "vitest";
import { createDeepAgent, type FileData } from "deepagents";
import { AIMessage, ToolMessage } from "@langchain/core/messages";

/**
 * write_file / read_file 외에 deepagents 가 기본으로 노출하는 파일시스템 도구들
 *   - ls         : 디렉터리 항목 나열
 *   - glob       : 패턴 매칭으로 파일 찾기
 *   - grep       : 본문 안에서 리터럴 검색
 *   - edit_file  : oldString → newString 치환
 *
 * 한 번의 invoke 에서 네 가지 도구가 모두 호출되도록 유도하고,
 * 각 도구가 실제로 의도된 결과를 돌려줬는지 ToolMessage 본문으로 검증한다.
 */

function fileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

describe("filesystem extra tools (ls/glob/grep/edit_file)", () => {
  it(
    "한 turn 안에서 ls/glob/grep/edit_file 4가지 내장 도구를 모두 사용한다",
    async () => {
      const agent = createDeepAgent({
        model: "openai:gpt-4o-mini",
        tools: [],
        systemPrompt:
          "당신은 파일 탐색 비서입니다. 사용자가 절차를 단계별로 지시하면 " +
          "그 순서대로 정확한 내장 도구(ls, glob, grep, edit_file)를 호출하세요. " +
          "각 단계 결과는 반드시 도구를 통해서만 얻고, 추측하거나 직접 답하지 마세요.",
      });

      // (1) virtual fs 에 시드 — StateBackend(default) 가 이 files 를 받는다
      const seed: Record<string, FileData> = {
        "/docs/intro.md": fileData("Hello\nINTRO_MARKER lives here\n"),
        "/docs/api.md": fileData("API doc\nAPI_DOC_TARGET line\nbottom\n"),
        "/docs/changelog.md": fileData("v1\nv2\n"),
        "/notes.txt": fileData("just a note\n"),
      };

      const result = await agent.invoke({
        messages: [
          {
            role: "user",
            content: [
              "다음 절차를 그대로 따라줘. 각 단계는 반드시 명시된 도구로 한 번씩 호출:",
              "1) ls 도구로 '/docs' 디렉터리의 항목들을 나열해.",
              "2) glob 도구로 '/docs/**/*.md' 패턴에 매칭되는 파일을 찾아.",
              "3) grep 도구로 '/docs' 안에서 'API_DOC_TARGET' 리터럴을 검색해.",
              "4) edit_file 도구로 '/docs/api.md' 안의 'API_DOC_TARGET' 을 'API_DOC_REPLACED' 로 교체해.",
              "마지막으로 결과 요약을 한 문장으로만 알려줘.",
            ].join("\n"),
          },
        ],
        files: seed,
      });

      // (2) 호출된 도구 이름들을 수집
      const aiMessages = result.messages.filter(AIMessage.isInstance);
      const toolCalls = aiMessages.flatMap((m) => m.tool_calls ?? []);
      const names = toolCalls.map((tc) => tc.name);
      const tools = new Set(names);

      // (3) ToolMessage 들로 실제 응답 본문 확인
      const toolMessages = result.messages.filter(ToolMessage.isInstance);
      const byCallId = new Map(
        toolMessages.map((m) => [m.tool_call_id, m] as const),
      );

      const last = result.messages[result.messages.length - 1];
      const answer =
        typeof last?.content === "string"
          ? last.content
          : JSON.stringify(last?.content ?? "");

      console.log("\n[tool 호출 순서]  ", names);
      for (const tc of toolCalls) {
        const msg = byCallId.get(tc.id ?? "");
        const body =
          typeof msg?.content === "string"
            ? msg.content
            : JSON.stringify(msg?.content ?? "");
        console.log(
          `  - ${tc.name}(${JSON.stringify(tc.args).slice(0, 120)}) → `,
          body.slice(0, 140).replace(/\n/g, " ⏎ "),
        );
      }
      console.log("[final answer]   ", answer);

      // (4) 네 도구가 모두 한 번 이상 호출되었어야 한다
      for (const expected of ["ls", "glob", "grep", "edit_file"]) {
        expect(tools.has(expected), `${expected} 도구가 호출되어야 한다`).toBe(true);
      }

      // (5) grep 응답에는 매치 라인이 실제로 들어와야 한다
      const grepCall = toolCalls.find((tc) => tc.name === "grep");
      const grepBody = grepCall
        ? (() => {
            const msg = byCallId.get(grepCall.id ?? "");
            return typeof msg?.content === "string"
              ? msg.content
              : JSON.stringify(msg?.content ?? "");
          })()
        : "";
      expect(grepBody).toContain("API_DOC_TARGET");

      // (6) edit_file 후 read_file 없이도 도구 응답에서 교체 사실을 알 수 있어야 한다
      const editCall = toolCalls.find((tc) => tc.name === "edit_file");
      expect(editCall).toBeDefined();
      const editArgs = editCall?.args as {
        old_string?: string;
        new_string?: string;
        file_path?: string;
      };
      expect(editArgs?.old_string).toBe("API_DOC_TARGET");
      expect(editArgs?.new_string).toBe("API_DOC_REPLACED");

      // (7) state.files 에 실제 치환이 반영되었는지
      const files = (result as unknown as { files?: Record<string, FileData> }).files;
      const apiAfter = files?.["/docs/api.md"];
      const apiBody = Array.isArray(apiAfter?.content)
        ? apiAfter!.content.join("\n")
        : "";
      console.log("[/docs/api.md after edit]", JSON.stringify(apiBody));
      expect(apiBody).toContain("API_DOC_REPLACED");
      expect(apiBody).not.toContain("API_DOC_TARGET");
    },
    120_000,
  );
});
