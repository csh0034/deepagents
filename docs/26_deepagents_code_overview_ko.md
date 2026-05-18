# Deep Agents Code

> 원문: https://docs.langchain.com/oss/python/deepagents/code/overview
>
> Deep Agents SDK 위에 구축된 터미널 코딩 에이전트

---

## 📖 목차

1. [Deep Agents Code란?](#-deep-agents-code란)
2. [빠른 시작 (Quickstart)](#-빠른-시작-quickstart)
3. [기능 (Capabilities)](#-기능-capabilities)
4. [명령 레퍼런스 (Command reference)](#-명령-레퍼런스-command-reference)
5. [구성 (Configuration)](#-구성-configuration)
6. [대화형 모드 (Interactive mode)](#-대화형-모드-interactive-mode)
7. [비대화형 모드 및 파이프 (Non-interactive mode and piping)](#-비대화형-모드-및-파이프-non-interactive-mode-and-piping)
8. [LangSmith로 트레이싱 (Trace with LangSmith)](#-langsmith로-트레이싱-trace-with-langsmith)

---

## 📌 Deep Agents Code란?

Deep Agents Code(`dcode`)는 [Deep Agents SDK](https://docs.langchain.com/oss/python/deepagents/quickstart) 위에 구축된 오픈소스 코딩 에이전트입니다.
도구 호출(tool calling)을 지원하는 모든 LLM과 함께 동작하며, 입력 간에 LLM을 자유롭게 전환할 수 있습니다.
또한 대화에서 학습한 내용을 영속 메모리로 유지하고, 세션 간 컨텍스트를 보존하며, 커스터마이징 가능한 스킬을 사용하고, 승인 제어와 함께 코드를 실행합니다.

---

## 🚀 빠른 시작 (Quickstart)

### 1단계: 설치 및 실행

OpenAI, Anthropic, Google은 기본 설치됩니다. 다른 프로바이더(Ollama, Groq, xAI 등)는 선택적 extras로 사용 가능합니다 — 자세한 내용은 [Providers](https://docs.langchain.com/oss/python/deepagents/code/providers)를 참고하세요.

```bash
# Script
curl -LsSf https://langch.in/dcode | bash
```

```bash
# Optional extras
# Example: install with Fireworks and Nvidia providers
DEEPAGENTS_EXTRAS="fireworks,nvidia" curl -LsSf https://langch.in/dcode | bash

# OpenAI, Anthropic, and Gemini are included by default
# View all extras:
# https://docs.langchain.com/oss/python/deepagents/code/providers
```

```bash
# uv
# Example: install with Fireworks and Nvidia providers
uv tool install 'deepagents-code[fireworks,nvidia]'

# OpenAI, Anthropic, and Gemini are included by default
# View all extras:
# https://docs.langchain.com/oss/python/deepagents/code/providers
```

```bash
dcode
```

![Deep Agents Code](https://mintcdn.com/langchain-5e9cc07a/K17j_uBSCpWoKNGK/oss/images/deepagents/deepagents-cli.png?fit=max&auto=format&n=K17j_uBSCpWoKNGK&q=85&s=65b8e32a3d973ebdf0a5bffc06fc057b)

### 2단계: 프로바이더 자격 증명 추가

Deep Agents Code는 도구 호출을 지원하는 모든 LLM과 함께 동작합니다. `/auth` 명령으로 선택한 프로바이더에 대한 API 키를 설정하세요 — 전체 절차와 저장 방식은 [Provider credentials](https://docs.langchain.com/oss/python/deepagents/code/configuration#provider-credentials)를 참고하세요.

추가 프로바이더 및 헤드리스(headless) 실행은 [Providers](https://docs.langchain.com/oss/python/deepagents/code/providers)를 참고하세요.

> ℹ️ 웹 검색은 [Tavily](https://tavily.com)를 사용하며 `/auth`로 설정되지 **않습니다**. 시작 시 "Web search disabled — `TAVILY_API_KEY` is not set" 메시지가 보이면 `~/.deepagents/.env`에 `TAVILY_API_KEY=tvly-...`를 추가하고 `/reload`를 실행(또는 재시작)하세요. [Enable web search with Tavily](https://docs.langchain.com/oss/python/deepagents/code/configuration#enable-web-search-with-tavily)를 참고하세요.

### 3단계: 에이전트에 작업 요청

```txt
Create a Python script that prints "Hello, World!"
```

에이전트는 쿼리를 해석하고 파일을 수정하기 전에 변경 사항을 diff와 함께 제안하여 사용자의 승인을 받습니다. 필요한 경우 코드를 테스트하기 위해 셸 명령을 실행하거나, 문서를 확인하거나, 최신 정보를 위해 웹을 검색할 수 있습니다.

### 4단계: 트레이싱 활성화 (선택)

에이전트의 작업, 도구 호출, 의사 결정을 LangSmith에 기록하려면 `~/.deepagents/.env`에 다음을 추가하거나 셸에서 변수를 export하세요.

```bash
# ~/.deepagents/.env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=optional-project-name  # Specify a project name or default to "deepagents-code"
```

자세한 내용과 사용 방법은 [LangSmith로 트레이싱](#-langsmith로-트레이싱-trace-with-langsmith)을 참고하세요.

> ℹ️ Deep Agents Code는 Windows를 공식 지원하지 않습니다. Windows 사용자는 [Windows Subsystem for Linux(WSL)](https://learn.microsoft.com/en-us/windows/wsl/install)에서 실행을 시도해 보세요.

---

## 🧩 기능 (Capabilities)

Deep Agents Code에는 다음과 같은 내장 기능이 있습니다.

- **파일 작업(File operations)** — 파일을 읽고, 쓰고, 편집하는 도구로 에이전트가 코드 및 문서를 관리/수정할 수 있게 합니다.
- **셸 실행(Shell execution)** — 명령을 실행하여 테스트, 빌드, 의존성 관리, 버전 관리(VCS) 상호작용을 수행합니다.
- **[원격 샌드박스(Remote sandboxes)](https://docs.langchain.com/oss/python/deepagents/code/remote-sandboxes)** — 로컬 머신 대신 LangSmith, Daytona, Modal, Runloop, AgentCore에서 에이전트 도구를 실행합니다. 링크된 페이지에서 프로바이더 설치, 자격 증명, 샌드박스 플래그(`--sandbox`, `--sandbox-id`, `--sandbox-setup`), 설정 스크립트를 다룹니다.
- **웹 검색(Web search)** — 최신 정보와 문서를 위해 웹을 검색합니다. [`TAVILY_API_KEY`](https://docs.langchain.com/oss/python/deepagents/code/configuration#enable-web-search-with-tavily)에 Tavily API 키가 필요합니다.
- **HTTP 요청(HTTP requests)** — 데이터 가져오기 및 통합 작업을 위해 API 및 외부 서비스에 HTTP 요청을 보냅니다.
- **작업 계획 및 추적(Task planning and tracking)** — 복잡한 작업을 개별 단계로 분해하고 진행 상황을 추적합니다.
- **[서브에이전트(Subagents)](https://docs.langchain.com/oss/python/deepagents/code/subagents)** — `task` 도구로 작업을 위임합니다. Deep Agents Code에서는 커스텀 서브에이전트를 `AGENTS.md` 파일로 정의합니다. 링크된 페이지에서 경로, 프론트매터, 예시를 다룹니다.
- **[메모리 저장 및 검색(Memory storage and retrieval)](https://docs.langchain.com/oss/python/deepagents/code/memory-and-skills#memory)** — 세션 간 정보를 저장/검색하여, 에이전트가 프로젝트 규약과 학습된 패턴을 기억할 수 있게 합니다.
- **컨텍스트 압축 및 오프로딩(Context compaction & offloading)** — 오래된 대화 메시지를 요약하고 원본은 저장소로 오프로딩하여, 긴 세션 동안 컨텍스트 윈도우 공간을 확보합니다.
- **Human-in-the-loop** — 민감한 도구 작업에 대해 사람의 승인을 요구합니다.
- **[스킬(Skills)](https://docs.langchain.com/oss/python/deepagents/code/memory-and-skills#skills)** — 커스텀 전문 지식과 지시 사항으로 에이전트의 능력을 확장합니다.
- **[MCP 도구(MCP tools)](https://docs.langchain.com/oss/python/deepagents/code/mcp-tools)** — [Model Context Protocol](https://modelcontextprotocol.io/) 서버로부터 외부 도구를 로드합니다.
- **[트레이싱(Tracing)](https://docs.langchain.com/oss/python/deepagents/code/overview#trace-with-langsmith)** — 관찰성(observability)과 디버깅을 위해 LangSmith에서 에이전트 작업을 추적합니다.

### 내장 도구 전체 목록

에이전트에는 별도 구성 없이 사용할 수 있는 다음 내장 도구가 포함되어 있습니다.

| 도구 | 설명 | Human-in-the-Loop |
|------|------|-------------------|
| `ls` | 파일 및 디렉토리 나열 | - |
| `read_file` | 파일 내용 읽기; 일부 모델에 대해 멀티모달 콘텐츠 지원 | - |
| `write_file` | 파일 생성 또는 덮어쓰기 | 필수<sup>1</sup> |
| `edit_file` | 기존 파일에 타깃 편집 수행 | 필수<sup>1</sup> |
| `glob` | 패턴에 일치하는 파일 찾기 | - |
| `grep` | 파일 전체에서 텍스트 패턴 검색 | - |
| `execute` | 로컬 또는 원격 샌드박스에서 셸 명령 실행 | 필수<sup>1</sup> |
| `web_search` | Tavily로 웹 검색 (`TAVILY_API_KEY` 필요 — [Enable web search](https://docs.langchain.com/oss/python/deepagents/code/configuration#enable-web-search-with-tavily) 참고) | 필수<sup>1</sup> |
| `fetch_url` | 웹 페이지를 가져와 마크다운으로 변환 | 필수<sup>1</sup> |
| `task` | 병렬 실행을 위해 서브에이전트에 작업 위임 | 필수<sup>1</sup> |
| `ask_user` | 사용자에게 자유 응답 또는 객관식 질문 | - |
| `compact_conversation` | 오래된 메시지를 요약하고, 원본을 백엔드 저장소로 오프로딩하며, 컨텍스트에서는 요약으로 대체 | 혼합<sup>2</sup> |
| `write_todos` | 복잡한 작업을 위한 task 리스트 생성 및 관리 | - |

<sup>1</sup>: 잠재적으로 파괴적인 작업은 실행 전에 사용자 승인이 필요합니다. 사람 승인을 우회하려면 auto-approve를 토글(Shift+Tab)하거나, 옵션과 함께 시작할 수 있습니다.

```bash
dcode -y
# 또는
dcode --auto-approve
```

> ℹ️ Deep Agents Code를 비대화형으로 실행하는 경우(`-n` 또는 stdin 파이프 사용), `-y`/`--auto-approve`가 있어도 셸 실행은 기본적으로 비활성화됩니다. `-S`/`--shell-allow-list`로 특정 명령을 허용 목록에 추가하거나(`-S "pytest,git,make"`), 안전한 기본값을 위해 `recommended`, 모든 명령을 허용하려면 `all`을 사용하세요. `DEEPAGENTS_CODE_SHELL_ALLOW_LIST` 환경 변수도 지원됩니다. [비대화형 모드 및 파이프](#-비대화형-모드-및-파이프-non-interactive-mode-and-piping)를 참고하세요.

<sup>2</sup>: Deep Agents Code는 토큰 사용량이 모델별 임계값을 초과하면 백그라운드에서 대화를 자동으로 오프로딩합니다. 오프로딩은 LLM을 통해 오래된 메시지를 요약하고, 원본을 저장소(`/conversation_history/{thread_id}.md`)로 이젝트하며, 컨텍스트에서는 요약으로 대체합니다. 필요 시 에이전트는 오프로딩된 파일에서 전체 히스토리를 다시 가져올 수 있습니다. `compact_conversation` 도구를 사용하면 에이전트(또는 사용자)가 오프로딩을 직접 트리거할 수 있습니다. 도구로 호출될 때는 기본적으로 사용자 승인이 필요합니다.

> 💡 [데모 영상 보기](https://youtu.be/IrnacLa9PJc?si=3yUnPbxnm2yaqVQb) — Deep Agents Code의 작동 방식을 확인할 수 있습니다.

---

## ⌨️ 명령 레퍼런스 (Command reference)

```bash
# 특정 에이전트 구성 사용
dcode --agent mybot

# 특정 모델 사용 (provider:model 형식 또는 자동 감지)
dcode --model anthropic:claude-opus-4-7
dcode --model gpt-5.5

# 도구 사용 자동 승인 (human-in-the-loop 프롬프트 생략)
dcode -y

# 디렉토리 내용 나열 후, 디렉토리 요약을 첫 프롬프트로 실행 — 명령이 먼저 실행되고, 그 다음 프롬프트가 제출됨
# 프롬프트는 명령 출력에 접근할 수 없음
dcode --startup-cmd "ls -la" -m "Summarize what's in this directory"

# 비대화형 + 시작 명령: 작업 실행 전 git 상태 표시
# 작업은 명령 출력에 접근할 수 없음
dcode --startup-cmd "git diff --stat" -n "Review these changes"
```

### 커맨드라인 옵션 (Command-line options)

| 옵션 | 설명 |
|------|------|
| `-a`, `--agent NAME` | 별도 메모리를 가진 명명된 에이전트 사용. `config.toml`의 `[agents].recent`를 재정의. 기본값: `agent`(`[agents].recent`가 설정된 경우 가장 최근 사용된 에이전트) |
| `-M`, `--model MODEL` | 특정 모델 사용 (`provider:model`) |
| `--model-params JSON` | 모델에 전달할 추가 kwargs를 JSON 문자열로 (예: `'{"temperature": 0.7}'`) |
| `--default-model [MODEL]` | 기본 모델 설정 |
| `--clear-default-model` | 기본 모델 해제 |
| `-r`, `--resume [ID]` | 세션 재개: `-r`은 가장 최근, `-r <ID>`는 특정 스레드 |
| `-m`, `--message TEXT` | 세션 시작 시 자동 제출할 초기 프롬프트 (대화형 모드) |
| `--skill NAME` | 시작 시 스킬 호출 |
| `--startup-cmd CMD` | 첫 프롬프트 전 시작 시 실행할 셸 명령. 출력은 참조용으로 트랜스크립트에 렌더링되지만 에이전트의 메시지 히스토리에는 **추가되지 않음**. 명령 출력을 에이전트에 전달하려면 stdin으로 파이프하세요 (예: `git diff \| dcode -n "Review these changes"`). 0이 아닌 종료 코드 및 타임아웃은 경고만 표시하고 중단하지는 않음. 비대화형 모드에서는 60초 타임아웃이 적용됨. |
| `-n`, `--non-interactive TEXT` | 단일 작업을 비대화형으로 실행하고 종료. `--shell-allow-list`가 설정되지 않으면 셸은 비활성화됨 |
| `--max-turns N` | 비대화형 모드의 에이전트 턴 수 상한. 초과 시 코드 124로 종료. `-n` 또는 파이프된 stdin이 필요함. [`--max-turns`로 턴 수 제한](#-비대화형-모드-및-파이프-non-interactive-mode-and-piping)을 참고 |
| `-q`, `--quiet` | 파이핑에 적합한 깔끔한 출력 — 에이전트 응답만 stdout으로 전송. `-n` 또는 파이프된 stdin 필요 |
| `--no-stream` | 스트리밍 대신 전체 응답을 버퍼링한 후 한 번에 stdout으로 출력. `-n` 또는 파이프된 stdin 필요 |
| `--stdin` | 자동 감지 대신 stdin에서 명시적으로 입력 읽기. stdin이 사용 불가하거나 TTY일 때 명확하게 오류 |
| `-y`, `--auto-approve` | 모든 도구 호출을 프롬프트 없이 자동 승인 (human-in-the-loop 비활성화). 대화형 세션 중 `Shift+Tab`으로 토글 |
| `-S`, `--shell-allow-list LIST` | 자동 승인할 셸 명령(쉼표 구분), 안전한 기본값을 위한 `'recommended'`, 또는 모든 명령을 허용하는 `'all'`. `-n` 및 대화형 모드 모두에 적용 |
| `--json` | 관리용 서브커맨드(`agents`, `threads`, `skills`, `update`)에서 머신 판독 가능한 JSON 출력. 출력 envelope: `{"schema_version": 1, "command": "...", "data": ...}` |
| `--sandbox TYPE` | 코드 실행용 원격 샌드박스: `none`(기본), `langsmith`, `agentcore`, `modal`, `daytona`, `runloop`. LangSmith는 기본 포함이며, AgentCore/Modal/Daytona/Runloop은 extras 필요 |
| `--sandbox-id ID` | 기존 샌드박스 재사용(생성 및 정리 생략) |
| `--sandbox-setup PATH` | 샌드박스 생성 후 실행할 설정 스크립트 경로 |
| `--mcp-config PATH` | 최고 우선순위로 명시적 MCP 구성 추가 (자동 발견된 구성과 병합) |
| `--no-mcp` | 모든 MCP 도구 로딩 비활성화 |
| `--trust-project-mcp` | stdio 서버를 사용하는 프로젝트 수준 MCP 구성 신뢰(승인 프롬프트 생략) |
| `--profile-override JSON` | 모델 프로필 필드를 JSON 문자열로 재정의 (예: `'{"max_input_tokens": 4096}'`). 설정 파일의 프로필 오버라이드 위에 병합됨 |
| `--acp` | 대화형 UI 대신 stdio를 통해 ACP 서버로 실행 |
| `-v`, `--version` | 버전 표시 |
| `-h`, `--help` | 도움말 표시 |

### CLI 명령 (CLI commands)

| 명령 | 설명 |
|------|------|
| `dcode help` | 도움말 표시 |
| `dcode agents list` | 모든 에이전트 나열 (별칭: `ls`) |
| `dcode agents reset --agent NAME` | 에이전트 메모리 초기화 및 기본값으로 리셋. `--dry-run` 지원 |
| `dcode agents reset --agent NAME --target SOURCE` | 다른 에이전트로부터 메모리 복사 |
| `dcode update` | Deep Agents Code 업데이트 확인 및 설치 |
| `dcode skills list [--project]` | 모든 스킬 나열 (별칭: `ls`) |
| `dcode skills create NAME [--project]` | 템플릿 `SKILL.md`로 새 스킬 생성. 멱등적 — 기존 스킬을 재생성하면 오류 대신 정보 메시지 표시 |
| `dcode skills info NAME [--project]` | 스킬 상세 정보 표시 |
| `dcode skills delete NAME [--project] [-f]` | 스킬과 그 콘텐츠 삭제. `--dry-run` 지원 |
| `dcode threads list [--agent NAME] [--limit N]` | 세션 나열 (별칭: `ls`). 기본 limit: 20. `-n`은 `--limit`의 짧은 플래그. 추가 플래그: `--sort {created,updated}`, `--branch TEXT`(git 브랜치 필터), `-v`/`--verbose`(브랜치/생성 시간/초기 프롬프트 등 모든 컬럼 표시), `-r`/`--relative`(상대 타임스탬프) |
| `dcode threads delete ID` | 세션 삭제. `--dry-run` 지원 |
| `dcode mcp login NAME [--config PATH]` | `auth: "oauth"`로 표시된 MCP 서버에 대해 OAuth 로그인 흐름 실행. [MCP tools](https://docs.langchain.com/oss/python/deepagents/code/mcp-tools#oauth-login) 참고 |
| `deepagents deploy` | 기존 Deep Agents Deploy 사용자를 위한 레거시 배포 명령. [Legacy CLI deploy](https://docs.langchain.com/oss/python/deepagents/deploy/overview) 참고 |

모든 관리용 서브커맨드는 머신 판독 가능 출력을 위해 `--json`을 지원합니다. 자세한 내용은 [커맨드라인 옵션](#커맨드라인-옵션-command-line-options)을 참고하세요.

파괴적 명령(`agents reset`, `skills delete`, `threads delete`)은 변경 없이 결과를 미리 보기 위해 `--dry-run`을 지원합니다. JSON 모드에서는 `--dry-run`이 `dry_run: true` 필드를 추가한 동일한 envelope를 반환합니다.

---

## ⚙️ 구성 (Configuration)

전체 레퍼런스 — `config.toml` 스키마, 프로바이더 파라미터, 프로필 오버라이드, 훅(hook) 구성 등 — 는 [Configuration](https://docs.langchain.com/oss/python/deepagents/code/configuration)을 참고하세요.

Deep Agents Code는 모든 구성을 `~/.deepagents/` 아래에 저장합니다. 해당 디렉토리 안에서 각 에이전트는 자체 서브디렉토리(기본값: `agent`)를 가집니다.

| 경로 | 용도 |
|------|------|
| `~/.deepagents/config.toml` | 모델 및 에이전트 기본값, 프로바이더 설정, 생성자 파라미터, 프로필 오버라이드, 테마, 업데이트 설정, MCP 신뢰 저장소 |
| `~/.deepagents/.env` | 글로벌 API 키 및 시크릿. [구성](https://docs.langchain.com/oss/python/deepagents/code/configuration#environment-variables) 참고 |
| `~/.deepagents/hooks.json` | 라이프사이클 이벤트 훅(세션 시작/종료, 작업 완료 등) |
| `~/.deepagents/<agent_name>/` | 에이전트별 메모리, 스킬, 대화 스레드 |
| `.deepagents/` (프로젝트 루트) | 프로젝트별 메모리 및 스킬, git 리포 안에서 실행 시 로드됨 |

```bash
# 구성된 모든 에이전트 나열
dcode agents list
```

---

## 💬 대화형 모드 (Interactive mode)

채팅 인터페이스처럼 자연스럽게 입력하세요.
에이전트는 내장 도구, 스킬, 메모리를 사용하여 작업을 도와줍니다.

### 슬래시 명령 (Slash commands)

Deep Agents Code 세션 내에서 사용할 수 있는 명령들입니다.

- `/model` — 모델을 전환하거나 대화형 모델 선택기를 엽니다.
- `/agents` — 재실행 없이 사전 구성된 에이전트 간 핫스왑. 자세한 내용은 [Command reference](https://docs.langchain.com/oss/python/deepagents/code/overview#command-reference)를 참고하세요.
- `/auth` — 모델 프로바이더용 저장된 API 키 관리. 자세한 내용은 [Provider credentials](https://docs.langchain.com/oss/python/deepagents/code/configuration#provider-credentials)를 참고하세요.
- `/remember [context]` — 대화를 검토하고 메모리와 스킬을 업데이트. 선택적으로 추가 컨텍스트 전달 가능.
- `/skill:<name> [args]` — 이름으로 스킬을 직접 호출. 스킬의 `SKILL.md` 지시 사항이 인자와 함께 프롬프트에 주입됨.
- `/skill-creator [args]` — 효과적인 에이전트 스킬 작성 가이드.
- `/offload` (별칭 `/compact`) — 메시지를 저장소로 오프로딩하고 요약 플레이스홀더를 두어 컨텍스트 윈도우 공간을 확보. 필요 시 에이전트는 오프로딩된 파일에서 전체 히스토리를 다시 가져올 수 있음.
- `/tokens` — 현재 컨텍스트 윈도우 토큰 사용량 분해 표시.
- `/clear` — 대화 기록을 지우고 새 스레드 시작.
- `/threads` — 이전 대화 스레드 탐색 및 재개.
- `/mcp` — 활성 MCP 서버 및 도구 표시.
- `/reload` — 재시작 없이 `.env` 파일 재읽기, 설정 새로고침, 스킬 재발견. 대화 상태는 보존됨. 오버라이드 동작은 [`DEEPAGENTS_CODE_` prefix](https://docs.langchain.com/oss/python/deepagents/code/configuration#deepagents_code_-prefix)를 참고.
- `/theme` — 컬러 테마를 전환하는 대화형 테마 선택기 열기. 내장 테마 및 [사용자 정의 테마](https://docs.langchain.com/oss/python/deepagents/code/configuration#themes)도 사용 가능.
- `/update` — Deep Agents Code 업데이트를 인라인으로 확인 및 설치. 설치 방법(uv, Homebrew, pip)을 감지하여 적절한 업그레이드 명령을 실행.
- `/auto-update` — 자동 업데이트 켜기/끄기 토글.
- `/trace` — 현재 스레드를 LangSmith에서 열기 (`LANGSMITH_API_KEY` 필요).
- `/editor` — 현재 프롬프트를 외부 에디터(`$VISUAL` / `$EDITOR`)에서 열기. [External editor](https://docs.langchain.com/oss/python/deepagents/code/configuration#external-editor) 참고.
- `/changelog` — Deep Agents Code 변경 이력을 브라우저에서 열기.
- `/docs` — 문서를 브라우저에서 열기.
- `/feedback` — 버그 리포트 또는 기능 요청을 위한 GitHub 이슈 페이지 열기.
- `/version` — 설치된 `deepagents-code` 및 SDK 버전 표시.
- `/help` — 도움말 및 사용 가능한 명령 표시.
- `/quit` — Deep Agents Code 종료.

### 셸 명령 (Shell commands)

`!`를 입력해 셸 모드로 진입한 후, 명령을 입력하세요.

```bash
git status
npm test
ls -la
```

### 키보드 단축키 (Keyboard shortcuts)

**일반**

| 단축키 | 동작 |
|--------|------|
| `Enter` | 프롬프트 제출 |
| `Shift+Enter`, `Ctrl+J`, `Alt+Enter`, `Ctrl+Enter` | 줄바꿈 삽입 |
| `Ctrl+A` | 입력란의 모든 텍스트 선택 |
| `@filename` | 파일 자동완성 및 내용 주입 |
| `Shift+Tab` 또는 `Ctrl+T` | auto-approve 토글 |
| `Ctrl+U` | 줄 시작까지 삭제 |
| `Ctrl+X` | 외부 에디터에서 프롬프트 열기 |
| `Ctrl+O` | 가장 최근 도구 출력 펼치기/접기 |
| `Escape` | 현재 작업 중단 |
| `Ctrl+C` | 중단 또는 종료 |
| `Ctrl+D` | 종료 |

---

## 🔧 비대화형 모드 및 파이프 (Non-interactive mode and piping)

`-n`을 사용하면 대화형 UI를 실행하지 않고 단일 작업을 수행할 수 있습니다.

```bash
dcode -n "Write a Python script that prints hello world"
```

stdin을 통해 입력을 파이프할 수도 있습니다. 입력이 파이프되면 Deep Agents Code는 자동으로 비대화형으로 실행됩니다.

```bash
echo "Explain this code" | dcode
cat error.log | dcode -n "What's causing this error?"
git diff | dcode -n "Review these changes"
git diff | dcode --skill code-review -n 'summarize changes'
```

파이프 입력을 `-n` 또는 `-m`과 결합하면, 파이프된 내용이 먼저 표시되고 이어서 플래그에 전달한 텍스트가 추가됩니다.

> ℹ️ 파이프 입력의 최대 크기는 10 MiB입니다.

비대화형 모드에서는 셸 실행이 기본적으로 비활성화됩니다. `-S`/`--shell-allow-list`로 특정 명령을 활성화하거나(`-S "pytest,git,make"`), 안전한 기본값을 위한 `recommended`, 모든 명령 허용을 위한 `all`을 사용하세요.

### `--max-turns`로 턴 수 제한

CI/CD 파이프라인에서 장시간 실행되거나 잘못 동작하는 에이전트는 무한 루프에 빠질 수 있습니다. `--max-turns N`은 SDK 내부를 건드리지 않고도 운영자에게 명확한 상한을 제공합니다.

```bash
dcode -n "fix the failing tests" --max-turns 10
```

`N`은 양의 정수여야 하며, 폭주 루프를 막는 내부 안전 기본값을 재정의합니다. 예산이 초과되면 (GNU `timeout`과 일치하는) 코드 124로 종료되어 CI가 예산 초과를 일반 실패와 구분할 수 있습니다. `-n` 또는 파이프된 stdin 필요. 그 외에는 코드 2로 종료됩니다.

### 깔끔한 출력 및 버퍼링

다른 명령으로 파이핑하기에 적합한 깔끔한 출력을 위해 `-q`를, 스트리밍 대신 전체 응답을 버퍼링한 후 stdout으로 출력하기 위해 `--no-stream`을 사용하세요.

```bash
dcode -n "Generate a .gitignore for Python" -q > .gitignore
dcode -n "List dependencies" -q --no-stream | sort
```

비대화형 모드에서 에이전트는 명확화 질문을 던지지 않고 합리적인 가정 하에 자율적으로 진행하도록 지시받습니다. 또한 비대화형 명령 변형(예: `npm init -y`, `apt-get install -y`)을 선호합니다.

### 셸 실행 예시

```bash
# 특정 명령 허용 (목록과 대조하여 검증됨)
dcode -n "Run the tests and fix failures" -S "pytest,git,make"

# 큐레이션된 안전 명령 목록 사용
dcode -n "Build the project" -S recommended

# 임의의 셸 명령 허용
dcode -n "Fix the build" -S all
```

> ⚠️ **신중하게 사용하세요.**
>
> `-S all`(또는 `--shell-allow-list all`)은 에이전트가 사람의 확인 없이 임의의 셸 명령을 실행하도록 허용합니다.

---

## 📡 LangSmith로 트레이싱 (Trace with LangSmith)

[LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-deepagents-code-overview) 트레이싱을 활성화하면 에이전트의 작업, 도구 호출, 의사 결정을 LangSmith 프로젝트에서 볼 수 있습니다.

매 세션마다 셸에서 export하지 않아도 되도록 트레이싱 키를 `~/.deepagents/.env`에 추가하세요.

```bash
# ~/.deepagents/.env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=optional-project-name  # Specify a project name or default to "deepagents-code"
```

특정 프로젝트에서 재정의하려면 프로젝트 디렉토리의 `.env`에 동일한 키들을 추가하세요. 전체 로딩 순서는 [environment variables](https://docs.langchain.com/oss/python/deepagents/code/configuration#environment-variables)를 참고하세요.

원한다면 셸 환경 변수로도 설정할 수 있습니다. 셸 export는 항상 `.env` 값보다 우선되므로, 임시 재정의나 테스트에 적합합니다.

```bash
export LANGSMITH_TRACING=false
```

### 에이전트 트레이스를 앱 트레이스와 분리

LangChain 애플리케이션에서 Deep Agents Code를 프로그래밍 방식으로 호출하는 경우(예: [비대화형 모드](#-비대화형-모드-및-파이프-non-interactive-mode-and-piping)의 서브프로세스로), 앱과 Deep Agents Code 모두 LangSmith 트레이스를 생성합니다. 기본적으로 이들은 모두 동일한 프로젝트에 기록됩니다.

Deep Agents Code 트레이스를 전용 프로젝트로 보내려면 `DEEPAGENTS_CODE_LANGSMITH_PROJECT`를 설정하세요.

```bash
# ~/.deepagents/.env
DEEPAGENTS_CODE_LANGSMITH_PROJECT=my-deep-agent-execution
```

그런 다음 상위 애플리케이션의 트레이스를 위해 `LANGSMITH_PROJECT`를 구성하세요.

```bash
# ~/.deepagents/.env
LANGSMITH_PROJECT=my-app-traces
```

이렇게 하면 앱 수준의 관찰성을 깔끔하게 유지하면서도 에이전트 내부 실행을 별도 프로젝트에 캡처할 수 있습니다.

LangSmith 자격 증명을 Deep Agents Code에만 적용하려면 [`DEEPAGENTS_CODE_` prefix](https://docs.langchain.com/oss/python/deepagents/code/configuration#deepagents_code_-prefix)를 사용할 수도 있습니다 (예: `DEEPAGENTS_CODE_LANGSMITH_API_KEY`).

설정되면 Deep Agents Code는 LangSmith 프로젝트 링크가 있는 상태 표시줄을 표시합니다. 지원하는 터미널에서는 링크를 클릭하면 바로 열 수 있습니다. `/trace`를 사용해 URL을 출력하고 브라우저에서 열 수도 있습니다.

```sh
✓ LangSmith tracing: 'my-project'
```
