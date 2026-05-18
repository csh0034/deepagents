# Model Context Protocol (MCP)

> 원문: https://docs.langchain.com/oss/python/deepagents/mcp
>
> MCP 서버에 정의된 도구를 LangChain 에이전트에서 사용하는 방법

---

## 📖 목차

1. [퀵스타트 (Quickstart)](#1-퀵스타트-quickstart)
2. [커스텀 서버 (Custom servers)](#2-커스텀-서버-custom-servers)
3. [전송 방식 (Transports)](#3-전송-방식-transports)
4. [상태 유지 세션 (Stateful sessions)](#4-상태-유지-세션-stateful-sessions)
5. [핵심 기능 (Core features)](#5-핵심-기능-core-features)
6. [고급 기능 (Advanced features)](#6-고급-기능-advanced-features)
7. [추가 리소스 (Additional resources)](#7-추가-리소스-additional-resources)

---

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction)는 애플리케이션이 LLM에 도구와 컨텍스트를 제공하는 방식을 표준화한 오픈 프로토콜입니다. LangChain 에이전트는 [`langchain-mcp-adapters`](https://github.com/langchain-ai/langchain-mcp-adapters) 라이브러리를 사용하여 MCP 서버에 정의된 도구를 사용할 수 있습니다.

---

## 1. 퀵스타트 (Quickstart)

`langchain-mcp-adapters` 라이브러리를 설치합니다.

```bash
# pip
pip install langchain-mcp-adapters
```

```bash
# uv
uv add langchain-mcp-adapters
```

`langchain-mcp-adapters`는 에이전트가 하나 이상의 MCP 서버에 정의된 도구를 사용할 수 있도록 해줍니다.

> ℹ️ `MultiServerMCPClient`는 **기본적으로 무상태(stateless)** 입니다. 각 도구 호출은 새로운 MCP `ClientSession`을 생성하고, 도구를 실행한 뒤 정리됩니다. 자세한 내용은 [상태 유지 세션](#4-상태-유지-세션-stateful-sessions) 섹션을 참고하세요.

```python
# 여러 MCP 서버에 접근하기
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent

async def main():
    client = MultiServerMCPClient(
        {
            "math": {
                "transport": "stdio",  # 로컬 서브프로세스 통신
                "command": "python",
                # math_server.py 파일의 절대 경로
                "args": ["/path/to/math_server.py"],
            },
            "weather": {
                "transport": "http",  # HTTP 기반 원격 서버
                # weather 서버를 8000 포트에서 시작해 두어야 합니다
                "url": "http://localhost:8000/mcp",
            }
        }
    )

    tools = await client.get_tools()
    agent = create_agent(
        "claude-sonnet-4-6",
        tools
    )
    math_response = await agent.ainvoke(
        {"messages": [{"role": "user", "content": "what's (3 + 5) x 12?"}]}
    )
    weather_response = await agent.ainvoke(
        {"messages": [{"role": "user", "content": "what is the weather in nyc?"}]}
    )
    print(math_response)
    print(weather_response)

if __name__ == "__main__":
    asyncio.run(main())
```

> 💡 [LangSmith](https://smith.langchain.com)로 에이전트의 추론 단계와 함께 MCP 도구 호출을 추적할 수 있습니다. [추적 퀵스타트](https://docs.langchain.com/langsmith/trace-with-langchain)를 참고하여 설정하세요.

---

## 2. 커스텀 서버 (Custom servers)

커스텀 MCP 서버를 만들려면 [FastMCP](https://gofastmcp.com/getting-started/welcome) 라이브러리를 사용하세요.

```bash
# pip
pip install fastmcp
```

```bash
# uv
uv add fastmcp
```

MCP 도구 서버로 에이전트를 테스트하려면 다음 예시를 사용하세요.

```python
# Math 서버 (stdio 전송)
from fastmcp import FastMCP

mcp = FastMCP("Math")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.tool()
def multiply(a: int, b: int) -> int:
    """Multiply two numbers"""
    return a * b

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

```python
# Weather 서버 (streamable HTTP 전송)
from fastmcp import FastMCP

mcp = FastMCP("Weather")

@mcp.tool()
async def get_weather(location: str) -> str:
    """Get weather for location."""
    return "It's always sunny in New York"

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

---

## 3. 전송 방식 (Transports)

MCP는 클라이언트-서버 통신을 위해 다양한 전송(transport) 메커니즘을 지원합니다.

### HTTP

`http` 전송(또는 `streamable-http`로도 불림)은 HTTP 요청을 사용해 클라이언트-서버 간 통신을 수행합니다. 자세한 내용은 [MCP HTTP 전송 명세](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http)를 참고하세요.

```python
client = MultiServerMCPClient(
    {
        "weather": {
            "transport": "http",
            "url": "http://localhost:8000/mcp",
        }
    }
)
```

#### 헤더 전달 (Passing headers)

HTTP를 통해 MCP 서버에 연결할 때, 연결 구성의 `headers` 필드를 사용해 인증이나 트레이싱 등을 위한 커스텀 헤더를 포함할 수 있습니다. 이는 `sse`(MCP 사양에서 deprecated 됨)와 `streamable_http` 전송에서 지원됩니다.

```python
# MultiServerMCPClient에 헤더 전달
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent

client = MultiServerMCPClient(
    {
        "weather": {
            "transport": "http",
            "url": "http://localhost:8000/mcp",
            "headers": {
                "Authorization": "Bearer YOUR_TOKEN",
                "X-Custom-Header": "custom-value"
            },
        }
    }
)
tools = await client.get_tools()
agent = create_agent("openai:gpt-5.4", tools)
response = await agent.ainvoke({"messages": "what is the weather in nyc?"})
```

#### 인증 (Authentication)

`langchain-mcp-adapters` 라이브러리는 내부적으로 공식 [MCP SDK](https://github.com/modelcontextprotocol/python-sdk)를 사용하므로, `httpx.Auth` 인터페이스를 구현하여 커스텀 인증 메커니즘을 제공할 수 있습니다.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient(
    {
        "weather": {
            "transport": "http",
            "url": "http://localhost:8000/mcp",
            "auth": auth,
        }
    }
)
```

- [커스텀 인증 구현 예시](https://github.com/modelcontextprotocol/python-sdk/blob/main/examples/clients/simple-auth-client/mcp_simple_auth_client/main.py)
- [내장 OAuth flow](https://github.com/modelcontextprotocol/python-sdk/blob/main/src/mcp/client/auth/oauth2.py#L216)

### stdio

클라이언트가 서버를 서브프로세스로 실행하고 표준 입출력을 통해 통신합니다. 로컬 도구나 간단한 설정에 적합합니다.

> ℹ️ HTTP 전송과 달리, `stdio` 연결은 본질적으로 **상태를 유지(stateful)** 합니다. 즉 서브프로세스가 클라이언트 연결 수명 동안 유지됩니다. 다만, 명시적 세션 관리 없이 `MultiServerMCPClient`를 사용하면 각 도구 호출은 여전히 새로운 세션을 만듭니다. 영속 연결을 관리하려면 [상태 유지 세션](#4-상태-유지-세션-stateful-sessions)을 참고하세요.

```python
client = MultiServerMCPClient(
    {
        "math": {
            "transport": "stdio",
            "command": "python",
            "args": ["/path/to/math_server.py"],
        }
    }
)
```

---

## 4. 상태 유지 세션 (Stateful sessions)

기본적으로 `MultiServerMCPClient`는 **무상태(stateless)** 입니다. 각 도구 호출은 새 MCP 세션을 만들어 실행한 뒤 정리됩니다.

도구 호출 간 컨텍스트를 유지하는 상태 유지 서버와 함께 작업하는 경우처럼 MCP 세션의 [라이프사이클](https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle)을 직접 제어해야 한다면, `client.session()`을 통해 영속 `ClientSession`을 만들 수 있습니다.

```python
# 상태 유지 도구 사용을 위한 MCP ClientSession 사용
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain.agents import create_agent

client = MultiServerMCPClient({...})

# 세션을 명시적으로 생성
async with client.session("server_name") as session:
    # 도구, 리소스, 프롬프트를 로드할 때 세션을 전달
    tools = await load_mcp_tools(session)
    agent = create_agent(
        "google_genai:gemini-3.1-pro-preview",
        tools
    )
```

---

## 5. 핵심 기능 (Core features)

### 도구 (Tools)

[도구(Tools)](https://modelcontextprotocol.io/docs/concepts/tools)는 MCP 서버가 데이터베이스 쿼리, API 호출, 외부 시스템 상호작용 등 LLM이 호출해 액션을 수행할 수 있는 실행 가능한 함수를 노출할 수 있게 해줍니다. LangChain은 MCP 도구를 LangChain [도구](https://docs.langchain.com/oss/python/langchain/tools)로 변환하므로 어떤 LangChain 에이전트나 워크플로에서도 직접 사용할 수 있습니다.

#### 도구 로드하기 (Loading tools)

`client.get_tools()`를 사용해 MCP 서버에서 도구를 가져와 에이전트에 전달하세요.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent

client = MultiServerMCPClient({...})
tools = await client.get_tools()
agent = create_agent("claude-sonnet-4-6", tools)
```

#### 구조화된 콘텐츠 (Structured content)

MCP 도구는 사람이 읽을 수 있는 텍스트 응답과 함께 [구조화된 콘텐츠(structured content)](https://modelcontextprotocol.io/specification/2025-03-26/server/tools#structured-content)를 반환할 수 있습니다. 모델에 보여줄 텍스트 외에 기계가 파싱 가능한 데이터(예: JSON)도 반환해야 할 때 유용합니다.

MCP 도구가 `structuredContent`를 반환하면, 어댑터는 이를 [`MCPToolArtifact`](https://reference.langchain.com/python/langchain_mcp_adapters/#langchain_mcp_adapters.tools.MCPToolArtifact)로 감싸 도구의 artifact로 반환합니다. `ToolMessage`의 `artifact` 필드로 접근할 수 있습니다. 또한 [인터셉터(interceptor)](#도구-인터셉터-tool-interceptors)를 사용하면 구조화된 콘텐츠를 자동으로 처리하거나 변환할 수 있습니다.

**아티팩트에서 구조화된 콘텐츠 추출하기**

에이전트를 호출한 후, 응답의 도구 메시지에서 구조화된 콘텐츠에 접근할 수 있습니다.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent
from langchain.messages import ToolMessage

client = MultiServerMCPClient({...})
tools = await client.get_tools()
agent = create_agent("claude-sonnet-4-6", tools)

result = await agent.ainvoke(
    {"messages": [{"role": "user", "content": "Get data from the server"}]}
)

# 도구 메시지에서 구조화된 콘텐츠 추출
for message in result["messages"]:
    if isinstance(message, ToolMessage) and message.artifact:
        structured_content = message.artifact["structured_content"]
```

**인터셉터를 통해 구조화된 콘텐츠 추가하기**

구조화된 콘텐츠를 대화 히스토리에 (모델이 볼 수 있도록) 노출하고 싶다면, [인터셉터](#도구-인터셉터-tool-interceptors)를 사용하여 도구 결과에 자동으로 구조화된 콘텐츠를 덧붙일 수 있습니다.

```python
import json

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.interceptors import MCPToolCallRequest
from mcp.types import TextContent

async def append_structured_content(request: MCPToolCallRequest, handler):
    """Append structured content from artifact to tool message."""
    result = await handler(request)
    if result.structuredContent:
        result.content += [
            TextContent(type="text", text=json.dumps(result.structuredContent)),
        ]
    return result

client = MultiServerMCPClient({...}, tool_interceptors=[append_structured_content])
```

#### 멀티모달 도구 콘텐츠 (Multimodal tool content)

MCP 도구는 응답에서 [멀티모달 콘텐츠](https://modelcontextprotocol.io/specification/2025-03-26/server/tools#tool-result) (이미지, 텍스트 등)를 반환할 수 있습니다. MCP 서버가 여러 파트(예: 텍스트와 이미지)를 가진 콘텐츠를 반환하면, 어댑터는 이를 LangChain의 [표준 콘텐츠 블록(standard content blocks)](https://docs.langchain.com/oss/python/langchain/messages#standard-content-blocks)으로 변환합니다. `ToolMessage`의 `content_blocks` 프로퍼티로 표준화된 표현에 접근할 수 있습니다.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent

client = MultiServerMCPClient({...})
tools = await client.get_tools()
agent = create_agent("claude-sonnet-4-6", tools)

result = await agent.ainvoke(
    {"messages": [{"role": "user", "content": "Take a screenshot of the current page"}]}
)

# 도구 메시지에서 멀티모달 콘텐츠 접근
for message in result["messages"]:
    if message.type == "tool":
        # 프로바이더 네이티브 포맷의 원본 콘텐츠
        print(f"Raw content: {message.content}")

        # 표준화된 콘텐츠 블록
        for block in message.content_blocks:
            if block["type"] == "text":
                print(f"Text: {block['text']}")
            elif block["type"] == "image":
                print(f"Image URL: {block.get('url')}")
                print(f"Image base64: {block.get('base64', '')[:50]}...")
```

이를 통해 기반 MCP 서버가 콘텐츠를 어떻게 포매팅하든, 프로바이더 비종속적(provider-agnostic) 방식으로 멀티모달 도구 응답을 처리할 수 있습니다.

### 리소스 (Resources)

[리소스(Resources)](https://modelcontextprotocol.io/docs/concepts/resources)는 MCP 서버가 파일, 데이터베이스 레코드, API 응답 같은 데이터를 클라이언트가 읽을 수 있도록 노출하게 해줍니다. LangChain은 MCP 리소스를 [Blob](https://reference.langchain.com/python/langchain_core/documents/#langchain_core.documents.base.Blob) 객체로 변환하며, 이는 텍스트와 바이너리 콘텐츠 모두를 일관된 인터페이스로 처리하게 해줍니다.

#### 리소스 로드하기 (Loading resources)

`client.get_resources()`로 MCP 서버에서 리소스를 로드합니다.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({...})

# 서버에서 모든 리소스 로드
blobs = await client.get_resources("server_name")

# 또는 URI로 특정 리소스만 로드
blobs = await client.get_resources("server_name", uris=["file:///path/to/file.txt"])

for blob in blobs:
    print(f"URI: {blob.metadata['uri']}, MIME type: {blob.mimetype}")
    print(blob.as_string())  # 텍스트 콘텐츠의 경우
```

더 세밀한 제어가 필요하다면 [`load_mcp_resources`](https://reference.langchain.com/python/langchain_mcp_adapters/#langchain_mcp_adapters.resources.load_mcp_resources)를 세션과 함께 직접 사용할 수도 있습니다.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.resources import load_mcp_resources

client = MultiServerMCPClient({...})

async with client.session("server_name") as session:
    # 모든 리소스 로드
    blobs = await load_mcp_resources(session)

    # 또는 URI로 특정 리소스만 로드
    blobs = await load_mcp_resources(session, uris=["file:///path/to/file.txt"])
```

### 프롬프트 (Prompts)

[프롬프트(Prompts)](https://modelcontextprotocol.io/docs/concepts/prompts)는 MCP 서버가 클라이언트가 가져와 사용할 수 있는 재사용 가능한 프롬프트 템플릿을 노출하게 해줍니다. LangChain은 MCP 프롬프트를 [메시지](https://docs.langchain.com/oss/python/langchain/messages)로 변환하므로 채팅 기반 워크플로에 손쉽게 통합할 수 있습니다.

#### 프롬프트 로드하기 (Loading prompts)

`client.get_prompt()`로 MCP 서버에서 프롬프트를 로드합니다.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({...})

# 이름으로 프롬프트 로드
messages = await client.get_prompt("server_name", "summarize")

# 인자와 함께 프롬프트 로드
messages = await client.get_prompt(
    "server_name",
    "code_review",
    arguments={"language": "python", "focus": "security"}
)

# 메시지를 워크플로에서 사용
for message in messages:
    print(f"{message.type}: {message.content}")
```

더 세밀한 제어를 위해 [`load_mcp_prompt`](https://reference.langchain.com/python/langchain_mcp_adapters/#langchain_mcp_adapters.prompts.load_mcp_prompt)를 세션과 함께 직접 사용할 수도 있습니다.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.prompts import load_mcp_prompt

client = MultiServerMCPClient({...})

async with client.session("server_name") as session:
    # 이름으로 프롬프트 로드
    messages = await load_mcp_prompt(session, "summarize")

    # 인자와 함께 프롬프트 로드
    messages = await load_mcp_prompt(
        session,
        "code_review",
        arguments={"language": "python", "focus": "security"}
    )
```

---

## 6. 고급 기능 (Advanced features)

### 도구 인터셉터 (Tool interceptors)

MCP 서버는 별도 프로세스로 실행되므로 [스토어(store)](https://docs.langchain.com/oss/python/langgraph/persistence#memory-store), [컨텍스트(context)](https://docs.langchain.com/oss/python/langchain/context-engineering), 에이전트 상태 같은 LangGraph 런타임 정보에 접근할 수 없습니다. **인터셉터는 이 격차를 메워주는 역할** 을 하며, MCP 도구 실행 중에 이러한 런타임 컨텍스트에 접근하게 해줍니다.

또한 인터셉터는 도구 호출에 대한 미들웨어와 같은 제어를 제공합니다. 요청 수정, 재시도 구현, 동적 헤더 추가, 또는 실행 자체를 단락(short-circuit)하는 것 등이 가능합니다.

| 섹션 | 설명 |
|------|------|
| [런타임 컨텍스트 접근](#런타임-컨텍스트-접근-accessing-runtime-context) | 사용자 ID, API 키, 스토어 데이터, 에이전트 상태 읽기 |
| [상태 업데이트와 명령](#상태-업데이트와-명령-state-updates-and-commands) | 에이전트 상태 업데이트 또는 `Command`로 그래프 흐름 제어 |
| [인터셉터 작성하기](#커스텀-인터셉터-custom-interceptors) | 요청 수정, 인터셉터 합성, 에러 처리 패턴 |

#### 런타임 컨텍스트 접근 (Accessing runtime context)

MCP 도구가 LangChain 에이전트(`create_agent` 경유) 내에서 사용될 때, 인터셉터는 `ToolRuntime` 컨텍스트에 접근할 수 있습니다. 도구 호출 ID, state, config, store에 접근하여 사용자 데이터 접근, 정보 영속화, 에이전트 동작 제어 같은 강력한 패턴을 사용할 수 있습니다.

**Runtime context — 사용자별 설정 주입**

호출 시점에 전달된 사용자 ID, API 키, 권한 등의 사용자별 설정에 접근합니다.

```python
# MCP 도구 호출에 사용자 컨텍스트 주입
from dataclasses import dataclass
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.interceptors import MCPToolCallRequest
from langchain.agents import create_agent

@dataclass
class Context:
    user_id: str
    api_key: str

async def inject_user_context(
    request: MCPToolCallRequest,
    handler,
):
    """Inject user credentials into MCP tool calls."""
    runtime = request.runtime
    user_id = runtime.context.user_id
    api_key = runtime.context.api_key

    # 사용자 컨텍스트를 도구 인자에 추가
    modified_request = request.override(
        args={**request.args, "user_id": user_id}
    )
    return await handler(modified_request)

client = MultiServerMCPClient(
    {...},
    tool_interceptors=[inject_user_context],
)
tools = await client.get_tools()
agent = create_agent("gpt-5.4", tools, context_schema=Context)

# 사용자 컨텍스트와 함께 호출
result = await agent.ainvoke(
    {"messages": [{"role": "user", "content": "Search my orders"}]},
    context={"user_id": "user_123", "api_key": "sk-..."}
)
```

**Store — 저장된 사용자 선호도 활용**

장기 메모리에 접근하여 사용자 선호도 조회 또는 대화 간 데이터 영속화에 활용합니다.

```python
# 스토어에서 사용자 선호도 접근
from dataclasses import dataclass
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.interceptors import MCPToolCallRequest
from langchain.agents import create_agent
from langgraph.store.memory import InMemoryStore

@dataclass
class Context:
    user_id: str

async def personalize_search(
    request: MCPToolCallRequest,
    handler,
):
    """Personalize MCP tool calls using stored preferences."""
    runtime = request.runtime
    user_id = runtime.context.user_id
    store = runtime.store

    # 스토어에서 사용자 선호도 읽기
    prefs = store.get(("preferences",), user_id)

    if prefs and request.name == "search":
        # 사용자의 선호 언어와 결과 개수 적용
        modified_args = {
            **request.args,
            "language": prefs.value.get("language", "en"),
            "limit": prefs.value.get("result_limit", 10),
        }
        request = request.override(args=modified_args)

    return await handler(request)

client = MultiServerMCPClient(
    {...},
    tool_interceptors=[personalize_search],
)
tools = await client.get_tools()
agent = create_agent(
    "gpt-5.4",
    tools,
    context_schema=Context,
    store=InMemoryStore()
)
```

**State — 인증 상태 기반 도구 필터링**

대화 상태에 접근해 현재 세션을 기반으로 결정을 내릴 수 있습니다.

```python
# 인증 상태에 따른 도구 필터링
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.interceptors import MCPToolCallRequest
from langchain.messages import ToolMessage

async def require_authentication(
    request: MCPToolCallRequest,
    handler,
):
    """Block sensitive MCP tools if user is not authenticated."""
    runtime = request.runtime
    state = runtime.state
    is_authenticated = state.get("authenticated", False)

    sensitive_tools = ["delete_file", "update_settings", "export_data"]

    if request.name in sensitive_tools and not is_authenticated:
        # 도구 호출 대신 에러 반환
        return ToolMessage(
            content="Authentication required. Please log in first.",
            tool_call_id=runtime.tool_call_id,
        )

    return await handler(request)

client = MultiServerMCPClient(
    {...},
    tool_interceptors=[require_authentication],
)
```

**Tool call ID — 도구 호출 ID 활용**

도구 호출 ID에 접근하여 올바르게 포맷팅된 응답을 반환하거나 도구 실행을 추적합니다.

```python
# 도구 호출 ID와 함께 커스텀 응답 반환
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.interceptors import MCPToolCallRequest
from langchain.messages import ToolMessage

async def rate_limit_interceptor(
    request: MCPToolCallRequest,
    handler,
):
    """Rate limit expensive MCP tool calls."""
    runtime = request.runtime
    tool_call_id = runtime.tool_call_id

    # 레이트 리밋 확인 (간략화한 예시)
    if is_rate_limited(request.name):
        return ToolMessage(
            content="Rate limit exceeded. Please try again later.",
            tool_call_id=tool_call_id,
        )

    result = await handler(request)

    # 성공한 도구 호출 로깅
    log_tool_execution(tool_call_id, request.name, success=True)

    return result

client = MultiServerMCPClient(
    {...},
    tool_interceptors=[rate_limit_interceptor],
)
```

더 많은 컨텍스트 엔지니어링 패턴은 [Context engineering](https://docs.langchain.com/oss/python/langchain/context-engineering)과 [Tools](https://docs.langchain.com/oss/python/langchain/tools)를 참고하세요.

#### 상태 업데이트와 명령 (State updates and commands)

인터셉터는 `Command` 객체를 반환하여 에이전트 상태를 업데이트하거나 그래프 실행 흐름을 제어할 수 있습니다. 이는 작업 진행률 추적, 에이전트 간 전환, 조기 종료에 유용합니다.

```python
# 작업 완료를 표시하고 에이전트 전환
from langchain.agents import AgentState, create_agent
from langchain_mcp_adapters.interceptors import MCPToolCallRequest
from langchain.messages import ToolMessage
from langgraph.types import Command

async def handle_task_completion(
    request: MCPToolCallRequest,
    handler,
):
    """Mark task complete and hand off to summary agent."""
    result = await handler(request)

    if request.name == "submit_order":
        return Command(
            update={
                "messages": [result] if isinstance(result, ToolMessage) else [],
                "task_status": "completed",
            },
            goto="summary_agent",
        )

    return result
```

`goto="__end__"`로 `Command`를 사용하면 조기 종료할 수 있습니다.

```python
# 완료 시 에이전트 실행 종료
async def end_on_success(
    request: MCPToolCallRequest,
    handler,
):
    """End agent run when task is marked complete."""
    result = await handler(request)

    if request.name == "mark_complete":
        return Command(
            update={"messages": [result], "status": "done"},
            goto="__end__",
        )

    return result
```

#### 커스텀 인터셉터 (Custom interceptors)

인터셉터는 도구 실행을 감싸는 async 함수로, 요청/응답 수정, 재시도 로직, 기타 횡단 관심사를 처리할 수 있게 해줍니다. 리스트의 첫 인터셉터가 가장 바깥 레이어인 "양파(onion)" 패턴을 따릅니다.

**기본 패턴 (Basic pattern)**

인터셉터는 요청과 핸들러를 받는 async 함수입니다. 핸들러 호출 전 요청을 수정하거나, 호출 후 응답을 수정하거나, 핸들러를 완전히 건너뛸 수 있습니다.

```python
# 기본 인터셉터 패턴
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.interceptors import MCPToolCallRequest

async def logging_interceptor(
    request: MCPToolCallRequest,
    handler,
):
    """Log tool calls before and after execution."""
    print(f"Calling tool: {request.name} with args: {request.args}")
    result = await handler(request)
    print(f"Tool {request.name} returned: {result}")
    return result

client = MultiServerMCPClient(
    {"math": {"transport": "stdio", "command": "python", "args": ["/path/to/server.py"]}},
    tool_interceptors=[logging_interceptor],
)
```

**요청 수정하기 (Modifying requests)**

`request.override()`로 수정된 요청을 생성하세요. 이는 불변 패턴을 따르므로 원본 요청은 변경되지 않습니다.

```python
# 도구 인자 수정
async def double_args_interceptor(
    request: MCPToolCallRequest,
    handler,
):
    """Double all numeric arguments before execution."""
    modified_args = {k: v * 2 for k, v in request.args.items()}
    modified_request = request.override(args=modified_args)
    return await handler(modified_request)

# 원본 호출: add(a=2, b=3)이 add(a=4, b=6)이 됩니다
```

**런타임에 헤더 수정하기 (Modifying headers at runtime)**

인터셉터는 요청 컨텍스트에 따라 HTTP 헤더를 동적으로 수정할 수 있습니다.

```python
# 동적 헤더 수정
async def auth_header_interceptor(
    request: MCPToolCallRequest,
    handler,
):
    """Add authentication headers based on the tool being called."""
    token = get_token_for_tool(request.name)
    modified_request = request.override(
        headers={"Authorization": f"Bearer {token}"}
    )
    return await handler(modified_request)
```

**인터셉터 합성하기 (Composing interceptors)**

여러 인터셉터는 "양파(onion)" 순서로 합성됩니다. 리스트의 첫 인터셉터가 가장 바깥 레이어입니다.

```python
# 여러 인터셉터 합성
async def outer_interceptor(request, handler):
    print("outer: before")
    result = await handler(request)
    print("outer: after")
    return result

async def inner_interceptor(request, handler):
    print("inner: before")
    result = await handler(request)
    print("inner: after")
    return result

client = MultiServerMCPClient(
    {...},
    tool_interceptors=[outer_interceptor, inner_interceptor],
)

# 실행 순서:
# outer: before -> inner: before -> tool execution -> inner: after -> outer: after
```

**에러 처리 (Error handling)**

인터셉터를 사용해 도구 실행 에러를 잡고 재시도 로직을 구현할 수 있습니다.

```python
# 에러 발생 시 재시도
import asyncio

async def retry_interceptor(
    request: MCPToolCallRequest,
    handler,
    max_retries: int = 3,
    delay: float = 1.0,
):
    """Retry failed tool calls with exponential backoff."""
    last_error = None
    for attempt in range(max_retries):
        try:
            return await handler(request)
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                wait_time = delay * (2 ** attempt)  # 지수 백오프
                print(f"Tool {request.name} failed (attempt {attempt + 1}), retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
    raise last_error

client = MultiServerMCPClient(
    {...},
    tool_interceptors=[retry_interceptor],
)
```

특정 에러 타입을 잡아 폴백 값을 반환할 수도 있습니다.

```python
# 폴백을 사용한 에러 처리
async def fallback_interceptor(
    request: MCPToolCallRequest,
    handler,
):
    """Return a fallback value if tool execution fails."""
    try:
        return await handler(request)
    except TimeoutError:
        return f"Tool {request.name} timed out. Please try again later."
    except ConnectionError:
        return f"Could not connect to {request.name} service. Using cached data."
```

### 진행 알림 (Progress notifications)

장시간 실행되는 도구 실행에 대한 진행률 업데이트를 구독합니다.

```python
# 진행률 콜백
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.callbacks import Callbacks, CallbackContext

async def on_progress(
    progress: float,
    total: float | None,
    message: str | None,
    context: CallbackContext,
):
    """Handle progress updates from MCP servers."""
    percent = (progress / total * 100) if total else progress
    tool_info = f" ({context.tool_name})" if context.tool_name else ""
    print(f"[{context.server_name}{tool_info}] Progress: {percent:.1f}% - {message}")

client = MultiServerMCPClient(
    {...},
    callbacks=Callbacks(on_progress=on_progress),
)
```

`CallbackContext`가 제공하는 정보:

- `server_name`: MCP 서버 이름
- `tool_name`: 실행 중인 도구 이름 (도구 호출 중에만 사용 가능)

### 로깅 (Logging)

MCP 프로토콜은 서버에서 보내는 [로깅(logging)](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/logging#log-levels) 알림을 지원합니다. `Callbacks` 클래스를 사용해 이벤트를 구독하세요.

```python
# 로깅 콜백
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.callbacks import Callbacks, CallbackContext
from mcp.types import LoggingMessageNotificationParams

async def on_logging_message(
    params: LoggingMessageNotificationParams,
    context: CallbackContext,
):
    """Handle log messages from MCP servers."""
    print(f"[{context.server_name}] {params.level}: {params.data}")

client = MultiServerMCPClient(
    {...},
    callbacks=Callbacks(on_logging_message=on_logging_message),
)
```

### Elicitation (이리시테이션)

[Elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation#elicitation)은 MCP 서버가 도구 실행 중 사용자로부터 추가 입력을 요청할 수 있게 해줍니다. 모든 입력을 사전에 요구하는 대신, 서버는 필요할 때 인터랙티브하게 정보를 요청할 수 있습니다.

#### 서버 설정 (Server setup)

`ctx.elicit()`을 사용하여 스키마와 함께 사용자 입력을 요청하는 도구를 정의합니다.

```python
# elicitation을 사용하는 MCP 서버
from pydantic import BaseModel
from mcp.server.fastmcp import Context, FastMCP

server = FastMCP("Profile")

class UserDetails(BaseModel):
    email: str
    age: int

@server.tool()
async def create_profile(name: str, ctx: Context) -> str:
    """Create a user profile, requesting details via elicitation."""
    result = await ctx.elicit(
        message=f"Please provide details for {name}'s profile:",
        schema=UserDetails,
    )
    if result.action == "accept" and result.data:
        return f"Created profile for {name}: email={result.data.email}, age={result.data.age}"
    if result.action == "decline":
        return f"User declined. Created minimal profile for {name}."
    return "Profile creation cancelled."

if __name__ == "__main__":
    server.run(transport="http")
```

#### 클라이언트 설정 (Client setup)

`MultiServerMCPClient`에 콜백을 제공하여 elicitation 요청을 처리합니다.

```python
# elicitation 요청 처리
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.callbacks import Callbacks, CallbackContext
from mcp.shared.context import RequestContext
from mcp.types import ElicitRequestParams, ElicitResult

async def on_elicitation(
    mcp_context: RequestContext,
    params: ElicitRequestParams,
    context: CallbackContext,
) -> ElicitResult:
    """Handle elicitation requests from MCP servers."""
    # 실제 애플리케이션에서는 params.message와 params.requestedSchema에
    # 따라 사용자에게 입력을 요청하게 됩니다.
    return ElicitResult(
        action="accept",
        content={"email": "user@example.com", "age": 25},
    )

client = MultiServerMCPClient(
    {
        "profile": {
            "url": "http://localhost:8000/mcp",
            "transport": "http",
        }
    },
    callbacks=Callbacks(on_elicitation=on_elicitation),
)
```

#### 응답 액션 (Response actions)

elicitation 콜백은 세 가지 액션 중 하나를 반환할 수 있습니다.

| 액션 | 설명 |
|------|------|
| `accept` | 사용자가 유효한 입력을 제공함. `content` 필드에 데이터 포함. |
| `decline` | 사용자가 요청된 정보 제공을 거부함. |
| `cancel` | 사용자가 작업 자체를 취소함. |

```python
# 응답 액션 예시
# 데이터와 함께 수락
ElicitResult(action="accept", content={"email": "user@example.com", "age": 25})

# 거절 (사용자가 정보 제공을 원하지 않음)
ElicitResult(action="decline")

# 취소 (작업 중단)
ElicitResult(action="cancel")
```

---

## 7. 추가 리소스 (Additional resources)

- [MCP 문서](https://modelcontextprotocol.io/introduction)
- [MCP 전송(Transport) 문서](https://modelcontextprotocol.io/docs/concepts/transports)
- [`langchain-mcp-adapters`](https://github.com/langchain-ai/langchain-mcp-adapters)
