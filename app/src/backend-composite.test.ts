import { describe, expect, it } from "vitest";
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  FilesystemBackend,
} from "deepagents";
import { AIMessage } from "@langchain/core/messages";
import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * CompositeBackend = 경로 prefix 기반 라우터.
 *
 *   default → StateBackend         (스레드 스코프, 휘발성)
 *   /disk/  → FilesystemBackend    (OS 디스크에 실제로 영속)
 *
 * docs/09_deepagents_backends_ko.md 의 "CompositeBackend (라우터)" 패턴.
 *
 * 검증 포인트:
 *  - 두 파일을 동시에 작성했을 때 /disk/* 만 OS 디스크에 떨어진다
 *  - /disk/ prefix 는 backend 내부에서 strip 되어 rootDir 바로 아래에 쓰인다
 */
describe("composite backend (prefix router)", () => {
  it(
    "/disk/* 는 FilesystemBackend, /scratch/* 는 StateBackend 로 라우팅된다",
    async () => {
      const osRoot = mkdtempSync(path.join(tmpdir(), "deepagents-composite-"));

      const agent = createDeepAgent({
        model: "openai:gpt-4o-mini",
        backend: new CompositeBackend(new StateBackend(), {
          "/disk/": new FilesystemBackend({
            rootDir: osRoot,
            virtualMode: true,
          }),
        }),
        systemPrompt:
          "당신은 파일 작성 비서입니다. 사용자가 두 개의 파일을 쓰라고 하면 " +
          "반드시 한 번의 응답 안에서 write_file 도구를 두 번 호출해 동시에 작성하세요. " +
          "추가 설명 없이 작업만 수행하세요.",
      });

      const result = await agent.invoke({
        messages: [
          {
            role: "user",
            content:
              "다음 두 파일을 동시에 작성해줘.\n" +
              "1) '/disk/persisted.txt' 에 'on-disk: hello' 한 줄\n" +
              "2) '/scratch/volatile.txt' 에 'in-state: hi' 한 줄\n" +
              "한 응답 안에서 write_file 도구를 두 번 호출해.",
          },
        ],
      });

      // (1) 모델이 실제로 두 파일을 write_file 로 시도했는지 먼저 확인
      const writeCalls = result.messages
        .filter(AIMessage.isInstance)
        .flatMap((m) => m.tool_calls ?? [])
        .filter((tc) => tc.name === "write_file");

      const writePaths = writeCalls.map(
        (tc) => (tc.args as { file_path?: string })?.file_path ?? "",
      );

      console.log("\n[osRoot]            ", osRoot);
      console.log("[write_file 호출수] ", writeCalls.length);
      console.log("[write_file paths]  ", writePaths);

      const wroteDisk = writePaths.some((p) => p.startsWith("/disk/"));
      const wroteScratch = writePaths.some((p) => p.startsWith("/scratch/"));
      expect(wroteDisk, "모델이 /disk/* 에 write_file 을 호출해야 한다").toBe(true);
      expect(wroteScratch, "모델이 /scratch/* 에 write_file 을 호출해야 한다").toBe(true);

      // (2) /disk/persisted.txt → OS 디스크에 실제로 파일이 떨어졌어야 함.
      //     CompositeBackend 가 prefix 를 strip → FilesystemBackend 는
      //     /persisted.txt 로 보고 rootDir 바로 아래에 기록한다.
      const onDiskPath = path.join(osRoot, "persisted.txt");
      console.log("[기대 OS 경로]      ", onDiskPath);
      console.log("[OS 파일 존재 여부] ", existsSync(onDiskPath));

      expect(existsSync(onDiskPath)).toBe(true);
      const diskContent = readFileSync(onDiskPath, "utf-8");
      console.log("[OS 파일 내용]      ", JSON.stringify(diskContent));
      expect(diskContent).toContain("on-disk: hello");

      // (3) /scratch/* 는 OS 디스크에 흘러가서는 안 된다 (라우팅 격리).
      const leakedScratch = path.join(osRoot, "volatile.txt");
      expect(existsSync(leakedScratch)).toBe(false);

      // (4) /scratch/* 는 StateBackend 에 살아 있어야 한다 — state.files 로 확인
      const files = (result as unknown as { files?: Record<string, unknown> }).files;
      const scratchKey = Object.keys(files ?? {}).find((k) =>
        k.startsWith("/scratch/"),
      );
      console.log(
        "[state.files keys]  ",
        Object.keys(files ?? {}).slice(0, 10),
      );
      expect(scratchKey, "/scratch/* 는 state.files 에 남아 있어야 한다").toBeDefined();
    },
    120_000,
  );
});
