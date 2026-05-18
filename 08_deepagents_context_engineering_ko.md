# Deep Agents의 컨텍스트 엔지니어링 (Context engineering in Deep Agents)

> 원문: https://docs.langchain.com/oss/python/deepagents/context-engineering
>
> deep agent가 접근할 수 있는 컨텍스트와 장시간 작업에서의 관리 방법

---

## 📖 목차

1. [컨텍스트 유형 (Types of context)](#1-컨텍스트-유형-types-of-context)
2. [입력 컨텍스트 (Input context)](#2-입력-컨텍스트-input-context)
3. [런타임 컨텍스트 (Runtime context)](#3-런타임-컨텍스트-runtime-context)
4. [컨텍스트 압축 (Context compression)](#4-컨텍스트-압축-context-compression)
5. [서브에이전트로 컨텍스트 격리 (Context isolation with subagents)](#5-서브에이전트로-컨텍스트-격리-context-isolation-with-subagents)
6. [장기 메모리 (Long-term memory)](#6-장기-메모리-long-term-memory)
7. [모범 사례 (Best practices)](#7-모범-사례-best-practices)
8. [관련 자료 (Related resources)](#8-관련-자료-related-resources)

---

컨텍스트 엔지니어링(Context engineering)은 deep agent가 작업을 안정적으로 수행할 수 있도록 적절한 정보와 도구를 적절한 형식으로 제공하는 일입니다.

deep agent는 여러 종류의 컨텍스트에 접근할 수 있습니다. 일부는 시작 시점에 에이전트에게 제공되고, 다른 일부는 사용자 입력 같은 런타임 중에 사용할 수 있게 됩니다. deep agent는 장시간 세션 전반에 걸쳐 컨텍스트를 관리하기 위한 기본 내장 메커니즘을 포함합니다.

이 페이지는 deep agent가 접근하고 관리하는 다양한 종류의 컨텍스트에 대한 개요를 제공합니다.

> 💡 컨텍스트 엔지니어링이 처음이라면, 다양한 컨텍스트 유형과 사용 시점은 [개념적 개요](https://docs.langchain.com/oss/python/concepts/context)를 참고하세요.

---

## 1. 컨텍스트 유형 (Types of context)

| 컨텍스트 유형 | 제어할 수 있는 것 | 범위 |
|---------------|-------------------|------|
| **[입력 컨텍스트](#2-입력-컨텍스트-input-context)** | 시작 시 에이전트 프롬프트에 들어가는 것 (system prompt, memory, skills) | 정적, 매 실행마다 적용 |
| **[런타임 컨텍스트](#3-런타임-컨텍스트-runtime-context)** | 호출 시 전달되는 정적 설정 (사용자 메타데이터, API 키, 연결 등) | 실행당, 서브에이전트로 전파 |
| **[컨텍스트 압축](#4-컨텍스트-압축-context-compression)** | 윈도우 한도 안에 컨텍스트를 유지하기 위한 기본 내장 오프로딩과 요약 | 자동, 한도 접근 시 |
| **[컨텍스트 격리](#5-서브에이전트로-컨텍스트-격리-context-isolation-with-subagents)** | 서브에이전트로 무거운 작업을 격리하고 결과만 메인 에이전트에 반환 | 서브에이전트 단위, 위임 시 |
| **[장기 메모리](#6-장기-메모리-long-term-memory)** | 가상 파일 시스템을 사용한 스레드 간 영속 저장 | 대화 간 영속 |

---

## 2. 입력 컨텍스트 (Input context)

입력 컨텍스트는 시작 시 deep agent에 제공되어 시스템 프롬프트의 일부가 되는 정보입니다. 최종 프롬프트는 여러 출처로 구성됩니다.

- **System prompt** — 사용자가 제공한 커스텀 지시와 기본 내장 에이전트 가이드라인
- **Memory** — 설정 시 항상 로드되는 영속 `AGENTS.md` 파일
- **Skills** — 관련 있을 때 로드되는 온디맨드 기능 (점진적 노출, progressive disclosure)
- **Tool prompts** — 기본 내장 도구나 커스텀 도구 사용 지시

### 시스템 프롬프트 (System prompt)

사용자가 작성한 커스텀 시스템 프롬프트는 계획, 파일 시스템 도구, 서브에이전트에 대한 가이드를 포함한 기본 내장 시스템 프롬프트 앞에 추가됩니다. 에이전트의 역할, 동작, 지식을 정의하는 데 사용하세요.

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    system_prompt=(
        "You are a research assistant specializing in scientific literature. "
        "Always cite sources. Use subagents for parallel research on different topics."
    ),
)
```

`system_prompt` 파라미터는 정적입니다. 즉 호출마다 바뀌지 않습니다.

일부 사용 사례에서는 동적 프롬프트가 필요할 수 있습니다. 예를 들어 "You have admin access" vs "You have read-only access"를 모델에 알리거나, [장기 메모리](#6-장기-메모리-long-term-memory)에서 "User prefers concise responses" 같은 사용자 선호도를 주입하는 경우입니다. 프롬프트가 컨텍스트 또는 `runtime.store`에 의존한다면 `@dynamic_prompt`를 사용해 컨텍스트 인지(context-aware) 지시를 구성하세요. 미들웨어는 `request.runtime.context`와 `request.runtime.store`를 읽을 수 있습니다.

[커스텀 미들웨어](https://docs.langchain.com/oss/python/langchain/middleware) 추가에 관해서는 [Customization](https://docs.langchain.com/oss/python/deepagents/customization#middleware)을, 예시는 [LangChain context engineering](https://docs.langchain.com/oss/python/langchain/context-engineering#system-prompt) 가이드를 참고하세요.

도구만 컨텍스트나 `runtime.store`를 사용한다면 미들웨어는 **필요하지 않습니다**. 도구는 [ToolRuntime](https://reference.langchain.com/python/langchain/tools/#langchain.tools.ToolRuntime) 객체(`runtime.context` 및 `runtime.store` 포함)를 직접 받습니다. 도구를 시스템 프롬프트 업데이트와 함께 묶어 패키징해야 할 때만 미들웨어를 추가하세요.

> 💡 특정 프로바이더나 모델에 맞춰 조립된 시스템 프롬프트를 조정하려면 [harness profile](https://docs.langchain.com/oss/python/deepagents/profiles#harness-profiles)을 사용하세요. `base_system_prompt`는 기본 프롬프트를 완전히 대체하고, `system_prompt_suffix`는 끝에 덧붙입니다.

### 메모리 (Memory)

메모리 파일([`AGENTS.md`](https://agents.md/))은 시스템 프롬프트에 **항상 로드되는** 영속 컨텍스트를 제공합니다. 모든 대화에 적용되어야 하는 프로젝트 컨벤션, 사용자 선호도, 중요한 가이드라인에 사용하세요.

```python
agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    memory=["/project/AGENTS.md", "~/.deepagents/preferences.md"],
)
```

스킬과 달리 메모리는 항상 주입됩니다. 점진적 노출이 없습니다. 컨텍스트 과부하를 피하려면 메모리는 최소한으로 유지하고, 자세한 워크플로나 도메인 특화 내용은 [스킬](https://docs.langchain.com/oss/python/deepagents/skills)에 두세요. 설정 자세한 내용은 [Memory](https://docs.langchain.com/oss/python/deepagents/customization#memory)를 참고하세요.

### 스킬 (Skills)

스킬은 **온디맨드(on-demand)** 기능을 제공합니다. 에이전트는 시작 시 각 `SKILL.md`의 frontmatter를 읽고, 스킬이 관련 있다고 판단할 때에만 전체 스킬 내용을 로드합니다. 이를 통해 전문화된 워크플로를 제공하면서도 토큰 사용량을 줄일 수 있습니다.

```python
agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    skills=["/skills/research/", "/skills/web-search/"],
)
```

각 스킬은 단일 워크플로 또는 도메인에 집중하도록 유지하세요. 광범위하거나 중복되는 스킬은 관련성을 희석시키고 로드 시 컨텍스트를 부풀립니다. 스킬 내에서 메인 콘텐츠는 간결하게 유지하고, 자세한 참고 자료는 스킬 파일에서 참조하는 별도 파일로 옮기세요. 항상 관련 있는 컨벤션은 [memory](#메모리-memory)에 두세요. 작성 및 설정은 [Skills](https://docs.langchain.com/oss/python/deepagents/skills)를 참고하세요.

### 도구 프롬프트 (Tool prompts)

[도구(Tool)](https://docs.langchain.com/oss/python/langchain/tools) 프롬프트는 모델이 도구를 사용하는 방식을 형성하는 지시입니다. 모든 도구는 모델이 프롬프트에서 보는 메타데이터(보통 스키마와 설명)를 노출합니다. `tools` 파라미터로 전달한 도구는 도구 메타데이터(스키마, 설명)를 모델에 노출합니다. deep agent의 기본 내장 도구는 미들웨어로 패키징되며 보통 해당 도구를 위한 추가 가이드를 시스템 프롬프트에 더합니다.

**기본 내장 도구** — 하니스 기능(계획, 파일 시스템, 서브에이전트)을 추가하는 미들웨어는 해당 도구를 효과적으로 사용하는 방법을 설명하는 도구 프롬프트를 시스템 프롬프트에 자동으로 추가합니다.

- Planning 프롬프트 — 구조화된 작업 리스트를 유지하기 위한 `write_todos` 사용 지시
- Filesystem 프롬프트 — `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep` (그리고 샌드박스 백엔드 사용 시 `execute`)에 대한 문서
- Subagent 프롬프트 — `task` 도구로 작업을 위임하기 위한 가이드
- Human-in-the-loop 프롬프트 — 지정된 도구 호출에서 일시 정지하기 위한 사용법 (`interrupt_on` 설정 시)
- 로컬 컨텍스트 프롬프트 — 현재 디렉토리와 프로젝트 정보 (CLI 전용)

**사용자가 제공하는 도구** — `tools` 파라미터로 전달한 도구는 도구 스키마에서 가져온 설명이 모델에 전달됩니다. 도구를 추가하면서 자체 시스템 프롬프트 지시도 덧붙이는 [커스텀 미들웨어](https://docs.langchain.com/oss/python/langchain/middleware)를 만들 수도 있습니다.

직접 제공하는 도구의 경우 명확한 이름, 설명, 인자 설명을 제공하세요. 이들은 모델이 도구를 *언제* *어떻게* 사용할지 추론할 때 가이드 역할을 합니다. 설명에 *언제* 사용할지 포함하고 각 인자가 어떤 역할을 하는지 기술하세요.

```python
@tool(parse_docstring=True)
def search_orders(
    user_id: str,
    status: str,
    limit: int = 10
) -> str:
    """Search for user orders by status.

    Use this when the user asks about order history or wants to check
    order status. Always filter by the provided status.

    Args:
        user_id: Unique identifier for the user
        status: Order status: 'pending', 'shipped', or 'delivered'
        limit: Maximum number of results to return
    """
    # Implementation here
    ...
```

> 💡 특정 프로바이더나 모델에 대해 기본 내장 또는 사용자 제공 도구의 설명을 오버라이드하려면 [harness profile](https://docs.langchain.com/oss/python/deepagents/profiles#harness-profiles)의 `tool_description_overrides`를 도구 이름으로 키잉해 사용하세요. `excluded_tools`는 도구를 노출 집합에서 완전히 제거합니다.

기본 내장 기능은 [Harness](https://docs.langchain.com/oss/python/deepagents/harness)를, 도구를 직접 전달하는 방법은 [Customization](https://docs.langchain.com/oss/python/deepagents/customization#tools)을 참고하세요.

### 완성된 시스템 프롬프트 (Complete system prompt)

deep agent의 시스템 메시지 — 실행 시작 시 모델이 받는 조립된 시스템 프롬프트 — 는 다음 파트로 구성됩니다.

1. 커스텀 `system_prompt` (제공된 경우)
2. [기본 에이전트 프롬프트](https://github.com/langchain-ai/deepagents/blob/e18e9dcd0e6edc72c0a4a5b76ae752c4bc539752/libs/deepagents/deepagents/graph.py#L37)
3. To-do 리스트 프롬프트: 할 일 목록으로 계획하는 방법에 대한 지시
4. 메모리 프롬프트: `AGENTS.md` + 메모리 사용 가이드라인 (`memory` 제공 시에만)
5. 스킬 프롬프트: 스킬 위치 + frontmatter 정보가 포함된 스킬 목록 + 사용법 (스킬 제공 시에만)
6. 가상 파일 시스템 프롬프트 (파일 시스템 + 해당되는 경우 execute 도구 문서)
7. 서브에이전트 프롬프트: Task 도구 사용법
8. 사용자가 제공한 미들웨어 프롬프트 (커스텀 미들웨어 제공 시)
9. Human-in-the-loop 프롬프트 (`interrupt_on` 설정 시)

---

## 3. 런타임 컨텍스트 (Runtime context)

런타임 컨텍스트는 에이전트를 호출할 때 전달하는 실행별 설정입니다. 모델 프롬프트에 자동으로 포함되지는 않습니다. 도구, 미들웨어, 또는 다른 로직이 이를 읽어 메시지나 시스템 프롬프트에 추가해야만 모델이 볼 수 있습니다. 런타임 컨텍스트는 사용자 메타데이터(ID, 선호도, 역할), API 키, 데이터베이스 연결, 기능 플래그, 또는 도구와 하니스가 필요로 하는 기타 값에 사용하세요.

해당 데이터의 형태는 `context_schema`로 정의하세요. `dataclasses.dataclass` 또는 `typing.TypedDict` 클래스를 사용합니다. `invoke` / `ainvoke`의 **`context`** 인자로 값을 전달합니다. 자세한 내용은 [Runtime](https://docs.langchain.com/oss/python/langchain/runtime)과 [LangGraph runtime context](https://docs.langchain.com/oss/python/langgraph/graph-api#runtime-context)를 참고하세요.

도구 내부에서는 주입된 [ToolRuntime](https://reference.langchain.com/python/langchain/tools/#langchain.tools.ToolRuntime)에서 컨텍스트를 읽습니다.

```python
from dataclasses import dataclass

from deepagents import create_deep_agent
from langchain.tools import tool, ToolRuntime

@dataclass
class Context:
    user_id: str
    api_key: str

@tool
def fetch_user_data(query: str, runtime: ToolRuntime[Context]) -> str:
    """Fetch data for the current user."""
    user_id = runtime.context.user_id
    return f"Data for user {user_id}: {query}"

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    tools=[fetch_user_data],
    context_schema=Context,
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "Get my recent activity"}]},
    context=Context(user_id="user-123", api_key="sk-..."),
)
```

런타임 컨텍스트는 **모든 서브에이전트로 전파됩니다**. 서브에이전트가 실행될 때 부모와 동일한 런타임 컨텍스트를 받습니다. 서브에이전트별 컨텍스트(네임스페이스 키)는 [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents#context-management)를 참고하세요.

---

## 4. 컨텍스트 압축 (Context compression)

장시간 작업은 큰 도구 출력과 긴 대화 히스토리를 생성합니다. 컨텍스트 압축은 작업과 관련된 세부 정보는 보존하면서 에이전트 작업 메모리(working memory) 안의 정보 크기를 줄입니다. 다음 기법은 LLM에 전달되는 컨텍스트가 컨텍스트 윈도우 한도 내에 머물게 하는 기본 내장 메커니즘입니다.

- **오프로딩 (Offloading)** — 큰 도구 입력/결과는 파일 시스템에 저장되고 참조로 대체됨
- **요약 (Summarization)** — 한도에 근접하면 오래된 메시지가 LLM이 생성한 요약으로 압축됨

### 오프로딩 (Offloading)

Deep Agents는 [기본 내장 파일 시스템 도구](https://docs.langchain.com/oss/python/deepagents/harness#virtual-filesystem-access)를 사용해 콘텐츠를 자동으로 오프로드하고, 필요 시 검색·조회합니다. 콘텐츠 오프로딩은 도구 호출 입력 또는 결과가 토큰 임계값(기본 20,000)을 초과할 때 일어납니다.

1. **도구 호출 입력이 20,000 토큰 초과** — File write/edit 작업은 에이전트의 대화 히스토리에 파일 전체 내용을 담은 도구 호출을 남깁니다. 이 콘텐츠는 이미 파일 시스템에 영속화되어 있으므로 종종 중복입니다. 세션 컨텍스트가 모델의 가용 윈도우의 85%를 넘으면, deep agent는 더 오래된 도구 호출을 잘라내고 디스크 상의 파일 포인터로 대체하여 활성 컨텍스트의 크기를 줄입니다.

2. **도구 호출 결과가 20,000 토큰 초과** — 이 경우 deep agent는 응답을 설정된 백엔드로 오프로드하고, 파일 경로 참조와 처음 10줄 미리보기로 대체합니다. 에이전트는 필요 시 콘텐츠를 다시 읽거나 검색할 수 있습니다.

### 요약 (Summarization)

컨텍스트 크기가 모델의 컨텍스트 윈도우 한도(예: `max_input_tokens`의 85%)를 넘고, 오프로드할 컨텍스트도 더 이상 없을 때, deep agent는 메시지 히스토리를 요약합니다.

이 프로세스는 두 가지 구성 요소를 가집니다.

- **인컨텍스트 요약(In-context summary)** — LLM이 세션 의도, 생성된 아티팩트, 다음 단계 등을 포함한 구조화된 대화 요약을 생성하며, 이것이 에이전트의 작업 메모리에서 전체 대화 히스토리를 대체합니다.
- **파일 시스템 보존(Filesystem preservation)** — 완전한 원본 대화 메시지가 정전 기록(canonical record)으로 파일 시스템에 기록됩니다.

이 이중 접근은 에이전트가 (요약을 통해) 목표와 진행 상황에 대한 인식을 유지하면서, (파일 시스템 검색을 통해) 필요 시 특정 세부 정보를 복원할 수 있는 능력을 보존합니다.

**설정 사항:**

- 모델의 [model profile](https://docs.langchain.com/oss/python/langchain/models#model-profiles)에서 `max_input_tokens`의 85%에서 트리거됨
- 최근 컨텍스트로 10%의 토큰을 유지
- 모델 프로파일이 없으면 170,000 토큰 트리거 / 6개 메시지 유지로 폴백
- 임의의 모델 호출이 표준 [ContextOverflowError](https://reference.langchain.com/python/langchain-core/exceptions/ContextOverflowError)를 던지면, deep agent는 즉시 요약으로 폴백하고 요약 + 보존된 최근 메시지로 재시도
- 더 오래된 메시지는 모델이 요약

> 💡 에이전트에서 [스트리밍된 토큰](https://docs.langchain.com/oss/python/deepagents/streaming#llm-tokens)에는 일반적으로 요약 단계에서 생성된 토큰도 포함됩니다. 관련 메타데이터를 사용해 필터링할 수 있습니다.
>
> ```python
> for chunk in agent.stream(
>     {"messages": [...]},
>     stream_mode="messages",
>     version="v2",
> ):
>     token, metadata = chunk["data"]
>     if metadata.get("lc_source") == "summarization":
>         continue
>     else:
>         ...
> ```

##### 요약 도구 (Summarization Tool)

Deep Agents는 요약을 위한 선택적 [도구](https://docs.langchain.com/oss/python/langchain/tools)를 포함하며, 이를 통해 에이전트가 고정된 토큰 구간이 아니라 작업 사이와 같은 적절한 시점에 요약을 트리거할 수 있습니다.

이 도구는 미들웨어 리스트에 추가하여 활성화할 수 있습니다.

```python
from deepagents import create_deep_agent
from deepagents.backends import StateBackend
from deepagents.middleware.summarization import (
    create_summarization_tool_middleware,
)

backend = StateBackend  # 기본 백엔드 사용 시

model = "google_genai:gemini-3.1-pro-preview"
agent = create_deep_agent(
    model=model,
    middleware=[
        create_summarization_tool_middleware(model, backend),
    ],
)
```

이 기능을 활성화해도 모델 컨텍스트 한도의 85%에서 트리거되는 기본 요약 동작은 비활성화되지 않습니다.

자세한 내용은 [`SummarizationToolMiddleware`](https://reference.langchain.com/python/deepagents/middleware/summarization/SummarizationToolMiddleware) API 레퍼런스를 참고하세요.

---

## 5. 서브에이전트로 컨텍스트 격리 (Context isolation with subagents)

서브에이전트는 **컨텍스트 비대화(context bloat) 문제** 를 해결합니다. 메인 에이전트가 큰 출력을 내는 도구(웹 검색, 파일 읽기, DB 쿼리)를 사용하면 컨텍스트 윈도우가 빠르게 채워집니다. 서브에이전트는 이 작업을 격리합니다. 메인 에이전트는 수십 번의 도구 호출이 아니라 최종 결과만 받습니다. 또한 각 서브에이전트를 메인 에이전트와 별도로 (모델, 도구, 시스템 프롬프트, 스킬 등) 설정할 수 있습니다.

**작동 방식:**

- 메인 에이전트는 작업을 위임할 `task` 도구를 가짐
- 서브에이전트는 자체의 새 컨텍스트로 실행
- 서브에이전트는 완료될 때까지 자율적으로 실행
- 서브에이전트는 단일 최종 보고서를 메인 에이전트에 반환
- 메인 에이전트의 컨텍스트는 깨끗하게 유지됨

**모범 사례:**

1. **복잡한 작업 위임** — 메인 에이전트의 컨텍스트를 어수선하게 만들 다단계 작업은 서브에이전트에 위임하세요.

2. **서브에이전트 응답을 간결하게 유지** — 서브에이전트가 원시 데이터가 아닌 요약을 반환하도록 지시하세요.

   ```python
   research_subagent = {
       "name": "researcher",
       "description": "Conducts research on a topic",
       "system_prompt": """You are a research assistant.
       IMPORTANT: Return only the essential summary (under 500 words).
       Do NOT include raw search results or detailed tool outputs.""",
       "tools": [web_search],
   }
   ```

3. **큰 데이터는 파일 시스템 활용** — 서브에이전트는 결과를 파일에 쓸 수 있으며, 메인 에이전트는 필요한 것만 읽습니다.

설정은 [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents)를, 런타임 컨텍스트 전파와 서브에이전트별 네임스페이싱은 [context management](https://docs.langchain.com/oss/python/deepagents/subagents#context-management)를 참고하세요.

---

## 6. 장기 메모리 (Long-term memory)

기본 파일 시스템을 사용하면 deep agent는 작업 메모리 파일을 에이전트 상태에 저장하며, 이는 단일 스레드 내에서만 유지됩니다. 장기 메모리(long-term memory)는 deep agent가 서로 다른 스레드와 대화 간에 정보를 영속할 수 있게 해줍니다. deep agent는 장기 메모리를 사용자 선호도, 누적 지식, 연구 진행률, 또는 단일 세션을 넘어 영속되어야 하는 모든 정보 저장에 사용할 수 있습니다.

장기 메모리를 사용하려면 특정 경로(보통 `/memories/`)를 LangGraph Store로 라우팅하는 `CompositeBackend`를 사용해야 합니다. LangGraph Store는 내구성 있는 크로스 스레드 영속성을 제공합니다. `CompositeBackend`는 일부 파일은 무기한 영속하고 다른 파일은 단일 스레드에 한정되는 하이브리드 저장 시스템입니다.

```python
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
from langgraph.store.memory import InMemoryStore

def make_backend(runtime):
    return CompositeBackend(
        default=StateBackend(runtime),
        routes={"/memories/": StoreBackend(runtime)},
    )

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    store=InMemoryStore(),
    backend=make_backend,
    system_prompt="""When users tell you their preferences, save them to
    /memories/user_preferences.txt so you remember them in future conversations.""",
)
```

`/memories/`에 파일을 미리 채워둘 필요는 없습니다. 백엔드 설정, 스토어, 그리고 에이전트에게 *무엇* 을 *어디* 에 저장할지 알려주는 시스템 프롬프트 지시만 제공하면 됩니다. 예를 들어 에이전트에게 선호도를 `/memories/preferences.txt`에 저장하라고 프롬프트할 수 있습니다. 경로는 비어 있는 상태로 시작하며, 사용자가 기억할 만한 정보를 공유하면 에이전트는 파일 시스템 도구(`write_file`, `edit_file`)를 사용해 필요에 따라 파일을 생성합니다.

메모리를 사전 시드(pre-seed)하려면 LangSmith에 배포할 때 [Store API](https://docs.langchain.com/langsmith/custom-store)를 사용하세요. 설정 및 사용 사례는 [Long-term memory](https://docs.langchain.com/oss/python/deepagents/memory)를 참고하세요.

---

## 7. 모범 사례 (Best practices)

1. **올바른 입력 컨텍스트로 시작하기** — 항상 관련 있는 컨벤션을 위해 메모리는 최소로 유지하고, 작업 특화 기능은 집중된 스킬을 사용하세요.
2. **무거운 작업은 서브에이전트 활용** — 다단계의 출력이 많은 작업은 위임하여 메인 에이전트의 컨텍스트를 깨끗하게 유지하세요.
3. **설정에서 서브에이전트 출력 조정** — 디버깅 시 서브에이전트가 긴 출력을 생성한다면, 서브에이전트의 `system_prompt`에 요약과 종합된 발견사항을 만들도록 가이드를 추가할 수 있습니다.
4. **파일 시스템 활용** — 큰 출력(예: 서브에이전트 쓰기, [자동 오프로딩](#오프로딩-offloading))을 파일에 영속화하여 활성 컨텍스트를 작게 유지하세요. 모델은 세부 정보가 필요할 때 `read_file`과 `grep`으로 조각을 가져올 수 있습니다.
5. **장기 메모리 구조를 문서화** — 에이전트에게 `/memories/`에 무엇이 있고 어떻게 사용하는지 알려주세요.
6. **도구를 위한 런타임 컨텍스트 전달** — 도구가 필요로 하는 사용자 메타데이터, API 키, 기타 정적 설정은 `context`로 전달하세요.

---

## 8. 관련 자료 (Related resources)

- [Harness](https://docs.langchain.com/oss/python/deepagents/harness) — 컨텍스트 관리 개요, 오프로딩, 요약
- [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents) — 컨텍스트 격리, 런타임 컨텍스트 전파
- [Long-term memory](https://docs.langchain.com/oss/python/deepagents/memory) — 크로스 스레드 영속성
- [Skills](https://docs.langchain.com/oss/python/deepagents/skills) — 점진적 노출과 스킬 작성
- [Backends](https://docs.langchain.com/oss/python/deepagents/backends) — 파일 시스템 백엔드와 CompositeBackend
- [Context conceptual overview](https://docs.langchain.com/oss/python/concepts/context) — 컨텍스트 유형과 라이프사이클
