# Deep Agents Code: 서브에이전트 사용 (Use Subagents)

> 원문: https://docs.langchain.com/oss/python/deepagents/code/subagents
>
> YAML frontmatter가 있는 AGENTS.md 파일로 Deep Agents Code 커스텀 서브에이전트를 정의합니다. 프로젝트/사용자 경로, 선택적 모델 오버라이드, 예시를 다룹니다.

---

Deep Agents Code가 전문화된 작업을 위임할 수 있도록 커스텀 동기(synchronous) [서브에이전트](https://docs.langchain.com/oss/python/deepagents/subagents)를 마크다운 파일로 정의합니다.

> ℹ️ 현재 Deep Agents Code에서는 비동기(async) 서브에이전트를 사용할 수 없습니다.

각 서브에이전트는 `AGENTS.md` 파일이 있는 자체 폴더에 위치합니다.

```text
.deepagents/agents/{subagent-name}/AGENTS.md   # 프로젝트 수준
~/.deepagents/{agent}/agents/{subagent-name}/AGENTS.md  # 사용자 수준
```

프로젝트 서브에이전트는 동일 이름의 사용자 서브에이전트를 오버라이드합니다([우선순위 규칙](https://docs.langchain.com/oss/python/deepagents/code/data-locations#subagents) 참고).

Frontmatter에는 `name`과 `description`이 필요합니다([`SubAgent` 딕셔너리 스펙](https://docs.langchain.com/oss/python/deepagents/subagents#subagent-dictionary-based)과 동일). 마크다운 본문은 서브에이전트의 `system_prompt`가 됩니다. 기본 스펙에 더해, `AGENTS.md` 파일은 이 서브에이전트에 대해 메인 에이전트의 모델을 오버라이드하는 선택적 `model` frontmatter 필드를 지원합니다. `provider:model-name` 형식을 사용합니다(예: `anthropic:claude-opus-4-7`, `openai:gpt-5.5`). 생략 시 메인 에이전트의 모델을 상속합니다.

> ℹ️ 다른 `SubAgent` 필드(`tools`, `middleware`, `interrupt_on`, `skills`)는 현재 `AGENTS.md` frontmatter로 설정할 수 없습니다 — 이 방식으로 정의된 커스텀 서브에이전트는 메인 에이전트의 도구를 상속합니다. 완전한 제어가 필요하면 SDK를 직접 사용하세요.

---

## 📝 파일 형식

서브에이전트 `AGENTS.md` 파일은 YAML frontmatter와 마크다운 본문으로 구성됩니다.

```markdown
---
name: researcher
description: Research topics on the web before writing content
model: anthropic:claude-haiku-4-5-20251001
---

You are a research assistant with access to web search.

## Your Process
1. Search for relevant information
2. Summarize findings clearly
```

---

## 💡 예시: 비용 효율적인 서브에이전트

단순한 위임 작업에는 더 저렴하고 빠른 모델을 사용하고, 메인 에이전트는 더 강력한 모델을 유지하세요.

```markdown
---
name: general-purpose
description: General-purpose agent for research and multi-step tasks
model: anthropic:claude-haiku-4-5-20251001
---

You are a general-purpose assistant. Complete the task efficiently and return a concise summary.
```

이 설정은 기본 내장 general-purpose 서브에이전트를 오버라이드하여, 위임된 모든 작업을 더 저렴한 모델로 라우팅합니다. 자세한 내용은 [Override the general-purpose subagent](https://docs.langchain.com/oss/python/deepagents/subagents#override-the-general-purpose-subagent)를 참고하세요.
