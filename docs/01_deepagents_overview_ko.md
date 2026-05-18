# Deep Agents 개요 (Overview)

> 원문: https://docs.langchain.com/oss/python/deepagents/overview
>
> 계획 수립(planning), 서브에이전트(subagent) 활용, 파일 시스템을 통한 복잡한 작업 처리가 가능한 에이전트 구축

---

## 📌 Deep Agents란?

**Deep Agents**는 LLM 기반 에이전트 및 애플리케이션을 가장 쉽게 구축할 수 있는 방법으로, 다음과 같은 기능이 기본 내장되어 있습니다.

- 작업 계획(Task planning)
- 컨텍스트 관리를 위한 파일 시스템(File systems)
- 서브에이전트 생성(Subagent-spawning)
- 장기 메모리(Long-term memory)

복잡하고 다단계로 이루어진 작업을 포함하여 모든 종류의 작업에 활용 가능합니다. `deepagents`는 **"에이전트 하니스(agent harness)"** 의 한 형태로, 다른 에이전트 프레임워크와 동일한 핵심 도구 호출(tool calling) 루프를 사용하지만, 유용한 도구들과 기능들이 기본 내장되어 있다는 점이 특징입니다.

> 💡 [LangSmith Engine](https://docs.langchain.com/langsmith/engine)은 Deep Agents 트레이스에서 문제를 감지하고 수정 제안을 제시합니다. Issues 탭에서 직접 수정 PR을 만들 수 있습니다.

### 라이브러리 구성

[`deepagents`](https://pypi.org/project/deepagents/)는 [LangChain](https://docs.langchain.com/oss/python/langchain)의 핵심 구성 요소 위에 만들어진 독립 라이브러리입니다. 영속 실행, 스트리밍, Human-in-the-loop 등의 기능을 위해 [LangGraph](https://docs.langchain.com/oss/python/langgraph) 런타임을 사용합니다.

[`deepagents` 리포지토리](https://github.com/langchain-ai/deepagents)는 다음을 포함합니다.

- **Deep Agents SDK**: 모든 작업을 처리할 수 있는 에이전트 구축용 패키지
- **Deep Agents Code**: Deep Agents SDK 위에 구축된 터미널 코딩 에이전트
- **ACP integration**: Zed 같은 코드 에디터에서 deep agent를 사용하기 위한 Agent Client Protocol 커넥터

> LangChain은 에이전트 구축을 위한 핵심 구성 요소를 제공하는 프레임워크입니다. LangChain, LangGraph, Deep Agents 간의 차이점은 [Frameworks, runtimes, and harnesses](https://docs.langchain.com/oss/python/concepts/products) 문서를 참고하세요. Anthropic의 하니스와의 비교는 [Deep Agents vs. Claude Agent SDK](https://docs.langchain.com/oss/python/deepagents/comparison)를 참조하세요.

---

## 🚀 Deep Agent 만들기

다양한 모델 제공자를 사용하여 Deep Agent를 만들 수 있습니다.

### Google Gemini

```python
# pip install -qU deepagents langchain-google-genai
from deepagents import create_deep_agent

def get_weather(city: str) -> str:
    """주어진 도시의 날씨를 가져옵니다."""
    return f"It's always sunny in {city}!"

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)

# 에이전트 실행
agent.invoke(
    {"messages": [{"role": "user", "content": "what is the weather in sf"}]}
)
```

### OpenAI

```python
# pip install -qU deepagents langchain-openai
from deepagents import create_deep_agent

def get_weather(city: str) -> str:
    """주어진 도시의 날씨를 가져옵니다."""
    return f"It's always sunny in {city}!"

agent = create_deep_agent(
    model="openai:gpt-5.4",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)

agent.invoke(
    {"messages": [{"role": "user", "content": "what is the weather in sf"}]}
)
```

### Anthropic

```python
# pip install -qU deepagents langchain-anthropic
from deepagents import create_deep_agent

def get_weather(city: str) -> str:
    """주어진 도시의 날씨를 가져옵니다."""
    return f"It's always sunny in {city}!"

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)

agent.invoke(
    {"messages": [{"role": "user", "content": "what is the weather in sf"}]}
)
```

### OpenRouter

```python
# pip install -qU deepagents langchain-openrouter
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="openrouter:anthropic/claude-sonnet-4-6",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)
```

### Fireworks

```python
# pip install -qU deepagents langchain-fireworks
agent = create_deep_agent(
    model="fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)
```

### Baseten

```python
# pip install -qU deepagents langchain-baseten
agent = create_deep_agent(
    model="baseten:zai-org/GLM-5",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)
```

### Ollama

```python
# pip install -qU deepagents langchain-ollama
agent = create_deep_agent(
    model="ollama:devstral-2",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)
```

> 💡 [Quickstart](https://docs.langchain.com/oss/python/deepagents/quickstart) 및 [Customization 가이드](https://docs.langchain.com/oss/python/deepagents/customization)를 참고하여 자신만의 에이전트 구축을 시작해 보세요.
>
> [LangSmith](https://smith.langchain.com)로 요청 추적, 에이전트 동작 디버깅, 결과 평가를 할 수 있으며, 프로덕션 단계에서는 [LangSmith Cloud에 배포](https://docs.langchain.com/langsmith/deploy-to-cloud)하여 매니지드 호스팅을 이용할 수 있습니다.

---

## 🎯 Deep Agents를 언제 사용해야 할까?

다음과 같은 에이전트를 만들고 싶을 때 **Deep Agents SDK**를 사용하세요.

| 기능 | 설명 |
|------|------|
| **복잡한 다단계 작업 처리** | 계획 수립과 분해(decomposition)가 필요한 작업 |
| **대용량 컨텍스트 관리** | 파일 시스템 도구와 요약(summarization)을 통한 처리 |
| **파일 시스템 백엔드 교체** | 인메모리 상태, 로컬 디스크, 영속 저장소, 샌드박스, 또는 커스텀 백엔드 사용 |
| **셸 명령 실행** | 샌드박스 백엔드 사용 시 `execute` 도구로 처리 |
| **인터프리터 코드 실행** | 도구 조합, 서브에이전트 오케스트레이션, 구조화된 데이터 변환 지원 |
| **작업 위임** | 컨텍스트 격리를 위한 전문화된 서브에이전트에 위임 |
| **메모리 영속화** | 대화와 스레드 간 정보 유지 |
| **파일 시스템 접근 제어** | 선언적 권한 규칙으로 읽기/쓰기 제한 |
| **사람의 승인 필요** | 민감한 작업에 대해 Human-in-the-loop 워크플로 적용 |
| **모든 모델 사용 가능** | 프론티어 모델과 오픈 모델 모두를 지원하는 provider agnostic |

> ℹ️ 더 단순한 에이전트를 만들고자 한다면 LangChain의 [`create_agent`](https://docs.langchain.com/oss/python/langchain/agents)를 사용하거나, 커스텀 [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview) 워크플로를 만드는 것을 고려해 보세요.

---

## 🧩 핵심 기능 (Core capabilities)

### 1. 계획 수립과 작업 분해 (Planning and task decomposition)
Deep Agents에는 [`write_todos`](https://docs.langchain.com/oss/python/langchain/middleware/built-in#to-do-list) 도구가 기본 내장되어 있어, 에이전트가 복잡한 작업을 개별 단계로 분해하고, 진행 상황을 추적하며, 새로운 정보에 따라 계획을 조정할 수 있습니다.

### 2. 컨텍스트 관리 (Context management)
파일 시스템 도구(`ls`, `read_file`, `write_file`, `edit_file`)는 큰 컨텍스트를 인메모리 또는 파일 시스템 저장소로 오프로드할 수 있게 해줍니다. 이를 통해 컨텍스트 윈도우 초과를 방지하고, 길이가 다양한 도구 결과를 처리할 수 있습니다. 자동 요약 기능은 대화가 길어질 때 오래된 메시지를 압축하여 장기 세션에서도 효과적으로 작동하게 합니다.

### 3. 셸 실행 (Shell execution)
[샌드박스 백엔드](https://docs.langchain.com/oss/python/deepagents/sandboxes) 사용 시, 에이전트는 `execute` 도구를 통해 테스트, 빌드, git 작업, 시스템 작업 등의 셸 명령을 실행할 수 있습니다. 샌드박스 백엔드는 격리 환경을 제공해 호스트 시스템에 위협을 주지 않고 코드를 실행할 수 있습니다.

### 4. 인터프리터 (Interpreters)
[인터프리터](https://docs.langchain.com/oss/python/deepagents/interpreters)를 추가하여 인메모리 런타임에서 JavaScript를 실행할 수 있습니다. 인터프리터를 사용하면 에이전트가 프로그래밍적으로 도구를 조합하고, 서브에이전트를 오케스트레이션하며, 풀 셸 환경 없이도 구조화된 데이터를 변환할 수 있습니다.

### 5. 플러그형 파일 시스템 백엔드 (Pluggable filesystem backends)
가상 파일 시스템은 사용 사례에 맞게 교체할 수 있는 [플러그형 백엔드](https://docs.langchain.com/oss/python/deepagents/backends)로 구동됩니다.

- 인메모리 상태(in-memory state)
- 로컬 디스크(local disk)
- 스레드 간 영속성을 위한 LangGraph store
- 격리된 코드 실행을 위한 샌드박스 (Modal, Daytona, Deno)
- 여러 백엔드를 합성 라우팅으로 결합 가능
- 커스텀 백엔드 구현도 가능

### 6. 서브에이전트 생성 (Subagent spawning)
기본 내장된 `task` 도구를 통해 에이전트가 컨텍스트 격리를 위해 전문화된 서브에이전트를 생성할 수 있습니다. 이를 통해 메인 에이전트의 컨텍스트는 깨끗하게 유지하면서, 특정 하위 작업에 대해 깊게 파고들 수 있습니다.

### 7. 장기 메모리 (Long-term memory)
LangGraph의 [Memory Store](https://docs.langchain.com/oss/python/langgraph/persistence#memory-store)를 활용하여 스레드 간 영속 메모리로 에이전트를 확장할 수 있습니다. 에이전트는 이전 대화의 정보를 저장하고 검색할 수 있습니다.

### 8. 파일 시스템 권한 (Filesystem permissions)
에이전트가 읽고 쓸 수 있는 파일과 디렉토리를 제어하는 [권한 규칙](https://docs.langchain.com/oss/python/deepagents/permissions)을 선언할 수 있습니다. 서브에이전트는 부모 규칙을 상속하거나 재정의할 수 있습니다.

### 9. Human-in-the-loop
LangGraph의 인터럽트 기능을 사용해 민감한 도구 작업에 대해 [사람의 승인](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop)을 받도록 구성할 수 있습니다. 실행 전 확인이 필요한 도구를 제어할 수 있습니다.

### 10. 스킬 (Skills)
재사용 가능한 [스킬](https://docs.langchain.com/oss/python/deepagents/skills)로 에이전트를 확장할 수 있습니다. 스킬은 전문화된 워크플로, 도메인 지식, 커스텀 지시 사항을 제공합니다.

### 11. 스마트 기본값 (Smart defaults)
모델이 도구를 효과적으로 사용할 수 있도록 가르치는 잘 설계된 시스템 프롬프트가 기본 제공됩니다. 실행 전에 계획하고, 결과를 검증하고, 컨텍스트를 관리하도록 가이드하며, 필요에 따라 커스터마이징하거나 교체할 수 있습니다.

---

## 📚 시작하기 (Get started)

| 문서 | 설명 |
|------|------|
| [Quickstart](https://docs.langchain.com/oss/python/deepagents/quickstart) | 첫 번째 deep agent 구축 |
| [Customization](https://docs.langchain.com/oss/python/deepagents/customization) | 커스터마이징 옵션 학습 |
| [Models](https://docs.langchain.com/oss/python/deepagents/models) | 모델과 프로바이더 설정 |
| [Backends](https://docs.langchain.com/oss/python/deepagents/backends) | 플러그형 파일 시스템 백엔드 선택 및 설정 |
| [Sandboxes](https://docs.langchain.com/oss/python/deepagents/sandboxes) | 격리된 환경에서 코드 실행 |
| [Interpreters](https://docs.langchain.com/oss/python/deepagents/interpreters) | QuickJS에서 도구 조합 및 데이터 변환 |
| [Permissions](https://docs.langchain.com/oss/python/deepagents/permissions) | 권한 규칙으로 파일 시스템 접근 제어 |
| [Human-in-the-loop](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop) | 민감 작업에 대한 승인 설정 |
| [Code](https://docs.langchain.com/oss/python/deepagents/code/overview) | Deep Agents Code 사용법 |
| [ACP](https://docs.langchain.com/oss/python/deepagents/acp) | ACP를 통해 코드 에디터에서 deep agent 사용 |
| [Reference](https://docs.langchain.com/oss/python/reference/overview) | `deepagents` API 레퍼런스 |
