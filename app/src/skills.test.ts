import { describe, expect, it } from "vitest";
import {
  createDeepAgent,
  listSkills,
  StateBackend,
  type FileData,
} from "deepagents";
import { MemorySaver } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import path from "node:path";
import { readFileSync } from "node:fs";

/**
 * Helper: OS 의 SKILL.md 내용을 deepagents 가상 파일시스템에 시드할 수 있는
 * FileData(V1) 형태로 변환. docs 의 JS 예시에서 정의하는 inline 함수와 동일.
 */
function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

describe("skills loader", () => {
  // listSkills() 는 OS 파일을 직접 읽으므로 OS 경로를 받는다
  const osSkillsDir = path.resolve("test-skills");

  it("listSkills() 가 SKILL.md frontmatter 를 정확히 파싱한다", () => {
    const skills = listSkills({ projectSkillsDir: osSkillsDir });

    console.log("\n[parsed skills]");
    for (const s of skills) {
      console.log(
        `  - name=${s.name} source=${s.source} path=${path.relative(osSkillsDir, s.path)}`,
      );
    }

    expect(skills.length).toBe(1);
    const greeting = skills[0];
    expect(greeting?.name).toBe("korean-greeting");
    expect(greeting?.source).toBe("project");
    expect(greeting?.description).toMatch(/한국어로/);
    expect(greeting?.path).toMatch(/korean-greeting\/SKILL\.md$/);
  });

  it("docs 패턴 — virtual fs + files 시드로 progressive disclosure 가 발동한다", async () => {
    // (1) SKILL.md 를 OS 에서 읽어와 가상 fs 에 올릴 형태로 변환
    const osSkillPath = path.join(osSkillsDir, "korean-greeting", "SKILL.md");
    const skillBody = readFileSync(osSkillPath, "utf-8");

    const virtualSkillsRoot = "/skills/"; // deepagents 의 backend 기준 가상 경로
    const virtualSkillFile = "/skills/korean-greeting/SKILL.md";

    const skillsFiles: Record<string, FileData> = {
      [virtualSkillFile]: createFileData(skillBody),
    };

    // (2) StateBackend + MemorySaver 명시. skills 는 OS 경로가 아니라 가상 경로.
    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      backend: new StateBackend(),
      checkpointer: new MemorySaver(),
      skills: [virtualSkillsRoot],
    });

    // (3) invoke 입력에 files 시드 — 가상 fs 에 SKILL.md 를 미리 올려둔다
    const result = await agent.invoke(
      {
        messages: [{ role: "user", content: "안녕, 나는 철수야." }],
        files: skillsFiles,
      },
      { configurable: { thread_id: `skills-${Date.now()}` } },
    );

    const ai = result.messages.filter(AIMessage.isInstance);
    const readFileCalls = ai
      .flatMap((m) => m.tool_calls ?? [])
      .filter((tc) => tc.name === "read_file");
    const allCallNames = ai.flatMap((m) => m.tool_calls ?? []).map((tc) => tc.name);

    const last = result.messages[result.messages.length - 1];
    const answer =
      typeof last?.content === "string"
        ? last.content
        : JSON.stringify(last?.content ?? "");

    console.log("\n[virtual skill path]", virtualSkillFile);
    console.log("[전체 tool 호출]     ", allCallNames.length, "회 —", allCallNames);
    console.log("[read_file 호출]     ", readFileCalls.length);
    for (const tc of readFileCalls) {
      console.log(`  - ${(tc.args as { file_path?: string })?.file_path}`);
    }
    console.log("[final answer]       ", answer);

    // progressive disclosure 가 자동 발동했다면 read_file 로 SKILL.md 를 읽어야 함
    expect(readFileCalls.length).toBeGreaterThan(0);
    // 그리고 본문의 마커가 응답에 그대로 들어와야 함 — 본문이 실제로 적용됐다는 강증거
    expect(answer).toContain("[GREETING-SKILL-APPLIED]");
  });
});
