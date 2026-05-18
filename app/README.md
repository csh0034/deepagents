# deepagents POC (TypeScript)

[`deepagents`](https://www.npmjs.com/package/deepagents) (LangChain) 라이브러리를 직접 굴려보기 위한 TypeScript 샘플입니다.

## 요구사항

- Node.js **20+** (개발 시 `node --version` 으로 확인)
- OpenAI API 키 (`OPENAI_API_KEY`)

## 셋업

```bash
cd app
cp .env.example .env   # 그리고 키 채우기
npm install
```

## 실행

| 스크립트 | 설명 | 필요한 키 |
|---|---|---|
| `npm test` | Vitest 로 deepagents 동작을 검증 (실제 OpenAI 호출 1회). | `OPENAI_API_KEY` |
| `npm run test:watch` | watch 모드. 파일 저장마다 재실행. | `OPENAI_API_KEY` |
| `npm run typecheck` | 타입 검사만 수행 (`tsc --noEmit`). | 없음 |

> `vitest.config.ts` 가 `loadEnv()` 로 `.env` 를 자동 주입하므로 별도 `dotenv.config()` 호출은 없습니다.

## 파일 구성

```
app/
├── src/
│   ├── invoke.test.ts       # 환경 변수 + 기본 invoke
│   ├── memory.test.ts       # MemorySaver + thread_id 멀티턴/격리
│   ├── tools.test.ts        # 커스텀 tool / write_todos / subagent
│   ├── streaming.test.ts    # agent.stream() updates / messages 모드
│   ├── interrupt.test.ts    # interruptOn 으로 HITL approve/reject
│   ├── structured.test.ts   # responseFormat + providerStrategy(zod)
│   └── filesystem.test.ts   # write_file / read_file 내장 도구
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 다음으로 해 볼 만한 것

- 모델 교체: `model: "anthropic:claude-..."` / `"google-genai:gemini-..."` (`@langchain/anthropic`, `@langchain/google-genai` 설치 필요). 현재 기본값은 `openai:gpt-4o-mini`.
- `subagents` 옵션으로 서브에이전트 정의 → [`docs/10_deepagents_subagents_ko.md`](../docs/10_deepagents_subagents_ko.md)
- 자체 파일시스템 백엔드 연결 → [`docs/09_deepagents_backends_ko.md`](../docs/09_deepagents_backends_ko.md)
- 스트리밍으로 중간 토큰 출력 → [`docs/20_deepagents_streaming_ko.md`](../docs/20_deepagents_streaming_ko.md)
