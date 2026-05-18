# 딥 리서치 에이전트 만들기 (Build a deep research agent)

> 원문: https://docs.langchain.com/oss/python/deepagents/deep-research
>
> 서브에이전트 위임으로 다단계 웹 리서치 에이전트를 구축합니다.

---

## 📖 목차

1. [개요 (Overview)](#-개요-overview)
2. [사전 준비 (Prerequisites)](#-사전-준비-prerequisites)
3. [셋업 (Setup)](#-셋업-setup)
4. [에이전트 구축 (Build the agent)](#-에이전트-구축-build-the-agent)
5. [에이전트 실행 (Run the agent)](#-에이전트-실행-run-the-agent)
6. [전체 코드 (Full code)](#-전체-코드-full-code)
7. [다음 단계 (Next steps)](#-다음-단계-next-steps)

---

## 📌 개요 (Overview)

이 가이드는 [Deep Agents](https://docs.langchain.com/oss/python/deepagents)를 사용해 처음부터 다단계 웹 리서치 에이전트를 구축하는 방법을 보여줍니다. 이 에이전트는 리서치 질문을 집중된 작업으로 분해하고, 전문화된 서브에이전트에게 위임하며, 결과를 종합적인 리포트로 합성합니다.

이번에 구축할 에이전트는 다음을 수행합니다.

1. todo 리스트를 사용해 리서치 계획 수립
2. 격리된 컨텍스트를 가진 서브에이전트에게 집중된 리서치 작업 위임
3. 검색 결과를 평가하고 정보 수집에 따라 다음 단계 계획
4. 적절한 인용과 함께 결과를 최종 리포트로 합성

생성된 서브에이전트는 Tavily로 웹 검색을 수행하고, 분석을 위해 전체 웹페이지 콘텐츠를 가져옵니다.

### 핵심 개념

이 튜토리얼이 다루는 내용:

- 병렬, 컨텍스트 격리된 리서치를 위한 [서브에이전트 (Subagents)](https://docs.langchain.com/oss/python/deepagents/subagents)
- 웹 검색을 위한 커스텀 [도구 (tools)](https://docs.langchain.com/oss/python/langchain/tools)
- [내장 계획 도구](https://docs.langchain.com/oss/python/deepagents/harness#planning-capabilities)를 활용한 다단계 계획 수립

---

## 🔧 사전 준비 (Prerequisites)

API 키:

- Anthropic (Claude) 또는 Google (Gemini)
- [Tavily](https://www.tavily.com/) — 웹 검색용 (선택, 무료 티어로 충분)
- [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-deepagents-deep-research) — 트레이싱용 (선택)

---

## 🚀 셋업 (Setup)

### 1단계: 프로젝트 디렉터리 생성

```bash
mkdir deep-research-agent
cd deep-research-agent
```

### 2단계: 의존성 설치

**Claude**:

```bash
pip install deepagents tavily-python httpx markdownify langchain-anthropic langchain-core
# 또는 uv
uv init
uv add deepagents tavily-python httpx markdownify langchain-anthropic langchain-core
uv sync
```

**Gemini**:

```bash
pip install deepagents tavily-python httpx markdownify langchain-google-genai langchain-core
# 또는 uv
uv init
uv add deepagents tavily-python httpx markdownify langchain-google-genai langchain-core
uv sync
```

### 3단계: API 키 설정

**Claude**:

```bash
export ANTHROPIC_API_KEY="your_anthropic_api_key"
export TAVILY_API_KEY="your_tavily_api_key"
export LANGSMITH_API_KEY="your_langsmith_api_key"   # 선택
```

**Gemini**:

```bash
export GOOGLE_API_KEY="your_google_api_key"
export TAVILY_API_KEY="your_tavily_api_key"
export LANGSMITH_API_KEY="your_langsmith_api_key"   # 선택
```

---

## 🛠️ 에이전트 구축 (Build the agent)

프로젝트 디렉터리에 `agent.py`를 생성합니다.

### 1단계: 도구 추가

커스텀 검색 도구를 추가합니다. `tavily_search` 도구는 Tavily를 URL 발견에 사용한 다음, 에이전트가 요약본이 아닌 전체 소스를 분석할 수 있도록 전체 웹페이지 콘텐츠를 가져옵니다.

```python
import os
from typing import Annotated, Literal

import httpx
from langchain.tools import InjectedToolArg, tool
from markdownify import markdownify
from tavily import TavilyClient

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])


def fetch_webpage_content(url: str, timeout: float = 10.0) -> str:
    """Fetch webpage and convert HTML to markdown."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        response = httpx.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        return markdownify(response.text)
    except Exception as e:
        return f"Error fetching {url}: {e!s}"


@tool(parse_docstring=True)
def tavily_search(
    query: str,
    max_results: Annotated[int, InjectedToolArg] = 1,
    topic: Annotated[
        Literal["general", "news", "finance"], InjectedToolArg
    ] = "general",
) -> str:
    """Search the web for information on a given query.

    Uses Tavily to discover relevant URLs, then fetches and returns full webpage content as markdown.

    Args:
        query: Search query to execute
        max_results: Maximum number of results to return (default: 1)
        topic: Topic filter - 'general', 'news', or 'finance' (default: 'general')

    Returns:
        Formatted search results with full webpage content
    """
    search_results = tavily_client.search(
        query,
        max_results=max_results,
        topic=topic,
    )
    result_texts = []
    for result in search_results.get("results", []):
        url = result["url"]
        title = result["title"]
        content = fetch_webpage_content(url)
        result_texts.append(f"## {title}\n**URL:** {url}\n\n{content}\n---")

    return f"Found {len(result_texts)} result(s) for '{query}':\n\n" + "\n".join(
        result_texts
    )
```

### 2단계: 프롬프트 추가

오케스트레이터 워크플로와 서브에이전트 프롬프트 템플릿을 `agent.py`에 추가합니다.

```python
RESEARCH_WORKFLOW_INSTRUCTIONS = """# Research Workflow

Follow this workflow for all research requests:

1. **Plan**: Create a todo list with write_todos to break down the research into focused tasks
2. **Save the request**: Use write_file() to save the user's research question to `/research_request.md`
3. **Research**: Delegate research tasks to sub-agents using the task() tool - ALWAYS use sub-agents for research, never conduct research yourself
4. **Synthesize**: Review all sub-agent findings and consolidate citations (each unique URL gets one number across all findings)
5. **Write Report**: Write a comprehensive final report to `/final_report.md` (see Report Writing Guidelines below)
6. **Verify**: Read `/research_request.md` and confirm you've addressed all aspects with proper citations and structure

## Research Planning Guidelines
- Batch similar research tasks into a single TODO to minimize overhead
- For simple fact-finding questions, use 1 sub-agent
- For comparisons or multi-faceted topics, delegate to multiple parallel sub-agents
- Each sub-agent should research one specific aspect and return findings

## Report Writing Guidelines

When writing the final report to `/final_report.md`, follow these structure patterns:

**For comparisons:**
1. Introduction
2. Overview of topic A
3. Overview of topic B
4. Detailed comparison
5. Conclusion

**For lists/rankings:**
Simply list items with details - no introduction needed:
1. Item 1 with explanation
2. Item 2 with explanation
3. Item 3 with explanation

**For summaries/overviews:**
1. Overview of topic
2. Key concept 1
3. Key concept 2
4. Key concept 3
5. Conclusion

**General guidelines:**
- Use clear section headings (## for sections, ### for subsections)
- Write in paragraph form by default - be text-heavy, not just bullet points
- Do NOT use self-referential language ("I found...", "I researched...")
- Write as a professional report without meta-commentary
- Each section should be comprehensive and detailed
- Use bullet points only when listing is more appropriate than prose

**Citation format:**
- Cite sources inline using [1], [2], [3] format
- Assign each unique URL a single citation number across ALL sub-agent findings
- End report with ### Sources section listing each numbered source
- Number sources sequentially without gaps (1,2,3,4...)
- Format: [1] Source Title: URL (each on separate line for proper list rendering)
- Example:

 Some important finding [1]. Another key insight [2].

 ### Sources
 [1] AI Research Paper: https://example.com/paper
 [2] Industry Analysis: https://example.com/analysis
"""
```

```python
RESEARCHER_INSTRUCTIONS = """You are a research assistant conducting research on the user's input topic. For context, today's date is {date}.

Your job is to use tools to gather information about the user's input topic.
You can use the tavily_search tool to find resources that can help answer the research question.
You can call it in series or in parallel, your research is conducted in a tool-calling loop.

You have access to the tavily_search tool for conducting web searches.

Think like a human researcher with limited time. Follow these steps:

1. **Read the question carefully** - What specific information does the user need?
2. **Start with broader searches** - Use broad, comprehensive queries first
3. **After each search, pause and assess** - Do I have enough to answer? What's still missing?
4. **Execute narrower searches as you gather information** - Fill in the gaps
5. **Stop when you can answer confidently** - Don't keep searching for perfection

**Tool Call Budgets** (Prevent excessive searching):
- **Simple queries**: Use 2-3 search tool calls maximum
- **Complex queries**: Use up to 5 search tool calls maximum
- **Always stop**: After 5 search tool calls if you cannot find the right sources

**Stop Immediately When**:
- You can answer the user's question comprehensively
- You have 3+ relevant examples/sources for the question
- Your last 2 searches returned similar information

After each search, assess results before continuing: What key information did I find? What's missing? Do I have enough to answer? Should I search more or provide my answer?

When providing your findings back to the orchestrator:

1. **Structure your response**: Organize findings with clear headings and detailed explanations
2. **Cite sources inline**: Use [1], [2], [3] format when referencing information from your searches
3. **Include Sources section**: End with ### Sources listing each numbered source with title and URL

Example:
## Key Findings

Context engineering is a critical technique for AI agents [1]. Studies show that proper context management can improve performance by 40% [2].

### Sources
[1] Context Engineering Guide: https://example.com/context-guide
[2] AI Performance Study: https://example.com/study

The orchestrator will consolidate citations from all sub-agents into the final report.
"""
```

```python
SUBAGENT_DELEGATION_INSTRUCTIONS = """# Sub-Agent Research Coordination

Your role is to coordinate research by delegating tasks from your TODO list to specialized research sub-agents.

## Delegation Strategy

**DEFAULT: Start with 1 sub-agent** for most queries:
- "What is quantum computing?" -> 1 sub-agent (general overview)
- "List the top 10 coffee shops in San Francisco" -> 1 sub-agent
- "Summarize the history of the internet" -> 1 sub-agent
- "Research context engineering for AI agents" -> 1 sub-agent (covers all aspects)

**ONLY parallelize when the query EXPLICITLY requires comparison or has clearly independent aspects:**

**Explicit comparisons** -> 1 sub-agent per element:
- "Compare OpenAI vs Anthropic vs DeepMind AI safety approaches" -> 3 parallel sub-agents
- "Compare Python vs JavaScript for web development" -> 2 parallel sub-agents

**Clearly separated aspects** -> 1 sub-agent per aspect (use sparingly):
- "Research renewable energy adoption in Europe, Asia, and North America" -> 3 parallel sub-agents (geographic separation)
- Only use this pattern when aspects cannot be covered efficiently by a single comprehensive search

## Key Principles
- **Bias towards single sub-agent**: One comprehensive research task is more token-efficient than multiple narrow ones
- **Avoid premature decomposition**: Don't break "research X" into "research X overview", "research X techniques", "research X applications" - just use 1 sub-agent for all of X
- **Parallelize only for clear comparisons**: Use multiple sub-agents when comparing distinct entities or geographically separated data

## Parallel Execution Limits
- Use at most {max_concurrent_research_units} parallel sub-agents per iteration
- Make multiple task() calls in a single response to enable parallel execution
- Each sub-agent returns findings independently

## Research Limits
- Stop after {max_researcher_iterations} delegation rounds if you haven't found adequate sources
- Stop when you have sufficient information to answer comprehensively
- Bias towards focused research over exhaustive exploration"""
```

### 3단계: 에이전트 생성

`agent.py`에 모델 초기화와 에이전트 생성 코드를 추가합니다. 프로바이더를 선택하세요.

**Claude 계열 (Google)**:

```python
from datetime import datetime

from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

max_concurrent_research_units = 3
max_researcher_iterations = 3

current_date = datetime.now().strftime("%Y-%m-%d")

INSTRUCTIONS = (
    RESEARCH_WORKFLOW_INSTRUCTIONS
    + "\n\n"
    + "=" * 80
    + "\n\n"
    + SUBAGENT_DELEGATION_INSTRUCTIONS.format(
        max_concurrent_research_units=max_concurrent_research_units,
        max_researcher_iterations=max_researcher_iterations,
    )
)

research_sub_agent = {
    "name": "research-agent",
    "description": "Delegate research to the sub-agent. Give one topic at a time.",
    "system_prompt": RESEARCHER_INSTRUCTIONS.format(date=current_date),
    "tools": [tavily_search],
}

model = init_chat_model(model="google_genai:gemini-3.1-pro-preview", temperature=0.0)

agent = create_deep_agent(
    model=model,
    tools=[tavily_search],
    system_prompt=INSTRUCTIONS,
    subagents=[research_sub_agent],
)
```

**OpenAI**:

```python
from datetime import datetime

from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

max_concurrent_research_units = 3
max_researcher_iterations = 3

current_date = datetime.now().strftime("%Y-%m-%d")

INSTRUCTIONS = (
    RESEARCH_WORKFLOW_INSTRUCTIONS
    + "\n\n"
    + "=" * 80
    + "\n\n"
    + SUBAGENT_DELEGATION_INSTRUCTIONS.format(
        max_concurrent_research_units=max_concurrent_research_units,
        max_researcher_iterations=max_researcher_iterations,
    )
)

research_sub_agent = {
    "name": "research-agent",
    "description": "Delegate research to the sub-agent. Give one topic at a time.",
    "system_prompt": RESEARCHER_INSTRUCTIONS.format(date=current_date),
    "tools": [tavily_search],
}

model = init_chat_model(model="openai:gpt-5.4", temperature=0.0)

agent = create_deep_agent(
    model=model,
    tools=[tavily_search],
    system_prompt=INSTRUCTIONS,
    subagents=[research_sub_agent],
)
```

**Anthropic**:

```python
from datetime import datetime

from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

max_concurrent_research_units = 3
max_researcher_iterations = 3

current_date = datetime.now().strftime("%Y-%m-%d")

INSTRUCTIONS = (
    RESEARCH_WORKFLOW_INSTRUCTIONS
    + "\n\n"
    + "=" * 80
    + "\n\n"
    + SUBAGENT_DELEGATION_INSTRUCTIONS.format(
        max_concurrent_research_units=max_concurrent_research_units,
        max_researcher_iterations=max_researcher_iterations,
    )
)

research_sub_agent = {
    "name": "research-agent",
    "description": "Delegate research to the sub-agent. Give one topic at a time.",
    "system_prompt": RESEARCHER_INSTRUCTIONS.format(date=current_date),
    "tools": [tavily_search],
}

model = init_chat_model(model="anthropic:claude-sonnet-4-6", temperature=0.0)

agent = create_deep_agent(
    model=model,
    tools=[tavily_search],
    system_prompt=INSTRUCTIONS,
    subagents=[research_sub_agent],
)
```

**OpenRouter**:

```python
from datetime import datetime

from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

# ... (위와 동일한 INSTRUCTIONS 및 research_sub_agent)

model = init_chat_model(model="openrouter:anthropic/claude-sonnet-4-6", temperature=0.0)

agent = create_deep_agent(
    model=model,
    tools=[tavily_search],
    system_prompt=INSTRUCTIONS,
    subagents=[research_sub_agent],
)
```

**Fireworks**:

```python
from datetime import datetime

from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

# ... (위와 동일한 INSTRUCTIONS 및 research_sub_agent)

model = init_chat_model(model="fireworks:accounts/fireworks/models/qwen3p5-397b-a17b", temperature=0.0)

agent = create_deep_agent(
    model=model,
    tools=[tavily_search],
    system_prompt=INSTRUCTIONS,
    subagents=[research_sub_agent],
)
```

**Baseten**:

```python
from datetime import datetime

from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

# ... (위와 동일한 INSTRUCTIONS 및 research_sub_agent)

model = init_chat_model(model="baseten:zai-org/GLM-5", temperature=0.0)

agent = create_deep_agent(
    model=model,
    tools=[tavily_search],
    system_prompt=INSTRUCTIONS,
    subagents=[research_sub_agent],
)
```

**Ollama**:

```python
from datetime import datetime

from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

# ... (위와 동일한 INSTRUCTIONS 및 research_sub_agent)

model = init_chat_model(model="ollama:devstral-2", temperature=0.0)

agent = create_deep_agent(
    model=model,
    tools=[tavily_search],
    system_prompt=INSTRUCTIONS,
    subagents=[research_sub_agent],
)
```

**Gemini (ChatGoogleGenerativeAI 직접 사용)**:

```python
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from deepagents import create_deep_agent

max_concurrent_research_units = 3
max_researcher_iterations = 3

current_date = datetime.now().strftime("%Y-%m-%d")

INSTRUCTIONS = (
    RESEARCH_WORKFLOW_INSTRUCTIONS
    + "\n\n"
    + "=" * 80
    + "\n\n"
    + SUBAGENT_DELEGATION_INSTRUCTIONS.format(
        max_concurrent_research_units=max_concurrent_research_units,
        max_researcher_iterations=max_researcher_iterations,
    )
)

research_sub_agent = {
    "name": "research-agent",
    "description": "Delegate research to the sub-agent. Give one topic at a time.",
    "system_prompt": RESEARCHER_INSTRUCTIONS.format(date=current_date),
    "tools": [tavily_search],
}

model = ChatGoogleGenerativeAI(model="gemini-3-pro-preview", temperature=0.0)

agent = create_deep_agent(
    model=model,
    tools=[tavily_search],
    system_prompt=INSTRUCTIONS,
    subagents=[research_sub_agent],
)
```

---

## 🚢 에이전트 실행 (Run the agent)

에이전트를 동기적으로 실행하거나(전체 결과를 기다린 후 출력) 업데이트를 들어오는 대로 스트리밍할 수 있습니다.

다음 코드를 `agent.py` 하단에 추가하세요.

**동기 실행**:

```python
from langchain.messages import HumanMessage

if __name__ == "__main__":
    result = agent.invoke(
        {
            "messages": [
                HumanMessage(
                    content="What are the main differences between RAG and fine-tuning for LLM applications?"
                )
            ]
        }
    )

    for msg in result.get("messages", []):
        if hasattr(msg, "content") and msg.content:
            print(msg.content)
```

**업데이트 스트리밍**:

```python
from langchain.messages import HumanMessage
from langgraph.types import Overwrite

if __name__ == "__main__":
    for chunk in agent.stream(
        {
            "messages": [
                HumanMessage(content="Compare Python vs JavaScript for web development")
            ]
        },
        stream_mode="updates",
    ):
        for node, update in chunk.items():
            if not update or not (messages := update.get("messages")):
                continue
            msg_list = messages.value if isinstance(messages, Overwrite) else messages
            for msg in msg_list:
                if hasattr(msg, "content") and msg.content:
                    print(msg.content)
```

프로젝트 루트에서 에이전트를 실행합니다.

```sh
python agent.py
```

실행 전에 `LANGSMITH_API_KEY` 환경 변수를 설정해 두었다면, [LangSmith](https://docs.langchain.com/langsmith/home)에서 에이전트의 트레이스를 확인하여 다단계 동작을 디버깅하고 모니터링할 수 있습니다.

---

## 📝 전체 코드 (Full code)

GitHub의 전체 [Deep Research 예제](https://github.com/langchain-ai/deepagents/tree/main/examples/deep_research)를 확인하세요.

---

## 🎯 다음 단계 (Next steps)

에이전트를 구축했으니, 에이전트 파일의 프롬프트 상수를 변경하여 워크플로, 위임 전략, 또는 리서처 동작을 조정하면서 커스터마이즈할 수 있습니다. 또한 위임 한도를 튜닝하여 더 많은 병렬 서브에이전트나 위임 라운드를 허용할 수도 있습니다.

이 튜토리얼의 개념에 대한 더 자세한 정보는 다음 리소스를 확인하세요.

- [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents): 다양한 도구와 프롬프트로 서브에이전트를 설정하는 방법
- [Customization](https://docs.langchain.com/oss/python/deepagents/customization): 모델, 도구, 시스템 프롬프트, 계획 동작 커스터마이징
- [LangSmith](https://docs.langchain.com/langsmith/home): 리서치 실행 트레이스 및 다단계 동작 디버깅
- [Deep Research Course](https://academy.langchain.com/courses/deep-research-with-langgraph): LangGraph로 딥 리서치를 다루는 전체 강의

---

> 📝 이 문서를 Claude, VSCode 등에 MCP를 통해 실시간 답변용으로 [연결](https://docs.langchain.com/use-these-docs)할 수 있습니다. [GitHub에서 페이지 편집](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/deep-research.mdx) 또는 [이슈 등록](https://github.com/langchain-ai/docs/issues/new/choose)도 가능합니다.
