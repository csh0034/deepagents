# Deep Agents Code: 메모리와 스킬 (Memory and Skills)

> 원문: https://docs.langchain.com/oss/python/deepagents/code/memory-and-skills
>
> Deep Agents Code의 영속 메모리, AGENTS.md 파일, 재사용 가능한 스킬 — 생성, 발견, 호출 방법

---

에이전트를 커스터마이징하는 두 가지 주요 방법이 있습니다.

- **[메모리(Memory)](#-메모리-memory)**: 세션 간 영속되는 `AGENTS.md` 파일과 자동 저장되는 메모리. 일반적인 코딩 스타일, 선호도, 학습된 컨벤션을 메모리로 사용합니다.

- **[스킬(Skills)](#-스킬-skills)**: 전역 및 프로젝트별 컨텍스트, 컨벤션, 가이드라인, 지시 사항. 특정 작업을 수행할 때 적용되는 컨텍스트에 스킬을 사용합니다.

`/remember`로 현재 대화로부터 메모리와 스킬을 갱신하도록 에이전트에 명시적으로 요청할 수 있습니다.

> 💡 SDK로 커스텀 에이전트를 만들고 있다면 프로그램적 메모리 백엔드는 [Memory](https://docs.langchain.com/oss/python/deepagents/memory)를 참고하세요.

---

## 🧠 메모리 (Memory)

### 자동 메모리

에이전트를 사용함에 따라, 정보가 메모리 우선(memory-first) 프로토콜을 사용하여 `~/.deepagents/<agent_name>/memories/` 아래에 마크다운 파일로 자동 저장됩니다.

1. **연구(Research)**: 작업 시작 전에 관련 컨텍스트를 메모리에서 검색
2. **응답(Response)**: 실행 중 불확실할 때 메모리를 확인
3. **학습(Learning)**: 새로운 정보를 자동으로 향후 세션을 위해 저장

에이전트는 설명적인 파일명으로 주제별로 메모리를 정리합니다.

```
~/.deepagents/backend-dev/memories/
├── api-conventions.md
├── database-schema.md
└── deployment-process.md
```

에이전트에게 컨벤션을 가르치면,

```bash
dcode --agent backend-dev
> Our API uses snake_case and includes created_at/updated_at timestamps
```

향후 세션에서 기억합니다.

```bash
> Create a /users endpoint
# 별도 안내 없이 컨벤션을 적용
```

### AGENTS.md 파일

[`AGENTS.md` 파일](https://agents.md/)은 세션 시작 시 항상 로드되는 영속 컨텍스트를 제공합니다.

- **전역(Global)**: `~/.deepagents/<agent_name>/AGENTS.md` — 모든 세션에서 로드.
- **프로젝트(Project)**: 모든 git 프로젝트 루트의 `.deepagents/AGENTS.md` — Deep Agents Code가 해당 프로젝트 내에서 실행될 때 로드.

두 파일 모두 시작 시 시스템 프롬프트에 append됩니다.

### 메모리 작동 방식

에이전트는 프로젝트 특화 질문에 답하거나 과거 작업/패턴을 참조할 때 메모리 파일을 읽기도 합니다.

에이전트의 행동 방식에 대한 정보, 작업에 대한 피드백, 무언가를 기억하라는 지시를 제공하면 에이전트는 `AGENTS.md`를 갱신합니다. 또한 상호작용에서 패턴이나 선호도를 식별하면 메모리를 갱신합니다.

더 구조화된 프로젝트 지식을 추가 메모리 파일에 담으려면 `.deepagents/`에 추가하고 `AGENTS.md` 파일에서 참조하세요. 에이전트가 이 파일들을 인식하려면 반드시 `AGENTS.md`에서 참조해야 합니다. 추가 파일은 시작 시 읽히지 않지만 에이전트가 필요할 때 참조하고 갱신할 수 있습니다.

### 전역 vs 프로젝트 AGENTS.md 사용 시점

전역 `AGENTS.md` (`~/.deepagents/agent/AGENTS.md`)는 다음에 사용:

- 당신의 성격, 스타일, 보편적인 코딩 선호도
- 일반적인 톤과 커뮤니케이션 스타일
- 보편적인 코딩 선호도(포매팅, 타입 힌트 등)
- 어디서나 적용되는 도구 사용 패턴
- 프로젝트별로 바뀌지 않는 워크플로와 방법론

프로젝트 `AGENTS.md` (프로젝트 루트의 `.deepagents/AGENTS.md`)는 다음에 사용:

- 프로젝트 특정 컨텍스트와 컨벤션
- 프로젝트 아키텍처와 디자인 패턴
- 이 코드베이스에 특화된 코딩 컨벤션
- 테스트 전략과 배포 프로세스
- 팀 가이드라인과 프로젝트 구조

---

## 🛠️ 스킬 (Skills)

스킬은 전문화된 워크플로와 도메인 지식을 제공하는 재사용 가능한 에이전트 능력입니다. [스킬](https://docs.langchain.com/oss/python/deepagents/skills)을 사용하여 deep agent에 새로운 능력과 전문성을 부여할 수 있습니다. Deep agent 스킬은 [Agent Skills 표준](https://agentskills.io/)을 따릅니다. 스킬을 추가하면 deep agent는 자동으로 활용하며, 에이전트를 사용하면서 추가 정보를 제공하면 스킬을 갱신합니다.

### 스킬 추가

**1단계 — 스킬 생성**

```bash
# 사용자 스킬 (~/.deepagents/<agent_name>/skills/에 저장)
dcode skills create test-skill

# 프로젝트 스킬 (.deepagents/skills/에 저장)
dcode skills create test-skill --project
```

다음을 생성합니다.

```plaintext
skills/
└── test-skill
    └── SKILL.md
```

**2단계 — SKILL.md 편집**

생성된 `SKILL.md`를 열고 파일을 편집하여 지시 사항을 포함시킵니다.

**3단계 — 선택적 리소스 추가**

선택적으로 `test-skill` 폴더에 추가 스크립트나 다른 리소스를 추가할 수 있습니다. 자세한 내용은 [Examples](https://docs.langchain.com/oss/python/deepagents/skills#example)를 참고하세요.

기존 스킬을 에이전트의 폴더로 직접 복사할 수도 있습니다.

```bash
mkdir -p ~/.deepagents/<agent_name>/skills
cp -r examples/skills/web-research ~/.deepagents/<agent_name>/skills/
```

### 커뮤니티 스킬 설치

Vercel의 [Skills CLI](https://github.com/vercel-labs/skills) 같은 도구를 사용해 환경에 커뮤니티 [Agent Skills](https://agentskills.io/)를 설치하여 deep agents에서 사용할 수 있게 만들 수 있습니다.

```bash
# 전역으로 스킬 설치
npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a deepagents -g -y

# 설치된 스킬 목록
npx skills ls -a deepagents -g
```

전역 설치(`-g`)는 스킬을 `~/.deepagents/agent/skills/`(기본 에이전트의 사용자 수준 스킬 디렉터리)로 심볼릭 링크합니다. 프로젝트 수준 설치(`-g` 생략)는 스킬을 현재 디렉터리 기준 `.deepagents/skills/`에 배치하여, 에이전트 이름에 관계없이 해당 프로젝트에서 실행되는 모든 에이전트가 사용할 수 있게 합니다.

> ℹ️ 전역 설치는 기본 `agent` 디렉터리만 대상으로 합니다. 커스텀 이름의 에이전트를 사용한다면 프로젝트 수준 설치를 쓰거나 `~/.deepagents/{your-agent}/skills/`에 스킬을 수동으로 심볼릭 링크하세요.

### 스킬 발견 (Skill discovery)

시작 시 Deep Agents Code는 Deep Agents와 공유 alias 디렉터리 모두에서 스킬을 발견합니다.

```text
~/.deepagents/<agent_name>/skills/
~/.agents/skills/
.deepagents/skills/
.agents/skills/
~/.claude/skills/          (experimental)
.claude/skills/            (experimental)
```

중복 스킬 이름이 존재하면 우선순위가 높은 디렉터리가 낮은 디렉터리를 오버라이드합니다([App data](https://docs.langchain.com/oss/python/deepagents/code/data-locations#skills) 참고).

프로젝트 특화 스킬의 경우, 프로젝트 루트 폴더에 `.git` 폴더가 있어야 합니다. 프로젝트 폴더 내 어디서든 Deep Agents Code를 시작하면 `.git` 폴더가 포함된 컨테이너를 찾아 프로젝트 루트를 식별합니다.

각 스킬에 대해 Deep Agents Code는 `SKILL.md` 파일의 frontmatter에서 이름과 설명을 읽습니다. Deep Agents Code를 사용하다가 작업이 스킬 설명과 매칭되면 에이전트는 스킬 파일을 읽고 지시 사항을 따릅니다.

`/skill:<name> [args]`로 스킬을 직접 호출할 수도 있습니다. 스킬 발견은 시작 시와 `/reload` 시에 실행됩니다.

### 커맨드 라인에서 스킬 호출

대화형으로 슬래시 명령을 입력하지 않고도 시작 시 스킬을 호출하려면 `--skill`을 사용하세요.

```bash
# TUI를 열고 즉시 스킬 실행
dcode --skill code-review

# -m으로 스킬에 요청 전달
dcode --skill code-review -m 'review the auth module'

# 스킬로 콘텐츠 파이프
cat diff.txt | dcode --skill code-review

# 콘텐츠 파이프 + 요청 추가
cat diff.txt | dcode --skill code-review -m 'focus on security'
```

`--skill`은 비대화형 모드에서도 동작합니다.

```bash
# 헤드리스로 스킬 실행
dcode --skill code-review -n 'review this patch'

# 조용한 모드(에이전트 출력만 stdout)
dcode --skill code-review -n 'review this patch' -q
```

> ℹ️ `--quiet`나 `--no-stream`과 함께 `--skill`을 사용하려면 `-n`(비대화형 모드)이 필요합니다.

### 스킬 목록 보기

```bash
# 모든 사용자 스킬 나열
dcode skills list

# 프로젝트 스킬 나열
dcode skills list --project

# 특정 스킬에 대한 상세 정보
dcode skills info test-skill
dcode skills info test-skill --project
```
