# Deep Agents 커스터마이징 (Customization)

> 원문: https://docs.langchain.com/oss/python/deepagents/customization
>
> 시스템 프롬프트, 도구, 서브에이전트 등을 활용하여 Deep Agents를 커스터마이징하는 방법을 학습합니다.

---

## 📖 목차

1. [Model (모델)](#1-model-모델)
2. [Tools (도구)](#2-tools-도구)
3. [System prompt (시스템 프롬프트)](#3-system-prompt-시스템-프롬프트)
4. [Middleware (미들웨어)](#4-middleware-미들웨어)
5. [Subagents (서브에이전트)](#5-subagents-서브에이전트)
6. [Backends (백엔드)](#6-backends-백엔드)
7. [Sandboxes (샌드박스)](#7-sandboxes-샌드박스)
8. [Human-in-the-loop](#8-human-in-the-loop)
9. [Skills (스킬)](#9-skills-스킬)
10. [Memory (메모리)](#10-memory-메모리)
11. [Structured output (구조화된 출력)](#11-structured-output-구조화된-출력)

---

## 핵심 설정 옵션

`create_deep_agent`는 다음과 같은 핵심 설정 옵션을 제공합니다.

```python
create_deep_agent(
    model: str | BaseChatModel | None = None,
    tools: Sequence[BaseTool | Callable | dict[str, Any]] | None = None,
    *,
    system_prompt: str | SystemMessage | None = None,
    middleware: Sequence[AgentMiddleware] = (),
    subagents: Sequence[SubAgent | CompiledSubAgent | AsyncSubAgent] | None = None,
    skills: list[str] | None = None,
    memory: list[str] | None = None,
    response_format: ResponseFormat[ResponseT] | type[ResponseT] | dict[str, Any] | None = None,
    backend: BackendProtocol | BackendFactory | None = None,
    interrupt_on: dict[str, bool | InterruptOnConfig] | None = None,
    ...
) -> CompiledStateGraph
```

> 전체 파라미터 목록은 [`create_deep_agent` API 레퍼런스](https://reference.langchain.com/python/deepagents/graph/create_deep_agent)를 참고하세요.

---

## 1. Model (모델)

`model` 인자에는 `provider:model` 형식 문자열을 전달하거나, 초기화된 모델 인스턴스를 전달할 수 있습니다. 기본값은 `anthropic:claude-sonnet-4-6`입니다.

`provider:model` 형식(예: `openai:gpt-5`)을 사용하면 모델 간 빠른 전환이 가능합니다.

### 프로바이더별 예시

#### OpenAI

```bash
pip install -U "langchain[openai]"
```

```python
import os
from deepagents import create_deep_agent

os.environ["OPENAI_API_KEY"] = "sk-..."

agent = create_deep_agent(model="openai:gpt-5.4")
# 위 코드는 기본 파라미터로 init_chat_model을 호출합니다.
# 특정 모델 파라미터를 사용하려면 init_chat_model을 직접 사용하세요.
```

#### Anthropic

```bash
pip install -U "langchain[anthropic]"
```

```python
import os
from deepagents import create_deep_agent

os.environ["ANTHROPIC_API_KEY"] = "sk-..."

agent = create_deep_agent(model="anthropic:claude-sonnet-4-6")
```

#### Azure OpenAI

```bash
pip install -U "langchain[openai]"
```

```python
import os
from deepagents import create_deep_agent

os.environ["AZURE_OPENAI_API_KEY"] = "..."
os.environ["AZURE_OPENAI_ENDPOINT"] = "..."
os.environ["OPENAI_API_VERSION"] = "2025-03-01-preview"

agent = create_deep_agent(model="azure_openai:gpt-5.4")
```

#### Google Gemini

```bash
pip install -U "langchain[google-genai]"
```

```python
import os
from deepagents import create_deep_agent

os.environ["GOOGLE_API_KEY"] = "..."

agent = create_deep_agent(model="google_genai:gemini-3.1-pro-preview")
```

#### AWS Bedrock

```bash
pip install -U "langchain[aws]"
```

```python
from deepagents import create_deep_agent

# AWS 자격 증명 설정 방법은 다음 링크를 참고하세요:
# https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html

agent = create_deep_agent(
    model="anthropic.claude-sonnet-4-6",
    model_provider="bedrock_converse",
)
```

#### HuggingFace

```bash
pip install -U "langchain[huggingface]"
```

```python
import os
from deepagents import create_deep_agent

os.environ["HUGGINGFACEHUB_API_TOKEN"] = "hf_..."

agent = create_deep_agent(
    model="microsoft/Phi-3-mini-4k-instruct",
    model_provider="huggingface",
    temperature=0.7,
    max_tokens=1024,
)
```

### 연결 복원력 (Connection resilience)

LangChain의 채팅 모델들은 실패한 API 요청을 지수 백오프(exponential backoff) 방식으로 자동 재시도합니다. 기본적으로 네트워크 오류, 레이트 리밋(429), 서버 오류(5xx)에 대해 최대 **6회** 재시도합니다. 401(인증 실패), 404 같은 클라이언트 오류는 재시도하지 않습니다.

`max_retries` 파라미터를 조정하여 환경에 맞게 동작을 변경할 수 있습니다.

```python
from langchain.chat_models import init_chat_model
from deepagents import create_deep_agent

agent = create_deep_agent(
    model=init_chat_model(
        model="claude-sonnet-4-6",
        max_retries=10,  # 불안정한 네트워크에서는 더 늘리세요 (기본: 6)
        timeout=120,     # 느린 연결 환경에서는 timeout 증가
    ),
)
```

> 💡 신뢰성이 낮은 네트워크에서 장시간 실행되는 작업의 경우, `max_retries`를 10–15로 늘리고 [체크포인터(checkpointer)](https://docs.langchain.com/oss/python/langgraph/persistence)와 함께 사용하면 실패 시에도 진행 상황이 유지됩니다.

---

## 2. Tools (도구)

계획 수립, 파일 관리, 서브에이전트 생성을 위한 [기본 내장 도구](https://docs.langchain.com/oss/python/deepagents/overview#core-capabilities) 외에도, 커스텀 도구를 직접 추가할 수 있습니다.

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
    """웹 검색을 수행합니다."""
    return tavily_client.search(
        query,
        max_results=max_results,
        include_raw_content=include_raw_content,
        topic=topic,
    )

agent = create_deep_agent(
    model="openai:gpt-5.4",
    tools=[internet_search]
)
```

---

## 3. System prompt (시스템 프롬프트)

Deep Agents에는 기본 시스템 프롬프트가 내장되어 있으며, 이는 기본 내장된 계획 도구, 파일 시스템 도구, 서브에이전트 사용 방법에 대한 상세한 지시 사항을 포함합니다. 미들웨어가 파일 시스템 도구와 같은 특수 도구를 추가하면, 시스템 프롬프트에 자동으로 추가됩니다.

각 deep agent는 자신의 특정 사용 사례에 맞는 커스텀 시스템 프롬프트도 포함해야 합니다.

```python
from deepagents import create_deep_agent

research_instructions = """\
You are an expert researcher. Your job is to conduct \
thorough research, and then write a polished report. \
"""

agent = create_deep_agent(
    model="openai:gpt-5.4",
    system_prompt=research_instructions,
)
```

---

## 4. Middleware (미들웨어)

기본적으로 Deep Agents는 다음 [미들웨어](https://docs.langchain.com/oss/python/langchain/middleware/overview)에 접근할 수 있습니다.

| 미들웨어 | 역할 |
|----------|------|
| `TodoListMiddleware` | 에이전트의 작업 정리를 위한 todo 리스트 추적 및 관리 |
| `FilesystemMiddleware` | 파일 시스템 작업(읽기/쓰기/디렉토리 탐색) 처리 |
| `SubAgentMiddleware` | 작업 위임을 위한 서브에이전트 생성 및 조정 |
| `SummarizationMiddleware` | 대화가 길어지면 컨텍스트 한도 내에 맞도록 메시지 히스토리 압축 |
| `AnthropicPromptCachingMiddleware` | Anthropic 모델 사용 시 중복 토큰 처리 자동 감소 |
| `PatchToolCallsMiddleware` | 도구 호출이 결과 수신 전에 중단/취소될 경우 메시지 히스토리 자동 보정 |

Memory, Skills, Human-in-the-loop를 사용하는 경우 다음 미들웨어가 추가됩니다.

| 미들웨어 | 역할 |
|----------|------|
| `MemoryMiddleware` | `memory` 인자 제공 시 세션 간 컨텍스트 영속화 및 검색 |
| `SkillsMiddleware` | `skills` 인자 제공 시 커스텀 스킬 활성화 |
| `HumanInTheLoopMiddleware` | `interruptOn` 인자 제공 시 지정 지점에서 사람의 승인/입력 대기 |

### 사전 빌드된 미들웨어 (Pre-built middleware)

LangChain은 재시도, 폴백, PII 탐지 등 다양한 기능을 추가할 수 있는 추가 사전 빌드 미들웨어를 제공합니다. 자세한 내용은 [Prebuilt middleware](https://docs.langchain.com/oss/python/langchain/middleware/built-in)를 참고하세요.

또한 `deepagents` 라이브러리는 [`create_summarization_tool_middleware`](https://reference.langchain.com/python/deepagents/middleware/summarization/create_summarization_tool_middleware)를 제공하여, 고정된 토큰 구간이 아니라 작업 사이와 같이 적절한 시점에 에이전트가 요약을 트리거하도록 할 수 있습니다.

### 프로바이더 특화 미들웨어

특정 LLM 프로바이더에 최적화된 미들웨어는 [Official integrations](https://docs.langchain.com/oss/python/integrations/middleware#official-integrations) 및 [Community integrations](https://docs.langchain.com/oss/python/integrations/middleware#community-integrations)를 참고하세요.

### 커스텀 미들웨어 (Custom middleware)

기능 확장, 도구 추가, 커스텀 훅 구현을 위해 추가 미들웨어를 제공할 수 있습니다.

```python
from langchain.tools import tool
from langchain.agents.middleware import wrap_tool_call
from deepagents import create_deep_agent


@tool
def get_weather(city: str) -> str:
    """도시의 날씨를 가져옵니다."""
    return f"The weather in {city} is sunny."


call_count = [0]  # 중첩 함수에서 수정 가능하도록 list 사용

@wrap_tool_call
def log_tool_calls(request, handler):
    """모든 도구 호출을 가로채고 로깅합니다 - 횡단 관심사(cross-cutting concern)의 예시."""
    call_count[0] += 1
    tool_name = request.name if hasattr(request, 'name') else str(request)

    print(f"[Middleware] Tool call #{call_count[0]}: {tool_name}")
    print(f"[Middleware] Arguments: {request.args if hasattr(request, 'args') else 'N/A'}")

    # 도구 호출 실행
    result = handler(request)

    # 결과 로깅
    print(f"[Middleware] Tool call #{call_count[0]} completed")

    return result


agent = create_deep_agent(
    model="openai:gpt-5.4",
    tools=[get_weather],
    middleware=[log_tool_calls],
)
```

> ⚠️ **초기화 후 속성을 직접 변경(mutate)하지 마세요.**
>
> 훅 호출 간 값(예: 카운터, 누적 데이터)을 추적해야 한다면 **그래프 상태(graph state)** 를 사용하세요. 그래프 상태는 설계상 스레드 단위로 스코프가 분리되어 동시성 환경에서도 안전합니다.

**✅ 권장 방식:**

```python
class CustomMiddleware(AgentMiddleware):
    def __init__(self):
        pass

    def before_agent(self, state, runtime):
        return {"x": state.get("x", 0) + 1}  # 대신 그래프 상태를 업데이트
```

**❌ 피해야 할 방식:**

```python
class CustomMiddleware(AgentMiddleware):
    def __init__(self):
        self.x = 1

    def before_agent(self, state, runtime):
        self.x += 1  # 변경(mutation)이 경쟁 조건을 유발함
```

`before_agent`에서 `self.x`를 변경하는 등의 in-place 변경은 서브에이전트, 병렬 도구, 다른 스레드에서의 병렬 호출 등이 동시에 실행되기 때문에 미묘한 버그와 경쟁 조건(race conditions)을 일으킬 수 있습니다.

---

## 5. Subagents (서브에이전트)

세부 작업을 분리하고 컨텍스트 비대화를 피하려면 서브에이전트를 사용하세요.

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
    """웹 검색을 수행합니다."""
    return tavily_client.search(
        query,
        max_results=max_results,
        include_raw_content=include_raw_content,
        topic=topic,
    )

research_subagent = {
    "name": "research-agent",
    "description": "더 심층적인 질문을 조사할 때 사용",
    "system_prompt": "You are a great researcher",
    "tools": [internet_search],
    "model": "openai:gpt-5.2",  # 선택적 오버라이드, 미지정 시 메인 에이전트 모델 사용
}
subagents = [research_subagent]

agent = create_deep_agent(
    model="claude-sonnet-4-6",
    subagents=subagents
)
```

더 자세한 내용은 [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents)를 참고하세요.

---

## 6. Backends (백엔드)

Deep Agent 도구들은 파일을 저장, 접근, 편집하기 위해 가상 파일 시스템을 사용할 수 있습니다. 기본적으로 Deep Agents는 [`StateBackend`](https://reference.langchain.com/python/deepagents/backends/state/StateBackend)를 사용합니다.

> ⚠️ [skills](#9-skills-스킬)나 [memory](#10-memory-메모리)를 사용한다면, 에이전트 생성 전에 예상되는 스킬/메모리 파일을 백엔드에 추가해야 합니다.

### StateBackend (기본값)

`langgraph` 상태에 저장되는 휘발성(ephemeral) 파일 시스템 백엔드입니다. **단일 스레드 동안만** 유지됩니다.

```python
# 기본적으로 StateBackend를 제공합니다
agent = create_deep_agent(model="openai:gpt-5.4")

# 내부적으로는 다음과 같습니다
from deepagents.backends import StateBackend

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=StateBackend()
)
```

### FilesystemBackend (로컬 디스크)

로컬 머신의 파일 시스템을 사용합니다.

> ⚠️ 이 백엔드는 에이전트에게 직접적인 파일 시스템 읽기/쓰기 권한을 부여합니다. 적절한 환경에서만 신중하게 사용하세요.

```python
from deepagents.backends import FilesystemBackend

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=FilesystemBackend(root_dir=".", virtual_mode=True)
)
```

### LocalShellBackend (로컬 셸)

호스트에서 직접 셸 실행이 가능한 파일 시스템 백엔드로, 파일 시스템 도구와 명령 실행을 위한 `execute` 도구를 제공합니다.

> ⚠️ 이 백엔드는 호스트에서의 **무제한 셸 실행 권한**도 함께 부여합니다. 극도로 주의해서 사용하고, 적절한 환경에서만 사용하세요.

```python
from deepagents.backends import LocalShellBackend

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=LocalShellBackend(root_dir=".", env={"PATH": "/usr/bin:/bin"})
)
```

### StoreBackend

**스레드 간 영속**되는 장기 저장소를 제공하는 파일 시스템 백엔드입니다.

```python
from langgraph.store.memory import InMemoryStore
from deepagents.backends import StoreBackend

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=StoreBackend(
        namespace=lambda ctx: (ctx.runtime.context.user_id,),
    ),
    store=InMemoryStore()  # 로컬 개발에 적합 - LangSmith 배포 시에는 생략
)
```

> 💡 [LangSmith Deployment](https://docs.langchain.com/langsmith/deployment)에 배포할 때는 `store` 파라미터를 생략하세요. 플랫폼이 자동으로 스토어를 프로비저닝합니다.
>
> `namespace` 파라미터는 데이터 격리를 제어합니다. 멀티 유저 배포 환경에서는 사용자 또는 테넌트별로 데이터를 격리하기 위해 반드시 [네임스페이스 팩토리](https://docs.langchain.com/oss/python/deepagents/backends#namespace-factories)를 설정하세요.

### CompositeBackend

파일 시스템의 서로 다른 경로를 서로 다른 백엔드로 라우팅할 수 있는 유연한 백엔드입니다.

```python
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
from langgraph.store.memory import InMemoryStore

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(),
        }
    ),
    store=InMemoryStore()  # store는 backend가 아닌 create_deep_agent에 전달
)
```

자세한 내용은 [Backends](https://docs.langchain.com/oss/python/deepagents/backends)를 참고하세요.

---

## 7. Sandboxes (샌드박스)

샌드박스는 격리된 환경에서 에이전트 코드를 실행하는 특화된 [백엔드](https://docs.langchain.com/oss/python/deepagents/backends)입니다. 자체 파일 시스템과 셸 명령용 `execute` 도구를 갖고 있습니다.

로컬 머신을 변경하지 않으면서 파일을 작성하고, 의존성을 설치하고, 명령을 실행하고 싶을 때 샌드박스 백엔드를 사용하세요.

deep agent 생성 시 `backend`에 샌드박스 백엔드를 전달하여 설정합니다.

### Modal

```bash
pip install langchain-modal
```

```python
import modal
from deepagents import create_deep_agent
from langchain_anthropic import ChatAnthropic
from langchain_modal import ModalSandbox

app = modal.App.lookup("your-app")
modal_sandbox = modal.Sandbox.create(app=app)
backend = ModalSandbox(sandbox=modal_sandbox)

agent = create_deep_agent(
    model=ChatAnthropic(model="claude-sonnet-4-6"),
    system_prompt="You are a Python coding assistant with sandbox access.",
    backend=backend,
)
try:
    result = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": "Create a small Python package and run pytest",
                }
            ]
        }
    )
finally:
    modal_sandbox.terminate()
```

### Runloop

```bash
pip install langchain-runloop
```

```python
import os
from deepagents import create_deep_agent
from langchain_anthropic import ChatAnthropic
from langchain_runloop import RunloopSandbox
from runloop_api_client import RunloopSDK

client = RunloopSDK(bearer_token=os.environ["RUNLOOP_API_KEY"])

devbox = client.devbox.create()
backend = RunloopSandbox(devbox=devbox)

agent = create_deep_agent(
    model=ChatAnthropic(model="claude-sonnet-4-6"),
    system_prompt="You are a Python coding assistant with sandbox access.",
    backend=backend,
)

try:
    result = agent.invoke(
        {"messages": [{"role": "user", "content": "Create a small Python package and run pytest"}]}
    )
finally:
    devbox.shutdown()
```

### Daytona

```bash
pip install langchain-daytona
```

```python
from daytona import Daytona
from deepagents import create_deep_agent
from langchain_anthropic import ChatAnthropic
from langchain_daytona import DaytonaSandbox

sandbox = Daytona().create()
backend = DaytonaSandbox(sandbox=sandbox)

agent = create_deep_agent(
    model=ChatAnthropic(model="claude-sonnet-4-6"),
    system_prompt="You are a Python coding assistant with sandbox access.",
    backend=backend,
)

try:
    result = agent.invoke(
        {"messages": [{"role": "user", "content": "Create a small Python package and run pytest"}]}
    )
finally:
    sandbox.stop()
```

### LangSmith (Private Beta)

```bash
pip install "langsmith[sandbox]"
```

```python
from deepagents import create_deep_agent
from deepagents.backends import LangSmithSandbox
from langchain_anthropic import ChatAnthropic
from langsmith.sandbox import SandboxClient

client = SandboxClient()
ls_sandbox = client.create_sandbox(template_name="my-template")
backend = LangSmithSandbox(sandbox=ls_sandbox)

agent = create_deep_agent(
    model=ChatAnthropic(model="claude-sonnet-4-6"),
    system_prompt="You are a Python coding assistant with sandbox access.",
    backend=backend,
)
try:
    result = agent.invoke(
        {"messages": [{"role": "user", "content": "Create a small Python package and run pytest"}]}
    )
finally:
    client.delete_sandbox(ls_sandbox.name)
```

자세한 내용은 [Sandboxes](https://docs.langchain.com/oss/python/deepagents/sandboxes)를 참고하세요.

---

## 8. Human-in-the-loop

일부 도구 작업은 민감하여 실행 전에 사람의 승인이 필요할 수 있습니다. 각 도구별로 승인을 설정할 수 있습니다.

```python
from langchain.tools import tool
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver

@tool
def delete_file(path: str) -> str:
    """파일 시스템에서 파일을 삭제합니다."""
    return f"Deleted {path}"

@tool
def read_file(path: str) -> str:
    """파일 시스템에서 파일을 읽습니다."""
    return f"Contents of {path}"

@tool
def send_email(to: str, subject: str, body: str) -> str:
    """이메일을 발송합니다."""
    return f"Sent email to {to}"

# Human-in-the-loop에는 Checkpointer가 필수입니다
checkpointer = MemorySaver()

agent = create_deep_agent(
    model="claude-sonnet-4-6",
    tools=[delete_file, read_file, send_email],
    interrupt_on={
        "delete_file": True,  # 기본 결정: 승인(approve), 편집(edit), 거절(reject)
        "read_file": False,   # 인터럽트 불필요
        "send_email": {"allowed_decisions": ["approve", "reject"]},  # 편집 불가
    },
    checkpointer=checkpointer  # 필수!
)
```

> 💡 도구 호출 시점뿐만 아니라 도구 호출 내부에서도 에이전트 및 서브에이전트에 대해 인터럽트를 설정할 수 있습니다. 자세한 내용은 [Human-in-the-loop](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop)를 참고하세요.

---

## 9. Skills (스킬)

[스킬](https://docs.langchain.com/oss/python/deepagents/overview)을 사용하여 deep agent에 새로운 능력과 전문성을 부여할 수 있습니다.

- [도구(tools)](#2-tools-도구)는 네이티브 파일 시스템 액션이나 계획 수립 같은 저수준 기능을 다룹니다.
- **스킬(skills)** 은 작업 수행을 위한 상세한 지시 사항, 참고 자료, 템플릿 등의 자산을 포함할 수 있습니다.

이 파일들은 에이전트가 현재 프롬프트에 유용하다고 판단했을 때만 로드됩니다. 이러한 **점진적 노출(progressive disclosure)** 방식은 시작 시점에 에이전트가 고려해야 할 토큰 양과 컨텍스트를 줄여줍니다.

예시 스킬은 [Deep Agent example skills](https://github.com/langchain-ai/deepagentsjs/tree/main/examples/skills)에서 확인할 수 있습니다.

deep agent에 스킬을 추가하려면 `create_deep_agent`에 인자로 전달합니다.

### StateBackend 예시

```python
from urllib.request import urlopen
from deepagents import create_deep_agent
from deepagents.backends.utils import create_file_data
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()

skill_url = "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/libs/cli/examples/skills/langgraph-docs/SKILL.md"
with urlopen(skill_url) as response:
    skill_content = response.read().decode('utf-8')

skills_files = {
    "/skills/langgraph-docs/SKILL.md": create_file_data(skill_content)
}

agent = create_deep_agent(
    model="openai:gpt-5.4",
    skills=["/skills/"],
    checkpointer=checkpointer,
)

result = agent.invoke(
    {
        "messages": [{"role": "user", "content": "What is langgraph?"}],
        # 기본 StateBackend의 in-state 파일 시스템에 시드 데이터 제공
        # (가상 경로는 "/"로 시작해야 함)
        "files": skills_files
    },
    config={"configurable": {"thread_id": "12345"}},
)
```

### StoreBackend 예시

```python
from urllib.request import urlopen
from deepagents import create_deep_agent
from deepagents.backends import StoreBackend
from deepagents.backends.utils import create_file_data
from langgraph.store.memory import InMemoryStore


store = InMemoryStore()

skill_url = "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/libs/cli/examples/skills/langgraph-docs/SKILL.md"
with urlopen(skill_url) as response:
    skill_content = response.read().decode('utf-8')

store.put(
    namespace=("filesystem",),
    key="/skills/langgraph-docs/SKILL.md",
    value=create_file_data(skill_content)
)

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=StoreBackend(),
    store=store,
    skills=["/skills/"]
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "What is langgraph?"}]},
    config={"configurable": {"thread_id": "12345"}},
)
```

### FilesystemBackend 예시

```python
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver
from deepagents.backends.filesystem import FilesystemBackend

checkpointer = MemorySaver()

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=FilesystemBackend(root_dir="/Users/user/{project}"),
    skills=["/Users/user/{project}/skills/"],
    interrupt_on={
        "write_file": True,
        "read_file": False,
        "edit_file": True
    },
    checkpointer=checkpointer,
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "What is langgraph?"}]},
    config={"configurable": {"thread_id": "12345"}},
)
```

---

## 10. Memory (메모리)

[`AGENTS.md` 파일](https://agents.md/)을 사용하여 deep agent에 추가 컨텍스트를 제공할 수 있습니다. deep agent 생성 시 `memory` 파라미터에 하나 이상의 파일 경로를 전달할 수 있습니다.

### StateBackend 예시

```python
from urllib.request import urlopen
from deepagents import create_deep_agent
from deepagents.backends.utils import create_file_data
from langgraph.checkpoint.memory import MemorySaver

with urlopen("https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md") as response:
    agents_md = response.read().decode("utf-8")
checkpointer = MemorySaver()

agent = create_deep_agent(
    model="openai:gpt-5.4",
    memory=["/AGENTS.md"],
    checkpointer=checkpointer,
)

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "Please tell me what's in your memory files."}
        ],
        "files": {"/AGENTS.md": create_file_data(agents_md)},
    },
    config={"configurable": {"thread_id": "123456"}},
)
```

### StoreBackend 예시

```python
from urllib.request import urlopen
from deepagents import create_deep_agent
from deepagents.backends import StoreBackend
from deepagents.backends.utils import create_file_data
from langgraph.store.memory import InMemoryStore

with urlopen("https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md") as response:
    agents_md = response.read().decode("utf-8")

store = InMemoryStore()
file_data = create_file_data(agents_md)
store.put(
    namespace=("filesystem",),
    key="/AGENTS.md",
    value=file_data
)

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=StoreBackend(),
    store=store,
    memory=["/AGENTS.md"]
)

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "Please tell me what's in your memory files."}
        ],
        "files": {"/AGENTS.md": create_file_data(agents_md)},
    },
    config={"configurable": {"thread_id": "12345"}},
)
```

### FilesystemBackend 예시

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()

agent = create_deep_agent(
    model="openai:gpt-5.4",
    backend=FilesystemBackend(root_dir="/Users/user/{project}"),
    memory=["./AGENTS.md"],
    interrupt_on={
        "write_file": True,
        "read_file": False,
        "edit_file": True
    },
    checkpointer=checkpointer,
)
```

---

## 11. Structured output (구조화된 출력)

Deep Agents는 [구조화된 출력(structured output)](https://docs.langchain.com/oss/python/langchain/structured-output)을 지원합니다.

`create_deep_agent()` 호출 시 `response_format` 인자에 원하는 스키마를 전달하여 구조화된 출력 스키마를 설정할 수 있습니다. 모델이 구조화된 데이터를 생성하면, deep agent 상태의 `'structured_response'` 키에 캡처되고, 검증된 후 반환됩니다.

```python
import os
from typing import Literal
from pydantic import BaseModel, Field
from tavily import TavilyClient
from deepagents import create_deep_agent

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

def internet_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = False,
):
    """웹 검색을 수행합니다."""
    return tavily_client.search(
        query,
        max_results=max_results,
        include_raw_content=include_raw_content,
        topic=topic,
    )

class WeatherReport(BaseModel):
    """현재 상태와 예보를 포함한 구조화된 날씨 리포트."""
    location: str = Field(description="이 날씨 리포트가 다루는 위치")
    temperature: float = Field(description="현재 기온(섭씨)")
    condition: str = Field(description="현재 날씨 상태 (예: sunny, cloudy, rainy)")
    humidity: int = Field(description="습도 백분율")
    wind_speed: float = Field(description="풍속(km/h)")
    forecast: str = Field(description="향후 24시간 동안의 간단한 예보")


agent = create_deep_agent(
    model="openai:gpt-5.4",
    response_format=WeatherReport,
    tools=[internet_search]
)

result = agent.invoke({
    "messages": [{"role": "user", "content": "What's the weather like in San Francisco?"}]
})

print(result["structured_response"])
# location='San Francisco, California' temperature=18.3 condition='Sunny'
# humidity=48 wind_speed=7.6 forecast='Pleasant sunny conditions expected...'
```

더 많은 정보와 예시는 [response format 문서](https://docs.langchain.com/oss/python/langchain/structured-output#response-format)를 참고하세요.

---

## 📝 요약

`create_deep_agent`는 다양한 옵션을 제공합니다.

- **Model**: 다양한 프로바이더와 모델 인스턴스를 지원하며, 재시도/타임아웃 같은 연결 복원력 설정 가능
- **Tools**: 기본 내장 도구 외에 커스텀 도구를 자유롭게 추가
- **System prompt**: 사용 사례에 맞는 시스템 프롬프트 작성
- **Middleware**: 기본 미들웨어와 사전 빌드된 미들웨어, 커스텀 미들웨어로 기능 확장 (상태 변경 주의)
- **Subagents**: 컨텍스트 격리를 위한 전문 서브에이전트 구성
- **Backends**: State, Filesystem, LocalShell, Store, Composite 등 다양한 파일 시스템 백엔드 선택 가능
- **Sandboxes**: Modal, Runloop, Daytona, LangSmith 등 격리 실행 환경
- **Human-in-the-loop**: 민감한 도구의 승인 흐름 구성 (checkpointer 필수)
- **Skills**: 점진적 노출로 토큰을 절약하면서 전문성 추가
- **Memory**: `AGENTS.md` 같은 파일로 컨텍스트 제공
- **Structured output**: Pydantic 스키마로 응답을 구조화
