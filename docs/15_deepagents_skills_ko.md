# Deep Agents 스킬 (Skills)

> 원문: https://docs.langchain.com/oss/python/deepagents/skills
>
> deep agent의 능력을 스킬(skill)로 확장하는 방법을 학습합니다.

---

## 📖 목차

1. [스킬이란?](#-스킬이란)
2. [스킬 동작 방식](#-스킬-동작-방식)
3. [예시 (Example)](#-예시-example)
4. [사용법 (Usage)](#-사용법-usage)
5. [소스 우선순위 (Source precedence)](#-소스-우선순위-source-precedence)
6. [서브에이전트의 스킬](#-서브에이전트의-스킬)
7. [에이전트가 보는 것 (What the agent sees)](#-에이전트가-보는-것)
8. [스킬로 코드 실행](#-스킬로-코드-실행)
9. [Skills vs. memory](#-skills-vs-memory)
10. [스킬과 도구를 언제 사용해야 하는가](#-스킬과-도구를-언제-사용해야-하는가)

---

## 📌 스킬이란?

**스킬(Skills)** 은 전문화된 워크플로와 도메인 지식을 제공하는 재사용 가능한 에이전트 능력입니다.

[Agent Skills](https://agentskills.io/)를 사용하여 deep agent에 새로운 능력과 전문성을 부여할 수 있습니다. LangChain 생태계 작업에서 에이전트 성능을 향상시키는 즉시 사용 가능한 스킬은 [LangChain Skills](https://github.com/langchain-ai/langchain-skills) 리포지토리를 참고하세요.

Deep agent 스킬은 [Agent Skills specification](https://agentskills.io/specification)을 따르며, 인터프리터가 호출할 수 있는 임포트 가능한 함수를 가진 스킬을 제공할 수 있게 해주는 인터프리터 스킬을 위한 추가 능력을 더합니다.

스킬은 폴더의 디렉토리이며, 각 폴더에는 에이전트가 사용할 수 있는 컨텍스트가 포함된 하나 이상의 파일이 있습니다.

* 스킬에 대한 지시 사항과 메타데이터가 포함된 `SKILL.md` 파일
* 추가 스크립트 (선택)
* 문서 같은 추가 참고 정보 (선택)
* 템플릿이나 기타 리소스 같은 추가 자산 (선택)

> 📘 추가 자산(스크립트, 문서, 템플릿, 기타 리소스)은 `SKILL.md` 파일에서 어떤 파일이 무엇을 포함하고 어떻게 사용하는지에 대한 정보와 함께 참조되어야 합니다. 그래야 에이전트가 언제 사용할지 결정할 수 있습니다.

---

## 🚀 스킬 동작 방식

deep agent를 만들 때 스킬을 포함하는 디렉토리 목록을 전달할 수 있습니다. 에이전트가 시작되면 각 `SKILL.md` 파일의 frontmatter를 읽습니다.

에이전트가 프롬프트를 받으면, 프롬프트를 처리하면서 어떤 스킬을 사용할 수 있는지 확인합니다. 매칭되는 프롬프트를 찾으면 나머지 스킬 파일을 검토합니다. 필요할 때만 스킬 정보를 검토하는 이러한 패턴을 **점진적 노출(progressive disclosure)** 이라고 합니다.

---

## 🎯 예시 (Example)

문서 사이트를 특정 방식으로 사용하는 스킬과, 연구 논문의 arXiv 사전 인쇄(preprint) 리포지토리를 검색하는 또 다른 스킬을 포함한 스킬 폴더를 가질 수 있습니다.

```plaintext
    skills/
    ├── langgraph-docs
    │   └── SKILL.md
    └── arxiv_search
        ├── SKILL.md
        └── arxiv_search.py # arXiv 검색용 코드
```

`SKILL.md` 파일은 항상 같은 패턴을 따릅니다. frontmatter의 메타데이터로 시작하고 그 다음에 스킬에 대한 지시 사항이 옵니다.

다음 예시는 프롬프트가 주어졌을 때 관련 langgraph 문서를 제공하는 방법에 대한 지시 사항을 주는 스킬을 보여줍니다.

````md
---
name: langgraph-docs
description: Use this skill for requests related to LangGraph in order to fetch relevant documentation to provide accurate, up-to-date guidance.
module: index.ts
---

# langgraph-docs

## Overview

This skill explains how to access LangGraph Python documentation to help answer questions and guide implementation.

## Instructions

### 1. Fetch the Documentation Index

Use the fetch_url tool to read the following URL:
https://docs.langchain.com/llms.txt

This provides a structured list of all available documentation with descriptions.

### 2. Select Relevant Documentation

Based on the question, identify 2-4 most relevant documentation URLs from the index. Prioritize:

- Specific how-to guides for implementation questions
- Core concept pages for understanding questions
- Tutorials for end-to-end examples
- Reference docs for API details

### 3. Fetch Selected Documentation

Use the fetch_url tool to read the selected documentation URLs.

### 4. Provide accurate guidance

After reading the documentation, answer the user's question using the relevant LangGraph docs you fetched.

In your response:

- Give a direct answer first.
- Include the minimum necessary context and any key steps or API names.
- Avoid quoting long passages. Paraphrase and link instead.

### 5. Provide the regular links for the used references

At the end of your response, include a **References** section listing the page URLs you used.

`llms.txt` uses Markdown link targets that typically end in `.md`. Use the helper from this skill module to resolve those into the actual page URLs before listing them as references.

```typescript
const { resolveLlmsUrl } = await import("@/skills/langgraph-docs");

// llms.txt uses Markdown link targets that typically end in `.md`.
// Convert those into the actual page URLs before fetching.
const llmsUrls = [
  "https://docs.langchain.com/oss/langgraph/concepts.md",
  "https://docs.langchain.com/oss/langgraph/concepts.md",
  "https://docs.langchain.com/oss/langgraph/tutorials.md",
];

const pageUrls = [...new Set(llmsUrls.map(resolveLlmsUrl))];
pageUrls;
```
````

참조된 헬퍼 코드는 `index.ts`에 배치됩니다.

```typescript
// index.ts
export function resolveLlmsUrl(url: string) {
  return url.endsWith(".md") ? url.slice(0, -3) : url;
}
```

더 많은 스킬 예시는 [Deep Agents example skills](https://github.com/langchain-ai/deepagents/tree/main/libs/cli/examples/skills)를 참고하세요.

> ⚠️ **중요**
>
> 스킬 파일 작성 시 제약 사항과 모범 사례에 대한 정보는 전체 [Agent Skills Specification](https://agentskills.io/specification)을 참고하세요. 특히:
>
> * `description` 필드는 1024자를 초과하면 잘립니다.
> * Deep Agents에서 `SKILL.md` 파일은 10MB 미만이어야 합니다. 이 한도를 초과하는 파일은 스킬 로딩 시 건너뜁니다.

### 전체 예시 (Full example)

다음 예시는 사용 가능한 모든 frontmatter 필드를 사용하는 `SKILL.md` 파일을 보여줍니다.

````md
---
name: langgraph-docs
description: Use this skill for requests related to LangGraph in order to fetch relevant documentation to provide accurate, up-to-date guidance.
license: MIT
compatibility: Requires internet access for fetching documentation URLs
metadata:
  author: langchain
  version: "1.0"
allowed-tools: fetch_url
module: index.ts
---

# langgraph-docs

## Overview

This skill explains how to access LangGraph Python documentation to help answer questions and guide implementation.

## Instructions

### 1. Fetch the documentation index

Use the fetch_url tool to read the following URL:
https://docs.langchain.com/llms.txt

This provides a structured list of all available documentation with descriptions.

### 2. Select relevant documentation

Based on the question, identify 2-4 most relevant documentation URLs from the index. Prioritize:

- Specific how-to guides for implementation questions
- Core concept pages for understanding questions
- Tutorials for end-to-end examples
- Reference docs for API details

### 3. Fetch selected documentation

Use the fetch_url tool to read the selected documentation URLs.

### 4. Provide accurate guidance

After reading the documentation, answer the user's question using the relevant LangGraph docs you fetched.

In your response:

- Give a direct answer first.
- Include the minimum necessary context and any key steps or API names.
- Avoid quoting long passages. Paraphrase and link instead.

### 5. Provide the regular links for the used references

At the end of your response, include a **References** section listing the page URLs you used.

`llms.txt` uses Markdown link targets that typically end in `.md`. Use the helper from this skill module to resolve those into the actual page URLs before listing them as references.

```typescript
const { resolveLlmsUrl } = await import("@/skills/langgraph-docs");

// llms.txt uses Markdown link targets that typically end in `.md`.
// Convert those into the actual page URLs before fetching.
const llmsUrls = [
  "https://docs.langchain.com/oss/langgraph/concepts.md",
  "https://docs.langchain.com/oss/langgraph/concepts.md",
  "https://docs.langchain.com/oss/langgraph/tutorials.md",
];

const pageUrls = [...new Set(llmsUrls.map(resolveLlmsUrl))];
pageUrls;
```
````

---

## 🛠️ 사용법 (Usage)

deep agent 생성 시 스킬 디렉토리를 전달합니다.

### StateBackend 예시

```python
# Google Gemini 예시
from urllib.request import urlopen
from deepagents import create_deep_agent
from deepagents.backends import StateBackend
from deepagents.backends.utils import create_file_data
from langchain_quickjs import CodeInterpreterMiddleware
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
backend = StateBackend()

skill_url = "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/libs/cli/examples/skills/langgraph-docs/SKILL.md"
with urlopen(skill_url) as response:
    skill_content = response.read().decode('utf-8')

skills_files = {
    "/skills/langgraph-docs/SKILL.md": create_file_data(skill_content),
}

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=backend,
    skills=["/skills/"],
    checkpointer=checkpointer,
    middleware=[CodeInterpreterMiddleware(skills_backend=backend)], # 인터프리터 스킬용
)

result = agent.invoke(
    {
        "messages": [{"role": "user", "content": "What is langgraph?"}],
        # 기본 StateBackend의 in-state 파일 시스템 시드 (가상 경로는 "/"로 시작해야 함)
        "files": skills_files,
    },
    config={"configurable": {"thread_id": "12345"}},
)
```

다른 프로바이더를 사용하려면 `model` 인자만 변경하면 됩니다.

| 프로바이더 | 모델 식별자 |
|---------|----------|
| OpenAI | `"openai:gpt-5.4"` |
| Anthropic | `"anthropic:claude-sonnet-4-6"` |
| OpenRouter | `"openrouter:anthropic/claude-sonnet-4-6"` |
| Fireworks | `"fireworks:accounts/fireworks/models/qwen3p5-397b-a17b"` |
| Baseten | `"baseten:zai-org/GLM-5"` |
| Ollama | `"ollama:devstral-2"` |

### StoreBackend 예시

```python
from urllib.request import urlopen
from deepagents import create_deep_agent
from deepagents.backends import StoreBackend
from deepagents.backends.utils import create_file_data
from langchain_quickjs import CodeInterpreterMiddleware
from langgraph.store.memory import InMemoryStore

store = InMemoryStore()
backend = StoreBackend(namespace=lambda _rt: ("filesystem",))

skill_url = "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/libs/cli/examples/skills/langgraph-docs/SKILL.md"
with urlopen(skill_url) as response:
    skill_content = response.read().decode('utf-8')

store.put(
    namespace=("filesystem",),
    key="/skills/langgraph-docs/SKILL.md",
    value=create_file_data(skill_content),
)

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=backend,
    store=store,
    skills=["/skills/"],
    middleware=[CodeInterpreterMiddleware(skills_backend=backend)],
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "What is langgraph?"}]},
    config={"configurable": {"thread_id": "12345"}},
)
```

### FilesystemBackend 예시

```python
from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend
from langchain_quickjs import CodeInterpreterMiddleware
from langgraph.checkpoint.memory import MemorySaver

# Human-in-the-loop에는 Checkpointer가 필수
checkpointer = MemorySaver()
root_dir = "/Users/user/{project}"
backend = FilesystemBackend(root_dir=root_dir)

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=backend,
    skills=[str(Path(root_dir) / "skills")],
    interrupt_on={
        "write_file": True,
        "read_file": False,
        "edit_file": True,
    },
    checkpointer=checkpointer, # 필수!
    middleware=[CodeInterpreterMiddleware(skills_backend=backend)], # 인터프리터 스킬용
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "What is langgraph?"}]},
    config={"configurable": {"thread_id": "12345"}},
)
```

#### skills 파라미터 (`list[str]`, 선택)

스킬 소스 경로 목록입니다.

* 경로는 슬래시(`/`)로 지정되어야 하며 백엔드의 루트에 상대적입니다.
* 생략되면 스킬이 로드되지 않습니다.
* `StateBackend`(기본값) 사용 시, `invoke(files={...})`로 스킬 파일을 제공하세요. `deepagents.backends.utils`의 `create_file_data()`를 사용해 파일 콘텐츠를 포맷하세요. raw 문자열은 지원되지 않습니다.
* `FilesystemBackend`의 경우, 스킬은 백엔드의 `root_dir`에 상대적인 디스크에서 로드됩니다.
* 동일한 이름의 스킬에 대해 나중 소스가 이전 소스를 오버라이드합니다 (마지막이 이김).

> 📘 SDK는 `skills`에 전달한 소스만 로드합니다. `~/.deepagents/...` 또는 `~/.agents/...` 같은 CLI 디렉토리를 자동으로 스캔하지 않습니다.
>
> CLI 저장 규칙은 [App data](https://docs.langchain.com/oss/python/deepagents/data-locations)를 참고하세요.
>
> <details>
> <summary><strong>SDK에서 CLI 소스 순서 에뮬레이션</strong></summary>
>
> SDK 코드에서 CLI 스타일의 계층화를 원한다면, 원하는 모든 소스를 최저-최고 우선순위 순서로 명시적으로 전달하세요.
>
> ```text
> [
> "<user-home>/.deepagents/{agent}/skills/",
> "<user-home>/.agents/skills/",
> "<project-root>/.deepagents/skills/",
> "<project-root>/.agents/skills/",
> ]
> ```
>
> 에이전트 생성 시 그 순서로 정렬된 리스트를 `skills`로 전달하세요.
> </details>

---

## 🧩 소스 우선순위 (Source precedence)

여러 스킬 소스에 같은 이름의 스킬이 포함된 경우, `skills` 배열에서 나중에 나열된 소스의 스킬이 우선합니다 (마지막이 이김). 이를 통해 다른 출처의 스킬을 계층화할 수 있습니다.

```python
# 두 소스 모두에 "web-search"라는 스킬이 있다면,
# "/skills/project/"의 것이 이깁니다 (마지막에 로드됨).
agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    skills=["/skills/user/", "/skills/project/"],
    ...
)
```

---

## 🤝 서브에이전트의 스킬

[서브에이전트](https://docs.langchain.com/oss/python/deepagents/subagents)를 사용할 때 각 타입이 어떤 스킬에 접근할 수 있는지 구성할 수 있습니다.

* **General-purpose 서브에이전트**: `create_deep_agent`에 `skills`를 전달할 때 메인 에이전트의 스킬을 자동으로 상속합니다. 추가 구성이 필요 없습니다.
* **커스텀 서브에이전트**: 메인 에이전트의 스킬을 상속하지 않습니다. 각 서브에이전트 정의에 그 서브에이전트의 스킬 소스 경로를 갖는 `skills` 파라미터를 추가하세요.

스킬 상태는 완전히 격리됩니다. 메인 에이전트의 스킬은 서브에이전트에게 보이지 않고, 서브에이전트의 스킬은 메인 에이전트에게 보이지 않습니다.

```python
from deepagents import create_deep_agent

research_subagent = {
    "name": "researcher",
    "description": "Research assistant with specialized skills",
    "system_prompt": "You are a researcher.",
    "tools": [web_search],
    "skills": ["/skills/research/", "/skills/web-search/"],  # 서브에이전트 전용 스킬
}

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    skills=["/skills/main/"],  # 메인 에이전트와 GP 서브에이전트가 받음
    subagents=[research_subagent],  # Researcher는 자체 스킬만 받음
)
```

서브에이전트 구성과 스킬 상속에 대한 자세한 내용은 [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents)를 참고하세요.

---

## 👀 에이전트가 보는 것

스킬이 구성되면 에이전트의 시스템 프롬프트에 "Skills System" 섹션이 주입됩니다. 에이전트는 이 정보를 사용해 세 단계 프로세스를 따릅니다.

1. **매칭(Match)** — 사용자 프롬프트가 도착하면, 에이전트는 어떤 스킬의 설명이 작업과 일치하는지 확인합니다.
2. **읽기(Read)** — 스킬이 적용된다면, 에이전트는 스킬 목록에 표시된 경로를 사용해 전체 `SKILL.md` 파일을 읽습니다.
3. **실행(Execute)** — 에이전트는 스킬의 지시 사항을 따르고 필요에 따라 지원 파일(스크립트, 템플릿, 참조 문서)에 접근합니다.

> 💡 `SKILL.md` frontmatter에 명확하고 구체적인 설명을 작성하세요. 에이전트는 설명만으로 스킬 사용 여부를 결정합니다. 상세한 설명은 더 나은 스킬 매칭으로 이어집니다.

---

## ⚙️ 스킬로 코드 실행

스킬은 두 가지 방식으로 코드 실행을 지원합니다.

* [인터프리터 스킬 사용](#인터프리터-스킬-사용-use-interpreter-skills) — 에이전트가 인터프리터 코드에서 사용할 수 있는 재사용 가능하고 임포트 가능한 헬퍼가 필요할 때.
* [샌드박스에서 스킬 스크립트 실행](#샌드박스에서-스킬-스크립트-실행) — 에이전트가 의존성을 설치하거나, 테스트를 실행하거나, CLI를 호출하거나, 운영 체제 파일 시스템과 작업해야 할 때.

### 인터프리터 스킬 사용 (Use interpreter skills)

인터프리터 스킬은 [인터프리터](https://docs.langchain.com/oss/python/deepagents/interpreters)에 코드 모듈을 노출하는 스킬입니다. 일반 스킬은 에이전트에게 지시 사항과 컨텍스트를 제공합니다. 인터프리터 스킬은 에이전트에게 인터프리터 코드에서 호출할 수 있는 임포트 가능한 함수도 제공합니다.

이를 통해 도메인 특화 로직을 한 번 패키징하고 에이전트의 워크스페이스 내에서 결정론적 빌딩 블록으로 사용할 수 있습니다. 모델에게 파서, 스코어러, 노멀라이저, 검증자, 또는 집계 루틴을 매번 다시 만들도록 요청하는 대신, 에이전트는 테스트된 헬퍼를 임포트하여 도구, 서브에이전트, 런타임 상태와 함께 조합할 수 있습니다.

다음과 같은 코드에는 인터프리터 스킬을 사용하세요.

* **재사용 가능(Reusable)**: 프롬프트, 에이전트, 또는 프로젝트 간 재사용.
* **결정론적(Deterministic)**: 매번 동일한 동작을 원할 때.
* **너무 상세함(Too detailed)**: 지시 사항으로 모델 컨텍스트에 유지하기에 너무 상세함.
* **큰 워크플로 내에서 유용함**: 검색 결과 스코어링, API 응답 정규화, 레코드 검증, 행 그룹화, 또는 데이터를 리포트 가능한 형태로 변환 등.

스킬을 임포트 가능하게 만들려면:

1. **모듈 항목 추가**: 스킬의 `SKILL.md` frontmatter에 `module` 키를 추가합니다. 값은 스킬 디렉토리에 상대적인 JavaScript 또는 TypeScript 파일 경로입니다.
2. **스킬을 평소대로 구성**: 에이전트 생성 시 `skills` 인자로 스킬 소스 경로를 전달합니다.
3. **같은 백엔드 사용**: 인터프리터 미들웨어를 `SkillsMiddleware`가 스킬 파일을 로드하는 데 사용하는 동일한 백엔드로 구성합니다.
4. **인터프리터 코드에서 임포트**: 에이전트가 `await import("@/skills/<name>")`으로 헬퍼 모듈을 임포트합니다.

최소한의 스킬 레이아웃:

```text
skills/
`-- order-helpers/
    |-- SKILL.md
    `-- index.ts
```

````md
---
name: order-helpers
description: Helper functions for normalizing and grouping order records.
module: index.ts
---

# order-helpers

Use this skill when order records need deterministic cleanup or aggregation.

Import these utilities into the REPL in order to interact with order data:

```typescript
const { groupByStatus } = await import("@/skills/order-helpers");
groupByStatus(...);
```
````

```typescript
// skills/order-helpers/index.ts
interface Order {
  id: string;
  status: string;
}

export function groupByStatus(orders: Order[]) {
  return orders.reduce((acc, order) => {
    acc[order.status] = acc[order.status] ?? [];
    acc[order.status].push(order);
    return acc;
  }, {});
}
```

그런 다음 에이전트를 구성합니다.

```python
from deepagents import create_deep_agent
from deepagents.backends import StateBackend
from langchain_quickjs import CodeInterpreterMiddleware

backend = StateBackend()

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=backend,
    skills=["/skills/"],
    middleware=[CodeInterpreterMiddleware(skills_backend=backend)],
)
```

이제 에이전트는 인터프리터 코드에서 모듈을 임포트할 수 있습니다.

```javascript
const { groupByStatus } = await import("@/skills/order-helpers");

const grouped = groupByStatus(orders);
grouped;
```

### 샌드박스에서 스킬 스크립트 실행

스킬은 `SKILL.md` 파일과 함께 검색이나 데이터 변환을 수행하는 Python 파일 같은 스크립트를 포함할 수 있습니다. 에이전트는 어떤 백엔드에서든 이러한 스크립트를 *읽을* 수 있지만, *실행*하려면 셸에 대한 접근이 필요하며, 이는 [샌드박스 백엔드](https://docs.langchain.com/oss/python/deepagents/sandboxes)만이 제공합니다.

샌드박스를 기본 백엔드로 사용하면서 영속성을 위해 스킬을 [StoreBackend](https://reference.langchain.com/python/deepagents/backends/store/StoreBackend)로 라우팅하는 [CompositeBackend](https://reference.langchain.com/python/deepagents/backends/composite/CompositeBackend)를 사용할 때, 스킬 파일은 스토어에 저장되고 샌드박스는 코드가 실행되는 곳입니다. 샌드박스가 스크립트를 사용할 수 있으려면, 에이전트가 시작되기 전에 스킬 스크립트를 샌드박스에 업로드하는 [커스텀 미들웨어](https://docs.langchain.com/oss/python/langchain/middleware/custom)를 사용해야 합니다.

```python
import asyncio
from pathlib import Path
from typing import Any

from daytona import Daytona
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StoreBackend
from deepagents.backends.utils import create_file_data
from langchain.agents.middleware import AgentMiddleware, AgentState

from langchain_daytona import DaytonaSandbox
from langgraph.runtime import Runtime
from langgraph.store.memory import InMemoryStore

# 모든 사용자에 대해 동일한 스킬 번들: 하나의 공유 스토어 네임스페이스.
SKILLS_SHARED_NAMESPACE = ("skills", "builtin")


class SkillSandboxSyncMiddleware(AgentMiddleware[AgentState, Any, Any]):
    """Copy shared skill files from the store into the sandbox before each agent run."""

    def __init__(self, backend: CompositeBackend) -> None:
        super().__init__()
        self.backend = backend

    async def abefore_agent(self, state: AgentState, runtime: Runtime[Any]) -> None:
        store = runtime.store

        files: list[tuple[str, bytes]] = []
        for item in await store.asearch(SKILLS_SHARED_NAMESPACE):
            key = str(item.key)
            if ".." in key or any(c in key for c in ("*", "?")):
                msg = f"Invalid key: {key}"
                raise ValueError(msg)
            normalized = key if key.startswith("/") else f"/{key}"
            # CompositeBackend가 경로를 라우팅하고 업로드를 올바른 백엔드로 배치합니다.
            files.append((f"/skills{normalized}", item.value["content"].encode()))

        if files:
            await self.backend.aupload_files(files)


async def seed_skill_store(store: InMemoryStore) -> None:
    """Load canonical skill files from disk into the shared store namespace (run once at deploy).
    You can retrieve skills from any source (local filesystem, remote URL, etc.).
    """
    skills_dir = Path(__file__).resolve().parent / "skills"
    for file_path in sorted(p for p in skills_dir.rglob("*") if p.is_file()):
        rel = file_path.relative_to(skills_dir).as_posix()
        key = f"/{rel}"
        await store.aput(
            SKILLS_SHARED_NAMESPACE,
            key,
            create_file_data(file_path.read_text(encoding="utf-8")),
        )


async def main() -> None:
    store = InMemoryStore()
    await seed_skill_store(store)

    daytona = Daytona()
    sandbox = daytona.create()
    sandbox_backend = DaytonaSandbox(sandbox=sandbox)

    backend = CompositeBackend(
        default=sandbox_backend,
        routes={
            "/skills/": StoreBackend(
                store=store,
                namespace=lambda _rt: SKILLS_SHARED_NAMESPACE,
            ),
        },
    )

    try:
        agent = create_deep_agent(
            model="google_genai:gemini-3.1-pro-preview",
            backend=backend,
            skills=["/skills/"],
            store=store,
            middleware=[SkillSandboxSyncMiddleware(backend)],
        )

    finally:
        sandbox.stop()


if __name__ == "__main__":
    asyncio.run(main())
```

> 💡 다른 프로바이더(OpenAI, Anthropic, OpenRouter, Fireworks, Baseten, Ollama)의 경우 `model` 인자만 해당 식별자로 변경하면 됩니다.

미들웨어의 `before_agent` 훅은 각 에이전트 호출 전에 실행되어, 그 공유 네임스페이스에서 스킬 파일을 읽고 샌드박스 파일 시스템에 업로드합니다. 동기화되면 에이전트는 샌드박스의 다른 파일처럼 `execute` 도구로 스크립트를 실행할 수 있습니다.

[memories](https://docs.langchain.com/oss/python/deepagents/memory)를 양방향으로 동기화하는 더 완전한 예시는 [syncing skills and memories with custom middleware](https://docs.langchain.com/oss/python/deepagents/going-to-production#example-syncing-skills-and-memories-with-custom-middleware)를 참고하세요.

---

## 📚 Skills vs. memory

스킬과 [메모리](https://docs.langchain.com/oss/python/deepagents/customization#memory) (`AGENTS.md` 파일)는 다른 목적을 가집니다.

| | Skills | Memory |
|---|--------|--------|
| **목적** | 점진적 노출을 통해 발견되는 온디맨드 능력 | 시작 시 항상 로드되는 영속 컨텍스트 |
| **로딩** | 에이전트가 관련성을 판단할 때만 읽음 | 항상 시스템 프롬프트에 주입됨 |
| **형식** | 명명된 디렉토리의 `SKILL.md` | `AGENTS.md` 파일 |
| **계층화** | 사용자 → 프로젝트 (마지막이 이김) | 사용자 → 프로젝트 (결합) |
| **사용 시점** | 지시 사항이 작업 특화이고 잠재적으로 클 때 | 컨텍스트가 항상 관련될 때 (프로젝트 규칙, 선호도) |

---

## 💡 스킬과 도구를 언제 사용해야 하는가

도구와 스킬을 사용하기 위한 몇 가지 일반 가이드라인입니다.

* 시스템 프롬프트의 토큰 수를 줄이기 위해 컨텍스트가 많을 때 스킬을 사용하세요.
* 능력을 더 큰 동작으로 묶고 단일 도구 설명을 넘어선 추가 컨텍스트를 제공하기 위해 스킬을 사용하세요.
* 에이전트가 파일 시스템에 접근할 수 없다면 도구를 사용하세요.

> 💡 에이전트가 어떻게 스킬을 발견하고 실행하는지 [LangSmith](https://smith.langchain.com)로 추적하세요. 설정하려면 [observability quickstart](https://docs.langchain.com/langsmith/observability-quickstart)를 따르세요.
