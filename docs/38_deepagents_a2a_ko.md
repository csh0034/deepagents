# Agent Server의 A2A 엔드포인트 (A2A endpoint in Agent Server)

> 원문: https://docs.langchain.com/oss/python/deepagents/a2a
>
> A2A 프로토콜로 에이전트 간(agent-to-agent) 통신을 활성화하고, LangSmith에서 분산 트레이싱(distributed tracing)을 수행합니다.

---

## 📌 A2A란?

[Agent2Agent (A2A)](https://a2a-protocol.org/latest/)는 대화형 AI 에이전트 간 통신을 가능하게 하는 Google의 프로토콜입니다. [LangSmith는 A2A 지원을 구현](https://docs.langchain.com/langsmith/server-api-ref#tag/a2a/post/a2a/\{assistant_id})하여, 여러분의 에이전트가 표준화된 프로토콜을 통해 다른 A2A 호환 에이전트와 통신할 수 있게 합니다.

A2A 엔드포인트는 [Agent Server](https://docs.langchain.com/langsmith/agent-server)에서 `/a2a/{assistant_id}` 경로로 제공됩니다.

---

## 🛠️ 지원되는 메서드 (Supported methods)

Agent Server는 다음 A2A RPC 메서드들을 지원합니다.

- **message/send**: assistant에게 메시지를 전송하고 완전한 응답을 수신
- **message/stream**: 메시지를 전송하고 Server-Sent Events(SSE)를 통해 응답을 실시간 스트리밍
- **tasks/get**: 이전에 생성된 task의 상태와 결과를 조회

---

## 🔍 Agent card discovery

각 assistant는 자신의 기능을 설명하고 다른 에이전트가 연결하는 데 필요한 정보를 제공하는 A2A Agent Card를 자동으로 노출합니다. 다음과 같이 임의의 assistant의 agent card를 조회할 수 있습니다.

```
GET /.well-known/agent-card.json?assistant_id={assistant_id}
```

agent card에는 assistant의 이름, 설명, 사용 가능한 스킬, 지원되는 입력/출력 모드, 통신용 A2A 엔드포인트 URL이 포함됩니다.

---

## ⚙️ 요구 사항 (Requirements)

A2A를 사용하려면 다음 의존성을 설치해야 합니다.

- `langgraph-api >= 0.4.21`

설치 명령:

```bash
pip install "langgraph-api>=0.4.21"
```

---

## 🚀 사용 흐름 개요 (Usage overview)

A2A를 활성화하려면 다음을 수행하세요.

- `langgraph-api>=0.4.21`로 업그레이드합니다.
- 메시지 기반(message-based) 상태 구조를 가진 에이전트를 배포합니다.
- 엔드포인트를 사용하여 다른 A2A 호환 에이전트와 연결합니다.

---

## 🧩 A2A 호환 에이전트 만들기 (Creating an A2A-compatible agent)

이 예시는 OpenAI의 API를 사용하여 들어오는 메시지를 처리하고 대화 상태를 유지하는 A2A 호환 에이전트를 생성합니다. 에이전트는 메시지 기반 상태 구조를 정의하고 A2A 프로토콜의 메시지 형식을 처리합니다.

[A2A "text" parts](https://a2a-protocol.org/dev/specification/#651-textpart-object)와 호환되려면, 에이전트의 state에 반드시 `messages` 키가 있어야 합니다.

A2A 프로토콜은 대화 연속성을 유지하기 위해 두 가지 식별자를 사용합니다.

- `contextId`: 메시지들을 하나의 대화 스레드로 그룹화합니다(세션 ID와 유사).
- `taskId`: 해당 대화 안의 각 개별 요청을 식별합니다.

첫 메시지에서는 `contextId`와 `taskId`를 생략합니다 — 에이전트가 이를 생성하여 반환합니다. 이후 대화의 모든 메시지에서는 이전 응답의 `contextId`와 `taskId`를 포함시켜 스레드 연속성을 유지하세요.

**LangSmith 트레이싱:** LangSmith Deployment의 A2A 엔드포인트는 A2A `contextId`를 LangSmith 트레이싱용 `thread_id`로 자동 변환하여, 한 대화의 모든 메시지를 단일 스레드 하나에 묶어줍니다.

예시:

```python
"""LangGraph A2A conversational agent.

Supports the A2A protocol with messages input for conversational interactions.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, List, TypedDict

from langgraph.graph import StateGraph
from langgraph.runtime import Runtime
from openai import AsyncOpenAI


class Context(TypedDict):
    """Context parameters for the agent."""
    my_configurable_param: str


@dataclass
class State:
    """Input state for the agent.

    Defines the initial structure for A2A conversational messages.
    """
    messages: List[Dict[str, Any]]


async def call_model(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    """Process conversational messages and returns output using OpenAI."""
    # Initialize OpenAI client
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Process the incoming messages
    latest_message = state.messages[-1] if state.messages else {}
    user_content = latest_message.get("content", "No message content")

    # Create messages for OpenAI API
    openai_messages = [
        {
            "role": "system",
            "content": "You are a helpful conversational agent. Keep responses brief and engaging."
        },
        {
            "role": "user",
            "content": user_content
        }
    ]

    try:
        # Make OpenAI API call
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=openai_messages,
            max_tokens=100,
            temperature=0.7
        )

        ai_response = response.choices[0].message.content

    except Exception as e:
        ai_response = f"I received your message but had trouble processing it. Error: {str(e)[:50]}..."

    # Create a response message
    response_message = {
        "role": "assistant",
        "content": ai_response
    }

    return {
        "messages": state.messages + [response_message]
    }


# Define the graph
graph = (
    StateGraph(State, context_schema=Context)
    .add_node(call_model)
    .add_edge("__start__", "call_model")
    .compile()
)
```

---

## 🤖 에이전트 간 통신 (Agent-to-agent communication)

`langgraph dev`로 로컬에서 에이전트를 실행 중이거나 [프로덕션에 배포](https://docs.langchain.com/langsmith/deployment)했다면, A2A 프로토콜을 사용해 에이전트 간 통신을 구현할 수 있습니다.

다음 예시는 두 에이전트가 서로의 A2A 엔드포인트에 JSON-RPC 메시지를 보내며 통신하는 모습을 보여줍니다. 스크립트는 각 에이전트가 상대의 응답을 처리하고 대화를 이어가는 다중 턴(multi-turn) 대화를 시뮬레이션합니다.

```python
#!/usr/bin/env python3
"""Agent-to-Agent conversation simulation using the LangGraph A2A endpoint."""

import asyncio
import aiohttp
import os
import uuid


def extract_text(result: dict) -> str:
    """Best-effort extraction of response text from an A2A result."""
    for art in result.get("result", {}).get("artifacts", []) or []:
        for part in art.get("parts", []) or []:
            if part.get("kind") == "text" and part.get("text"):
                return part["text"]

    msg = (result.get("result", {}).get("status", {}) or {}).get("message", {}) or {}
    for part in msg.get("parts", []) or []:
        if part.get("kind") == "text" and part.get("text"):
            return part["text"]

    return "(no text found)"


async def send_message(session, port, assistant_id, text, context_id=None, task_id=None):
    """Send an A2A message. Returns (response_text, returned_context_id, returned_task_id)."""
    url = f"http://127.0.0.1:{port}/a2a/{assistant_id}"

    message = {
        "role": "user",
        "parts": [{"kind": "text", "text": text}],
        "messageId": str(uuid.uuid4()),
    }

    # A2A multi-turn continuity: reuse contextId and taskId across turns/agents
    if context_id:
        message["contextId"] = context_id
    if task_id:
        message["taskId"] = task_id

    payload = {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": "message/send",
        "params": {"message": message},
    }

    headers = {"Accept": "application/json"}
    async with session.post(url, json=payload, headers=headers) as response:
        result = await response.json()

    returned_context_id = result.get("result", {}).get("contextId") or context_id
    returned_task_id = result.get("result", {}).get("id")
    return extract_text(result), returned_context_id, returned_task_id


async def simulate_conversation():
    """Simulate a conversation between two agents."""

    #Assistant IDs
    agent_a_id = os.getenv("AGENT_A_ID")
    agent_b_id = os.getenv("AGENT_B_ID")

    if not agent_a_id or not agent_b_id:
        print("Set AGENT_A_ID and AGENT_B_ID environment variables")
        return

    message = "Hello! Let's have a conversation."
    context_id = None
    task_id = None

    async with aiohttp.ClientSession() as session:
        for i in range(3):
            print(f"--- Round {i + 1} ---")

            message, context_id, task_id = await send_message(
                session, 2024, agent_a_id, message,
                context_id=context_id,
                task_id=task_id,
            )
            print(f"🔵 Agent A: {message}")

            message, context_id, task_id = await send_message(
                session, 2025, agent_b_id, message,
                context_id=context_id,
                task_id=task_id,
            )
            print(f"🔴 Agent B: {message}\n")


if __name__ == "__main__":
    asyncio.run(simulate_conversation())
```

완전히 동작하는 예시는 아래를 참고하세요.

- [두 LangGraph 에이전트 간 통신](https://github.com/langchain-samples/A2A-langgraph) — A2A 프로토콜을 사용하는 두 LangGraph 에이전트 예시
- [Google ADK 에이전트와 LangChain 에이전트](https://github.com/langchain-samples/A2A-google-adk) — A2A 프로토콜을 사용해 Google ADK 에이전트가 LangChain 에이전트와 통신하는 예시

---

## 📡 분산 트레이싱 (Distributed tracing)

여러 에이전트가 A2A로 통신할 때, LangSmith는 모든 [트레이스(traces)](https://docs.langchain.com/langsmith/observability-concepts#traces)를 하나의 [스레드(thread)](https://docs.langchain.com/langsmith/observability-concepts#threads)로 그룹화하여, 전체 멀티 에이전트 대화에 대한 통합된 뷰를 제공합니다.

### contextId가 thread_id에 매핑되는 방식

Agent Server의 A2A 엔드포인트는 LangSmith 트레이싱을 위해 A2A `contextId`를 `thread_id`로 자동 변환합니다. 즉, 모든 참여 에이전트에 걸쳐 한 대화 내 모든 메시지는 추가 설정 없이도 LangSmith에서 동일한 스레드 아래로 그룹화됩니다.

흐름은 다음과 같습니다.

1. 첫 메시지에서 클라이언트는 `contextId`를 생략합니다. 서버가 이를 생성하여 응답에 반환합니다.
2. 클라이언트는 대화 연속성을 유지하기 위해 이후 모든 메시지에 `contextId`를 전달합니다.
3. Agent Server는 LangSmith [메타데이터](https://docs.langchain.com/langsmith/add-metadata-tags)에서 `contextId`를 `thread_id`로 매핑하여 모든 턴이 동일한 스레드에 표시되도록 합니다.

### 여러 에이전트 간 트레이싱

서로 다른 프레임워크의 에이전트들이 A2A로 통신할 때, 모든 에이전트가 동일한 `thread_id`를 공유하도록 하면 LangSmith에서 트레이스들을 통합할 수 있습니다. 첫 번째 에이전트가 반환한 `contextId`를 이후 모든 요청의 `thread_id`로 사용하세요.

아래 코드는 핵심 개념을 보여줍니다. 두 에이전트로 구성된 실행 가능한 완전한 구현은 [Google ADK + LangChain 예시](https://github.com/langchain-samples/A2A-google-adk/blob/main/test_agent_conversation.py)를 참고하세요.

```python
import asyncio
import aiohttp
import uuid


async def send_message(session, url, text, context_id=None, task_id=None, thread_id=None):
    """Send an A2A message and return (response_text, context_id, task_id)."""

    # --- 1. Build the message ---
    # On follow-up turns, include contextId and taskId inside the message object
    # so the server associates them with the ongoing conversation.
    message = {
        "role": "user",
        "parts": [{"kind": "text", "text": text}],
        "messageId": str(uuid.uuid4()),
    }
    if context_id:
        message["contextId"] = context_id
    if task_id:
        message["taskId"] = task_id

    # --- 2. Set thread_id in metadata ---
    # thread_id goes at the top level of the JSON-RPC payload, not inside params.
    payload = {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": "message/send",
        "params": {"message": message},
        "metadata": {"thread_id": thread_id},
    }

    async with session.post(url, json=payload, headers={"Accept": "application/json"}) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}: {await response.text()}")
        result = await response.json()

    if "error" in result:
        raise RuntimeError(result["error"].get("message", "Unknown error"))

    result_obj = result.get("result", {})
    returned_context_id = result_obj.get("contextId") or context_id
    returned_task_id = result_obj.get("id")
    text_out = next(
        (
            part.get("text", "")
            for art in result_obj.get("artifacts", []) or []
            for part in art.get("parts", []) or []
            if part.get("kind") == "text"
        ),
        "(no text)",
    )
    return text_out, returned_context_id, returned_task_id


async def run_conversation(agent_a_url, agent_b_url):
    # --- 3. Share thread_id across agents ---
    # Generate a shared thread_id upfront. Once the server returns a contextId,
    # use that instead — this keeps the A2A context and LangSmith thread in sync.
    thread_id = str(uuid.uuid4())
    context_id = None
    task_id = None
    message = "Hello! Let's collaborate."

    async with aiohttp.ClientSession() as session:
        for _ in range(3):
            message, context_id, task_id = await send_message(
                session, agent_a_url, message,
                context_id=context_id, task_id=task_id,
                thread_id=context_id or thread_id,
            )

            # Passing the same thread_id to every agent groups all traces in LangSmith
            message, context_id, task_id = await send_message(
                session, agent_b_url, message,
                context_id=context_id, task_id=task_id,
                thread_id=context_id or thread_id,
            )


asyncio.run(run_conversation(
    "http://localhost:2024/a2a/<agent_a_assistant_id>",
    "http://localhost:2025/a2a/<agent_b_assistant_id>",
))
```

**1. 메시지 구성**: 이후 턴에서는 `contextId`와 `taskId`를 `message` 객체 안에 포함시켜 서버가 진행 중인 대화와 연관 짓도록 합니다. 첫 메시지에서는 생략하세요. 서버가 `contextId`를 생성하여 응답에 반환합니다.

**2. metadata에 thread_id 설정**: JSON-RPC payload의 최상위 `metadata` 필드에 `thread_id`를 전달합니다. `params` 안에 두지 마세요.

**3. 에이전트 간 thread_id 공유**: 첫 메시지 전송 전 무작위 `thread_id`를 생성합니다. 서버가 `contextId`를 반환하면 이후 모든 요청의 `thread_id`로 이를 사용하여, A2A 대화 컨텍스트와 LangSmith 스레드를 동기화합니다. 동일한 `thread_id`를 모든 에이전트에 전달하여 모든 트레이스가 하나의 스레드로 그룹화되도록 합니다.

### LangGraph가 아닌 에이전트에서 thread_id 수신하기

[앞 섹션](#여러-에이전트-간-트레이싱)은 클라이언트 측 — 메시지를 보낼 때 `thread_id`를 전파하는 방법 — 을 다루었습니다. 만약 에이전트 중 하나가 LangGraph 기반이 아니라면, 수신 측에서도 `thread_id`를 추출해서 트레이스에 부착해야 동일한 LangSmith 스레드에 들어갑니다. `langsmith.integrations.otel.configure()`로 자동 트레이싱을 설정하고, 들어오는 A2A 요청 메타데이터에서 `thread_id`를 추출하여 동일 스레드로 그룹화합니다.

```python
from fastapi import FastAPI, Request
from langsmith.integrations.otel import configure as configure_otel
from opentelemetry import trace
import json

# --- 1. Configure OTel ---
# Set up automatic tracing to LangSmith for your non-LangGraph agent.
configure_otel(project_name="my-a2a-project")
tracer = trace.get_tracer(__name__)

app = FastAPI()

@app.middleware("http")
async def set_thread_id_middleware(request: Request, call_next):
    thread_id = None
    if request.method == "POST":
        body_bytes = await request.body()
        if body_bytes:
            # --- 2. Extract thread_id from incoming A2A metadata ---
            try:
                body = json.loads(body_bytes)
                thread_id = body.get("metadata", {}).get("thread_id")
            except Exception:
                pass
            # Re-inject the body so downstream handlers can still read it
            async def receive():
                return {"type": "http.request", "body": body_bytes}
            request._receive = receive

    # --- 3. Attach thread_id to the trace ---
    # langsmith.metadata.thread_id groups this trace with others in the same thread.
    with tracer.start_as_current_span("agent") as span:
        if thread_id:
            span.set_attribute("langsmith.metadata.thread_id", thread_id)
        return await call_next(request)
```

이 미들웨어 등록 이후에 에이전트 라우트를 `app`에 등록하세요.

> ℹ️ 트레이싱을 활성화하려면 환경에 `LANGSMITH_API_KEY`를 설정하고, 선택적으로 `LANGSMITH_PROJECT`를 설정하세요. 대화에 참여하는 모든 에이전트는 동일한 프로젝트를 사용해야 트레이스를 함께 볼 수 있습니다.

### LangSmith에서 트레이스 보기

멀티 에이전트 대화를 실행한 후 [LangSmith UI](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=langsmith-server-a2a)를 열고 **Threads**로 이동하세요. 모든 참여 에이전트의 모든 턴이 공유 `thread_id`로 식별되는 단일 스레드 아래에 표시됩니다.

---

## 🔒 A2A 비활성화 (Disable A2A)

A2A 엔드포인트를 비활성화하려면 `langgraph.json` 설정 파일에서 `disable_a2a`를 `true`로 설정합니다.

```json
{
  "$schema": "https://langgra.ph/schema.json",
  "http": {
    "disable_a2a": true
  }
}
```
