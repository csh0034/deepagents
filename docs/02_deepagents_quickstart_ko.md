# 빠른 시작 (Quickstart)

> 원문: https://docs.langchain.com/oss/python/deepagents/quickstart
>
> 몇 분 만에 첫 번째 deep agent를 구축합니다.

---

이 가이드는 계획 수립, 파일 시스템 도구, 서브에이전트 기능을 갖춘 첫 번째 deep agent를 만드는 과정을 안내합니다. 조사를 수행하고 보고서를 작성할 수 있는 리서치 에이전트를 구축합니다.

> [!TIP]
> **AI 코딩 어시스턴트를 사용하고 있나요?**
>
> - [LangChain Docs MCP 서버](https://docs.langchain.com/use-these-docs)를 설치하여 에이전트가 최신 LangChain 문서와 예시에 접근할 수 있게 하세요.
> - [LangChain Skills](https://github.com/langchain-ai/langchain-skills)를 설치하면 LangChain 생태계 작업에서 에이전트의 성능을 향상시킬 수 있습니다.

---

## 📖 목차

1. [사전 준비 사항](#-사전-준비-사항)
2. [Step 1: 의존성 설치](#-step-1-의존성-설치)
3. [Step 2: API 키 설정](#-step-2-api-키-설정)
4. [Step 3: 검색 도구 만들기](#-step-3-검색-도구-만들기)
5. [Step 4: Deep agent 생성](#-step-4-deep-agent-생성)
6. [Step 5: 에이전트 실행](#-step-5-에이전트-실행)
7. [동작 원리](#-동작-원리)
8. [예시](#-예시)
9. [스트리밍](#-스트리밍)
10. [다음 단계](#-다음-단계)

---

## 📌 사전 준비 사항

시작하기 전에 모델 프로바이더(예: Gemini, Anthropic, OpenAI)의 API 키가 있는지 확인하세요.

> [!NOTE]
> Deep Agents는 [도구 호출(tool calling)](https://docs.langchain.com/oss/python/langchain/models#tool-calling)을 지원하는 모델이 필요합니다. 모델 구성 방법은 [customization](https://docs.langchain.com/oss/python/deepagents/customization#model)을 참고하세요.

---

## 🛠️ Step 1: 의존성 설치

**pip 사용:**

```bash
pip install deepagents tavily-python
```

**uv 사용:**

```bash
uv init
uv add deepagents tavily-python
uv sync
```

> [!NOTE]
> 이 가이드는 검색 프로바이더 예시로 [Tavily](https://tavily.com/)를 사용하지만, 다른 검색 API(예: DuckDuckGo, SerpAPI, Brave Search)로 대체할 수도 있습니다.

---

## ⚙️ Step 2: API 키 설정

**Google**

```bash
export GOOGLE_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

**OpenAI**

```bash
export OPENAI_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

**Anthropic**

```bash
export ANTHROPIC_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

**OpenRouter**

```bash
export OPENROUTER_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

**Fireworks**

```bash
export FIREWORKS_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

**Baseten**

```bash
export BASETEN_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

**Ollama**

```bash
# Local: Ollama must be running on your machine
# Cloud: Set your Ollama API key for hosted inference
export OLLAMA_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

**기타(Other)**

```bash
# Set the API key for your provider
export <PROVIDER>_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

Deep Agents는 모든 [LangChain 채팅 모델](https://docs.langchain.com/oss/python/deepagents/models#supported-models)과 함께 동작합니다. 사용하는 프로바이더의 API 키를 설정하세요.

---

## 🔧 Step 3: 검색 도구 만들기

```python
import os
from typing import Literal

from tavily import TavilyClient
from deepagents import create_deep_agent

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])


def internet_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = False,
):
    """Run a web search"""
    return tavily_client.search(
        query,
        max_results=max_results,
        include_raw_content=include_raw_content,
        topic=topic,
    )
```

---

## 🚀 Step 4: Deep agent 생성

`provider:model` 형식의 `model` 문자열을 전달하거나, [초기화된 모델 인스턴스](https://docs.langchain.com/oss/python/deepagents/models#configure-model-parameters)를 전달하세요. 모든 프로바이더는 [supported models](https://docs.langchain.com/oss/python/deepagents/models#supported-models)에서, 테스트된 추천 모델은 [suggested models](https://docs.langchain.com/oss/python/deepagents/models#suggested-models)에서 확인할 수 있습니다.

**Google**

```python
# System prompt to steer the agent to be an expert researcher
research_instructions = """You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## `internet_search`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
"""

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    tools=[internet_search],
    system_prompt=research_instructions,
)
```

**OpenAI**

```python
# System prompt to steer the agent to be an expert researcher
research_instructions = """You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## `internet_search`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
"""

agent = create_deep_agent(
    model="openai:gpt-5.4",
    tools=[internet_search],
    system_prompt=research_instructions,
)
```

**Anthropic**

```python
# System prompt to steer the agent to be an expert researcher
research_instructions = """You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## `internet_search`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
"""

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    tools=[internet_search],
    system_prompt=research_instructions,
)
```

**OpenRouter**

```python
# System prompt to steer the agent to be an expert researcher
research_instructions = """You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## `internet_search`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
"""

agent = create_deep_agent(
    model="openrouter:anthropic/claude-sonnet-4-6",
    tools=[internet_search],
    system_prompt=research_instructions,
)
```

**Fireworks**

```python
# System prompt to steer the agent to be an expert researcher
research_instructions = """You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## `internet_search`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
"""

agent = create_deep_agent(
    model="fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
    tools=[internet_search],
    system_prompt=research_instructions,
)
```

**Baseten**

```python
# System prompt to steer the agent to be an expert researcher
research_instructions = """You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## `internet_search`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
"""

agent = create_deep_agent(
    model="baseten:zai-org/GLM-5",
    tools=[internet_search],
    system_prompt=research_instructions,
)
```

**Ollama**

```python
# System prompt to steer the agent to be an expert researcher
research_instructions = """You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## `internet_search`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
"""

agent = create_deep_agent(
    model="ollama:devstral-2",
    tools=[internet_search],
    system_prompt=research_instructions,
)
```

---

## ▶️ Step 5: 에이전트 실행

```python
result = agent.invoke({"messages": [{"role": "user", "content": "What is langgraph?"}]})

# Print the agent's response
print(result["messages"][-1].content)
```

> [!TIP]
> [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-deepagents-quickstart)로 에이전트의 계획 단계, 도구 호출, 서브에이전트 위임을 추적할 수 있습니다. [관측 가능성 빠른 시작 가이드](https://docs.langchain.com/langsmith/observability-quickstart)를 따라 설정을 완료하세요.

---

## 🔄 동작 원리

여러분의 deep agent는 다음 작업들을 자동으로 수행합니다.

1. **접근 방식 계획 수립** — 기본 내장된 [`write_todos`](https://docs.langchain.com/oss/python/deepagents/harness#planning-capabilities) 도구로 리서치 작업을 분해합니다.
2. **리서치 수행** — `internet_search` 도구를 호출하여 정보를 수집합니다.
3. **컨텍스트 관리** — 파일 시스템 도구([`write_file`](https://docs.langchain.com/oss/python/deepagents/harness#virtual-filesystem-access), [`read_file`](https://docs.langchain.com/oss/python/deepagents/harness#virtual-filesystem-access))로 대용량 검색 결과를 오프로드합니다.
4. **서브에이전트 생성** — 필요에 따라 복잡한 하위 작업을 전문화된 서브에이전트에 위임합니다.
5. **보고서 합성** — 발견 내용을 일관된 응답으로 종합합니다.

---

## 📝 예시

Deep Agents로 구축할 수 있는 에이전트, 패턴, 애플리케이션은 [Examples](https://github.com/langchain-ai/deepagents/tree/main/examples)를 참고하세요.

---

## 📡 스트리밍

Deep Agents는 LangGraph를 이용한 에이전트 실행의 실시간 업데이트를 위한 [스트리밍](https://docs.langchain.com/oss/python/langchain/event-streaming) 기능이 기본 내장되어 있습니다. 이를 통해 출력을 점진적으로 관찰하고, 도구 호출/도구 결과/LLM 응답 등 에이전트 및 서브에이전트의 작업을 검토 및 디버깅할 수 있습니다.

---

## 📚 다음 단계

첫 번째 deep agent를 구축했으니, 이제 다음 단계로 넘어가 보세요.

- **에이전트 커스터마이징**: 커스텀 시스템 프롬프트, 도구, 서브에이전트 등 [커스터마이징 옵션](https://docs.langchain.com/oss/python/deepagents/customization)을 학습하세요. 한국어 번역은 [./02_deepagents_customization_ko.md](./02_deepagents_customization_ko.md)에서 확인할 수 있습니다.
- **장기 메모리 추가**: 대화 간에 [영속 메모리](https://docs.langchain.com/oss/python/deepagents/memory)를 활성화하세요.
- **프로덕션 배포**: [Managed Deep Agents](https://docs.langchain.com/langsmith/deploy-managed-deep-agent)를 사용해 LangSmith에서 deep agent를 생성, 실행, 운영하세요.
