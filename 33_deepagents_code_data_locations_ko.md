# Deep Agents Code: 데이터 위치 (Data locations)

> 원문: https://docs.langchain.com/oss/python/deepagents/code/data-locations
>
> Deep Agents Code가 설정, 세션, 커스터마이징 파일을 저장하는 위치

---

Deep Agents Code는 데이터를 두 개의 디렉터리 계층에 저장합니다.

- **`~/.deepagents/`** — Deep Agents 전용 데이터(에이전트 메모리, 스킬, 세션)
- **`~/.agents/`** — 도구 비종속적 데이터(여러 AI CLI 도구 간 공유되는 스킬)

---

## 📖 목차

1. [디렉터리 구조 (Directory structure)](#-디렉터리-구조-directory-structure)
2. [어떤 데이터가 어디에 (What goes where)](#-어떤-데이터가-어디에-what-goes-where)
3. [우선순위 규칙 (Precedence rules)](#-우선순위-규칙-precedence-rules)
4. [`.deepagents` vs `.agents`](#-deepagents-vs-agents)
5. [정리 (Cleaning up)](#-정리-cleaning-up)

---

## 🗂️ 디렉터리 구조 (Directory structure)

```text
~/.deepagents/
├── .state/                  # 머신별 Deep Agents Code 상태(자동 관리)
│   ├── sessions.db          #   대화 체크포인트용 SQLite 데이터베이스
│   ├── history.jsonl        #   명령 입력 히스토리
│   ├── ...                  #   다른 마커와 자격 증명
└── {agent}/                 # 에이전트별 디렉터리(기본값: "agent")
    ├── AGENTS.md            # 에이전트 지시 사항에 대한 사용자 커스터마이징
    ├── skills/              # 사용자 수준 스킬
    │   └── {skill-name}/
    │       └── SKILL.md
    └── agents/              # 커스텀 서브에이전트 정의
        └── {subagent-name}/
            └── AGENTS.md

~/.agents/                   # 도구 비종속적 alias(여러 AI CLI에서 공유)
└── skills/                  # 호환 가능한 모든 도구에서 사용 가능한 스킬
    └── {skill-name}/
        └── SKILL.md

{project}/                   # 프로젝트 수준(git 리포 루트)
├── AGENTS.md                # 프로젝트 지시 사항(루트 수준)
└── .deepagents/
│   ├── AGENTS.md            # 프로젝트 지시 사항(선호 위치)
│   ├── skills/              # 프로젝트별 스킬
│   │   └── {skill-name}/
│   │       └── SKILL.md
│   └── agents/              # 프로젝트별 서브에이전트
│       └── {subagent-name}/
│           └── AGENTS.md
└── .agents/                 # 도구 비종속적 프로젝트 스킬
    └── skills/
        └── {skill-name}/
            └── SKILL.md
```

---

## 📚 어떤 데이터가 어디에 (What goes where)

| 데이터 | 위치 | R/W | 비고 |
| ------ | ---- | --- | ---- |
| **세션(Sessions)** | `~/.deepagents/.state/sessions.db` | R/W | SQLite 체크포인트 데이터베이스 |
| **입력 히스토리** | `~/.deepagents/.state/history.jsonl` | R/W | JSON 라인, 위/아래 화살표 회상 |
| **기본 지시 사항** | 패키지 `default_agent_prompt.md` | R | 변경 불가, Deep Agents Code 업그레이드와 함께 갱신 |
| **사용자 커스터마이징** | `~/.deepagents/{agent}/AGENTS.md` | R/W | 기본 지시 사항에 append됨 |
| **프로젝트 지시 사항** | `.deepagents/AGENTS.md` 또는 `AGENTS.md` | R | 존재하면 둘 다 로드됨 |
| **사용자 스킬** | `~/.deepagents/{agent}/skills/` | R/W | 에이전트 특화 스킬 |
| **공유 스킬** | `~/.agents/skills/` | R | 도구 비종속, CLI 간 공유 |
| **프로젝트 스킬** | `.deepagents/skills/` 또는 `.agents/skills/` | R | 프로젝트 스코프 |
| **커스텀 서브에이전트** | `~/.deepagents/{agent}/agents/` | R/W | 사용자 정의 서브에이전트 |
| **프로젝트 서브에이전트** | `.deepagents/agents/` | R | 프로젝트 정의 서브에이전트 |

---

## 🎯 우선순위 규칙 (Precedence rules)

동일한 항목이 여러 위치에 존재할 때, **더 높은 우선순위가 완전히 승리**합니다(머지 없음).

### 스킬 (Skills)

우선순위(낮은 순서 → 높은 순서):

1. `~/.deepagents/{agent}/skills/` — 사용자 Deep Agents Code
2. `~/.agents/skills/` — 사용자 도구 비종속
3. `.deepagents/skills/` — 프로젝트 Deep Agents Code
4. `.agents/skills/` — 프로젝트 도구 비종속 *(최고)*

스킬이 로드될 때, Deep Agents Code는 해결된 파일 경로가 이 디렉터리들 중 하나의 내부에 남아 있는지 검증합니다. 모든 스킬 루트의 외부로 해결되는 심볼릭 링크는 거부됩니다. 추가 디렉터리의 심볼릭 링크 대상을 허용하려면 [`[skills].extra_allowed_dirs`](https://docs.langchain.com/oss/python/deepagents/code/configuration#skills-extra-allowed-directories)를 참고하세요.

### 서브에이전트 (Subagents)

우선순위(낮은 순서 → 높은 순서):

1. `~/.deepagents/{agent}/agents/` — 사용자 수준
2. `.deepagents/agents/` — 프로젝트 수준 *(최고)*

각 서브에이전트는 YAML frontmatter(`name`, `description`, 선택적 `model`)와 시스템 프롬프트용 마크다운 본문이 있는 `AGENTS.md` 파일입니다. 전체 형식 레퍼런스는 [Use subagents in Deep Agents Code](https://docs.langchain.com/oss/python/deepagents/code/subagents)를 참고하세요.

### 지시 사항 (Instructions)

모든 지시 사항 소스는 **결합**됩니다(오버라이드 아님).

1. 패키지 기본 프롬프트 *(항상 로드)*
2. `~/.deepagents/{agent}/AGENTS.md` *(append)*
3. `.deepagents/AGENTS.md` *(append)*
4. 프로젝트 루트의 `AGENTS.md` *(append)*

---

## 🧩 `.deepagents` vs `.agents`

| 디렉터리 | 목적 | 사용 시점 |
| -------- | ---- | --------- |
| `.deepagents/` | Deep Agents Code 전용 | Deep Agents Code 전용 기능을 사용하는 스킬과 설정 |
| `.agents/` | 도구 비종속 | 여러 AI CLI 도구 간에 공유하고 싶은 스킬 |

> 💡 어떤 AI 코딩 어시스턴트와도 호환되는 스킬에는 `.agents/skills/`를 사용하세요. Deep Agents 전용 도구나 컨벤션에 의존하는 스킬에는 `.deepagents/skills/`를 사용하세요.

---

## 🧹 정리 (Cleaning up)

| 필요 | 액션 |
| ---- | ---- |
| 모든 데이터 리셋 | `rm -rf ~/.deepagents` |
| 세션만 삭제 | `rm ~/.deepagents/.state/sessions.db*` |
| 입력 히스토리 삭제 | `rm ~/.deepagents/.state/history.jsonl` |
| 저장된 API 키 삭제 | `rm ~/.deepagents/.state/auth.json` |
| MCP OAuth 토큰 삭제 | `rm -rf ~/.deepagents/.state/mcp-tokens` |
| 첫 실행 온보딩 재실행 | `rm ~/.deepagents/.state/onboarding_complete` |
| 에이전트 지시 사항 리셋 | `dcode agents reset --agent {name}` |
| 스킬 제거 | `rm -rf ~/.deepagents/{agent}/skills/{skill-name}` |

> ⚠️ `~/.deepagents/.state/sessions.db`를 삭제하면 모든 대화 히스토리와 체크포인트가 제거됩니다.
>
> `sessions.db` 파일의 백업이 없다면 되돌릴 수 없습니다.
