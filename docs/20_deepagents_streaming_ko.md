# 스트리밍 (Streaming)

> 원문: https://docs.langchain.com/oss/python/deepagents/streaming
>
> deep agent 실행과 서브에이전트 실행으로부터 실시간 업데이트 스트리밍

---

## 📖 목차

1. [서브그래프 스트리밍 활성화](#1-서브그래프-스트리밍-활성화-enable-subgraph-streaming)
2. [네임스페이스 (Namespaces)](#2-네임스페이스-namespaces)
3. [서브에이전트 진행률 (Subagent progress)](#3-서브에이전트-진행률-subagent-progress)
4. [LLM 토큰 (LLM tokens)](#4-llm-토큰-llm-tokens)
5. [도구 호출 (Tool calls)](#5-도구-호출-tool-calls)
6. [커스텀 업데이트 (Custom updates)](#6-커스텀-업데이트-custom-updates)
7. [여러 모드 동시 스트리밍 (Stream multiple modes)](#7-여러-모드-동시-스트리밍-stream-multiple-modes)
8. [자주 쓰는 패턴 (Common patterns)](#8-자주-쓰는-패턴-common-patterns)
9. [v2 스트리밍 포맷 (v2 streaming format)](#9-v2-스트리밍-포맷-v2-streaming-format)
10. [관련 자료 (Related)](#10-관련-자료-related)

---

> 💡 새 애플리케이션을 만든다면, Deep Agents v0.6에서 도입된 타입화된 프로젝션 API인 [event streaming](https://docs.langchain.com/oss/python/deepagents/event-streaming)을 권장합니다. Event streaming은 프로젝션별로(서브에이전트, 메시지, 도구 호출, 값) 별도의 이터레이터를 제공하므로 `stream_mode` 청크를 분기하지 않고 각각 독립적으로 소비할 수 있습니다.

Deep Agents는 LangGraph의 스트리밍 인프라 위에 서브에이전트 스트림을 일급 시민으로 지원합니다. deep agent가 작업을 서브에이전트에게 위임하면, 각 서브에이전트의 업데이트를 독립적으로 스트리밍하여 진행률, LLM 토큰, 도구 호출을 실시간으로 추적할 수 있습니다.

deep agent 스트리밍으로 할 수 있는 일:

- **서브에이전트 진행률 스트리밍** — 병렬로 실행되는 각 서브에이전트의 실행을 추적
- **LLM 토큰 스트리밍** — 메인 에이전트와 각 서브에이전트의 토큰을 스트리밍
- **도구 호출 스트리밍** — 서브에이전트 실행 내부의 도구 호출과 결과 확인
- **커스텀 업데이트 스트리밍** — 서브에이전트 노드 내부에서 사용자 정의 신호 발행

---

## 1. 서브그래프 스트리밍 활성화 (Enable subgraph streaming)

Deep Agents는 서브에이전트 실행 이벤트를 표면화하기 위해 LangGraph의 서브그래프 스트리밍을 사용합니다. 서브에이전트 이벤트를 받으려면 스트리밍 시 `stream_subgraphs`를 활성화하세요.

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    system_prompt="You are a helpful research assistant",
    subagents=[
        {
            "name": "researcher",
            "description": "Researches a topic in depth",
            "system_prompt": "You are a thorough researcher.",
        },
    ],
)

for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research quantum computing advances"}]},
    stream_mode="updates",
    subgraphs=True,
    version="v2",
):
    if chunk["type"] == "updates":
        if chunk["ns"]:
            # 서브에이전트 이벤트 - 네임스페이스가 출처를 식별
            print(f"[subagent: {chunk['ns']}]")
        else:
            # 메인 에이전트 이벤트
            print("[main agent]")
        print(chunk["data"])
```

---

## 2. 네임스페이스 (Namespaces)

`subgraphs`가 활성화되면, 각 스트리밍 이벤트는 해당 이벤트를 발생시킨 에이전트를 식별하는 **네임스페이스(namespace)** 를 포함합니다. 네임스페이스는 에이전트 계층 구조를 나타내는 노드 이름과 태스크 ID의 경로입니다.

| 네임스페이스 | 출처 |
|--------------|------|
| `()` (빈 값) | 메인 에이전트 |
| `("tools:abc123",)` | 메인 에이전트의 `task` 도구 호출 `abc123`이 생성한 서브에이전트 |
| `("tools:abc123", "model_request:def456")` | 서브에이전트 내부의 model request 노드 |

네임스페이스를 사용해 이벤트를 올바른 UI 컴포넌트로 라우팅하세요.

```python
for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Plan my vacation"}]},
    stream_mode="updates",
    subgraphs=True,
    version="v2",
):
    if chunk["type"] == "updates":
        # 이 이벤트가 서브에이전트에서 왔는지 확인
        is_subagent = any(
            segment.startswith("tools:") for segment in chunk["ns"]
        )

        if is_subagent:
            # 네임스페이스에서 도구 호출 ID 추출
            tool_call_id = next(
                s.split(":")[1] for s in chunk["ns"] if s.startswith("tools:")
            )
            print(f"Subagent {tool_call_id}: {chunk['data']}")
        else:
            print(f"Main agent: {chunk['data']}")
```

---

## 3. 서브에이전트 진행률 (Subagent progress)

`stream_mode="updates"`를 사용하여 각 단계가 완료될 때마다 서브에이전트의 진행률을 추적할 수 있습니다. 어떤 서브에이전트가 활동 중이며 어떤 작업을 완료했는지 보여줄 때 유용합니다.

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    system_prompt=(
        "You are a project coordinator. Always delegate research tasks "
        "to your researcher subagent using the task tool. Keep your final response to one sentence."
    ),
    subagents=[
        {
            "name": "researcher",
            "description": "Researches topics thoroughly",
            "system_prompt": (
                "You are a thorough researcher. Research the given topic "
                "and provide a concise summary in 2-3 sentences."
            ),
        },
    ],
)

for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Write a short summary about AI safety"}]},
    stream_mode="updates",
    subgraphs=True,
    version="v2",
):
    if chunk["type"] == "updates":
        # 메인 에이전트 업데이트 (빈 네임스페이스)
        if not chunk["ns"]:
            for node_name, data in chunk["data"].items():
                if node_name == "tools":
                    # 서브에이전트 결과가 메인 에이전트로 반환됨
                    for msg in data.get("messages", []):
                        if msg.type == "tool":
                            print(f"\nSubagent complete: {msg.name}")
                            print(f"  Result: {str(msg.content)[:200]}...")
                else:
                    print(f"[main agent] step: {node_name}")

        # 서브에이전트 업데이트 (비어 있지 않은 네임스페이스)
        else:
            for node_name, data in chunk["data"].items():
                print(f"  [{chunk['ns'][0]}] step: {node_name}")
```

```shell
# 출력
[main agent] step: model_request
  [tools:call_abc123] step: model_request
  [tools:call_abc123] step: tools
  [tools:call_abc123] step: model_request

Subagent complete: task
  Result: ## AI Safety Report...
[main agent] step: model_request
```

---

## 4. LLM 토큰 (LLM tokens)

`stream_mode="messages"`를 사용하여 메인 에이전트와 서브에이전트 모두에서 개별 토큰을 스트리밍할 수 있습니다. 각 메시지 이벤트는 출처 에이전트를 식별할 수 있는 메타데이터를 포함합니다.

```python
current_source = ""

for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research quantum computing advances"}]},
    stream_mode="messages",
    subgraphs=True,
    version="v2",
):
    if chunk["type"] == "messages":
        token, metadata = chunk["data"]

        # 이 이벤트가 서브에이전트에서 왔는지 확인 (네임스페이스에 "tools:" 포함)
        is_subagent = any(s.startswith("tools:") for s in chunk["ns"])

        if is_subagent:
            # 서브에이전트의 토큰
            subagent_ns = next(s for s in chunk["ns"] if s.startswith("tools:"))
            if subagent_ns != current_source:
                print(f"\n\n--- [subagent: {subagent_ns}] ---")
                current_source = subagent_ns
            if token.content:
                print(token.content, end="", flush=True)
        else:
            # 메인 에이전트의 토큰
            if "main" != current_source:
                print("\n\n--- [main agent] ---")
                current_source = "main"
            if token.content:
                print(token.content, end="", flush=True)

print()
```

---

## 5. 도구 호출 (Tool calls)

서브에이전트가 도구를 사용할 때, 도구 호출 이벤트를 스트리밍하여 각 서브에이전트가 무엇을 하고 있는지 표시할 수 있습니다. 도구 호출 청크는 `messages` 스트림 모드에 나타납니다.

```python
for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research recent quantum computing advances"}]},
    stream_mode="messages",
    subgraphs=True,
    version="v2",
):
    if chunk["type"] == "messages":
        token, metadata = chunk["data"]

        # 출처 식별: "main" 또는 서브에이전트 네임스페이스 세그먼트
        is_subagent = any(s.startswith("tools:") for s in chunk["ns"])
        source = next((s for s in chunk["ns"] if s.startswith("tools:")), "main") if is_subagent else "main"

        # 도구 호출 청크 (스트리밍 도구 호출)
        if token.tool_call_chunks:
            for tc in token.tool_call_chunks:
                if tc.get("name"):
                    print(f"\n[{source}] Tool call: {tc['name']}")
                # 인자(args)는 청크 단위로 스트리밍됨 - 증분적으로 출력
                if tc.get("args"):
                    print(tc["args"], end="", flush=True)

        # 도구 결과
        if token.type == "tool":
            print(f"\n[{source}] Tool result [{token.name}]: {str(token.content)[:150]}")

        # 일반 AI 콘텐츠 (도구 호출 메시지는 스킵)
        if token.type == "ai" and token.content and not token.tool_call_chunks:
            print(token.content, end="", flush=True)

print()
```

---

## 6. 커스텀 업데이트 (Custom updates)

서브에이전트 도구 내부에서 [`get_stream_writer`](https://reference.langchain.com/python/langgraph/config/get_stream_writer)를 사용해 커스텀 진행 이벤트를 발행할 수 있습니다.

```python
import time
from langchain.tools import tool
from langgraph.config import get_stream_writer
from deepagents import create_deep_agent


@tool
def analyze_data(topic: str) -> str:
    """Run a data analysis on a given topic.

    This tool performs the actual analysis and emits progress updates.
    You MUST call this tool for any analysis request.
    """
    writer = get_stream_writer()

    writer({"status": "starting", "topic": topic, "progress": 0})
    time.sleep(0.5)

    writer({"status": "analyzing", "progress": 50})
    time.sleep(0.5)

    writer({"status": "complete", "progress": 100})
    return (
        f'Analysis of "{topic}": Customer sentiment is 85% positive, '
        "driven by product quality and support response times."
    )


agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    system_prompt=(
        "You are a coordinator. For any analysis request, you MUST delegate "
        "to the analyst subagent using the task tool. Never try to answer directly. "
        "After receiving the result, summarize it in one sentence."
    ),
    subagents=[
        {
            "name": "analyst",
            "description": "Performs data analysis with real-time progress tracking",
            "system_prompt": (
                "You are a data analyst. You MUST call the analyze_data tool "
                "for every analysis request. Do not use any other tools. "
                "After the analysis completes, report the result."
            ),
            "tools": [analyze_data],
        },
    ],
)

for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Analyze customer satisfaction trends"}]},
    stream_mode="custom",
    subgraphs=True,
    version="v2",
):
    if chunk["type"] == "custom":
        is_subagent = any(s.startswith("tools:") for s in chunk["ns"])
        if is_subagent:
            subagent_ns = next(s for s in chunk["ns"] if s.startswith("tools:"))
            print(f"[{subagent_ns}]", chunk["data"])
        else:
            print("[main]", chunk["data"])
```

```shell
# 출력
[tools:call_abc123] {'status': 'starting', 'topic': 'customer satisfaction trends', 'progress': 0}
[tools:call_abc123] {'status': 'analyzing', 'progress': 50}
[tools:call_abc123] {'status': 'complete', 'progress': 100}
```

---

## 7. 여러 모드 동시 스트리밍 (Stream multiple modes)

여러 스트림 모드를 결합하여 에이전트 실행의 전체 그림을 얻을 수 있습니다.

```python
# 내부 미들웨어 단계는 건너뛰고 의미 있는 노드 이름만 표시
INTERESTING_NODES = {"model_request", "tools"}

last_source = ""
mid_line = False  # 토큰을 출력하고 줄바꿈을 아직 하지 않은 경우 True

for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Analyze the impact of remote work on team productivity"}]},
    stream_mode=["updates", "messages", "custom"],
    subgraphs=True,
    version="v2",
):
    is_subagent = any(s.startswith("tools:") for s in chunk["ns"])
    source = "subagent" if is_subagent else "main"

    if chunk["type"] == "updates":
        for node_name in chunk["data"]:
            if node_name not in INTERESTING_NODES:
                continue
            if mid_line:
                print()
                mid_line = False
            print(f"[{source}] step: {node_name}")

    elif chunk["type"] == "messages":
        token, metadata = chunk["data"]
        if token.content:
            # 출처가 바뀔 때 헤더 출력
            if source != last_source:
                if mid_line:
                    print()
                    mid_line = False
                print(f"\n[{source}] ", end="")
                last_source = source
            print(token.content, end="", flush=True)
            mid_line = True

    elif chunk["type"] == "custom":
        if mid_line:
            print()
            mid_line = False
        print(f"[{source}] custom event:", chunk["data"])

print()
```

---

## 8. 자주 쓰는 패턴 (Common patterns)

### 서브에이전트 라이프사이클 추적 (Track subagent lifecycle)

서브에이전트가 언제 시작·실행·완료되는지 모니터링합니다.

```python
active_subagents = {}

for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research the latest AI safety developments"}]},
    stream_mode="updates",
    subgraphs=True,
    version="v2",
):
    if chunk["type"] == "updates":
        for node_name, data in chunk["data"].items():
            # ─── Phase 1: 서브에이전트 시작 감지 ────────────────────────
            # 메인 에이전트의 model_request에 task 도구 호출이 포함되면,
            # 서브에이전트가 생성되었음을 의미합니다.
            if not chunk["ns"] and node_name == "model_request":
                for msg in data.get("messages", []):
                    for tc in getattr(msg, "tool_calls", []):
                        if tc["name"] == "task":
                            active_subagents[tc["id"]] = {
                                "type": tc["args"].get("subagent_type"),
                                "description": tc["args"].get("description", "")[:80],
                                "status": "pending",
                            }
                            print(
                                f'[lifecycle] PENDING  → subagent "{tc["args"].get("subagent_type")}" '
                                f'({tc["id"]})'
                            )

            # ─── Phase 2: 서브에이전트 실행 감지 ─────────────────────────
            # tools:UUID 네임스페이스로부터 이벤트가 들어오면 해당 서브에이전트가
            # 실제로 실행 중임을 의미합니다.
            if chunk["ns"] and chunk["ns"][0].startswith("tools:"):
                pregel_id = chunk["ns"][0].split(":")[1]
                # 어떤 pending 서브에이전트를 running으로 마킹할지 결정합니다.
                # 참고: pregel 태스크 ID와 tool_call_id는 다르므로,
                # 첫 서브에이전트 이벤트에서 임의의 pending 서브에이전트를 running으로 표시합니다.
                for sub_id, sub in active_subagents.items():
                    if sub["status"] == "pending":
                        sub["status"] = "running"
                        print(
                            f'[lifecycle] RUNNING  → subagent "{sub["type"]}" '
                            f"(pregel: {pregel_id})"
                        )
                        break

            # ─── Phase 3: 서브에이전트 완료 감지 ──────────────────────────
            # 메인 에이전트의 tools 노드가 tool 메시지를 반환하면
            # 서브에이전트가 완료되어 결과를 반환했음을 의미합니다.
            if not chunk["ns"] and node_name == "tools":
                for msg in data.get("messages", []):
                    if msg.type == "tool":
                        sub = active_subagents.get(msg.tool_call_id)
                        if sub:
                            sub["status"] = "complete"
                            print(
                                f'[lifecycle] COMPLETE → subagent "{sub["type"]}" '
                                f"({msg.tool_call_id})"
                            )
                            print(f"  Result preview: {str(msg.content)[:120]}...")

# 최종 상태 출력
print("\n--- Final subagent states ---")
for sub_id, sub in active_subagents.items():
    print(f"  {sub['type']}: {sub['status']}")
```

---

## 9. v2 스트리밍 포맷 (v2 streaming format)

> ℹ️ LangGraph >= 1.1 이 필요합니다.

이 페이지의 모든 예시는 v2 스트리밍 포맷(`version="v2"`)을 사용하며, 이는 권장 방식입니다. 모든 청크는 `type`, `ns`, `data` 키를 가진 `StreamPart` dict이며, 스트림 모드, 모드 개수, 서브그래프 설정과 무관하게 동일한 형태를 가집니다.

v2 포맷은 중첩 튜플 언패킹을 없애 Deep Agents에서 서브그래프 스트리밍을 다루는 일을 단순화합니다. 두 포맷을 비교해 보세요.

```python
# v2 (권장)
# 통일된 포맷 — 중첩 튜플 언패킹 없음
for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research quantum computing"}]},
    stream_mode=["updates", "messages", "custom"],
    subgraphs=True,
    version="v2",
):
    print(chunk["type"])  # "updates", "messages", 또는 "custom"
    print(chunk["ns"])    # 메인 에이전트는 ()  서브에이전트는 ("tools:<id>",)
    print(chunk["data"])  # 페이로드
```

```python
# v1 (레거시)
# (namespace, (mode, data)) 중첩 튜플을 처리해야 함
for namespace, chunk in agent.stream(
    {"messages": [{"role": "user", "content": "Research quantum computing"}]},
    stream_mode=["updates", "messages", "custom"],
    subgraphs=True,
):
    mode, data = chunk[0], chunk[1]
    print(mode)       # "updates", "messages", 또는 "custom"
    print(namespace)  # 메인 에이전트는 ()  서브에이전트는 ("tools:<id>",)
    print(data)       # 페이로드
```

v2 포맷의 타입 좁히기(type narrowing), Pydantic/dataclass 강제 변환(coercion) 등 자세한 내용은 [LangGraph streaming docs](https://docs.langchain.com/oss/python/langgraph/streaming#stream-output-format-v2)를 참고하세요.

---

## 10. 관련 자료 (Related)

- [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents) — Deep Agents에서 서브에이전트 구성 및 사용
- [Frontend streaming](https://docs.langchain.com/oss/python/deepagents/streaming/frontend) — Deep Agents용 `useStream`을 사용해 React UI 구축
- [LangChain Event Streaming](https://docs.langchain.com/oss/python/langchain/event-streaming) — LangChain 에이전트의 일반 스트리밍 개념
