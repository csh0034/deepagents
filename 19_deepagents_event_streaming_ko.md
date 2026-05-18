# 이벤트 스트리밍 (Event streaming)

> 원문: https://docs.langchain.com/oss/python/deepagents/event-streaming
>
> Deep Agents의 서브에이전트, 메시지, 도구 호출, 최종 출력 스트리밍

---

## 📖 목차

1. [서브에이전트 스트리밍 (Stream subagents)](#1-서브에이전트-스트리밍-stream-subagents)
2. [서브에이전트 스트림 필드 (Subagent stream fields)](#2-서브에이전트-스트림-필드-subagent-stream-fields)
3. [서브에이전트 라이프사이클 추적 (Track subagent lifecycle)](#3-서브에이전트-라이프사이클-추적-track-subagent-lifecycle)
4. [메시지 스트리밍 (Stream messages)](#4-메시지-스트리밍-stream-messages)
5. [도구 호출 스트리밍 (Stream tool calls)](#5-도구-호출-스트리밍-stream-tool-calls)
6. [중첩된 작업 스트리밍 (Stream nested work)](#6-중첩된-작업-스트리밍-stream-nested-work)
7. [동시 소비 (Consume concurrently)](#7-동시-소비-consume-concurrently)
8. [서브에이전트 vs 서브그래프 (Subagents versus subgraphs)](#8-서브에이전트-vs-서브그래프-subagents-versus-subgraphs)
9. [관련 자료 (Related)](#9-관련-자료-related)

---

이 페이지는 Deep Agents 고유의 스트리밍 관심사를 다루며, 가장 중요한 것은 `stream.subagents`를 통해 위임된 서브에이전트로부터 스트리밍하는 방법입니다. 일반적인 에이전트 스트리밍(`stream.messages`, `stream.values`, 도구 호출, 커스텀 업데이트)은 [LangChain Event Streaming](https://docs.langchain.com/oss/python/langchain/event-streaming)을 참고하세요.

---

## 1. 서브에이전트 스트리밍 (Stream subagents)

Deep Agents는 LangGraph 스트리밍 위에 서브에이전트 프로젝션을 추가합니다. 위임된 `task` 호출당 하나의 스트림 핸들을 원할 때 `stream.subagents`를 사용하세요. 이 프로젝션은 경량입니다. 먼저 서브에이전트 태스크를 발견하고, 메시지·도구 호출·값 스트림은 개별 서브에이전트 핸들에서 접근할 때에만 열립니다.

```python
stream = agent.stream_events({
    "messages": [{"role": "user", "content": "Write me a haiku about the sea"}],
}, version="v3")

for subagent in stream.subagents:
    print(subagent.name, subagent.path, subagent.status)

    for message in subagent.messages:
        print(message.text)
```

---

## 2. 서브에이전트 스트림 필드 (Subagent stream fields)

각 서브에이전트 스트림은 메시지, 도구 호출, 중첩 서브에이전트, 최종 출력 등 부모 실행과 동일한 종류의 프로젝션을 제공합니다. 부모 실행 스트리밍의 일반 모델에 대해서는 [LangChain Event Streaming](https://docs.langchain.com/oss/python/langchain/event-streaming)을 참고하세요.

Python은 `tool_calls` 같은 snake_case 프로젝션 이름을 사용합니다. 각 서브에이전트 스트림은 `.messages`, `.tool_calls`, `.values`, `.subagents`, `.output`을 노출할 수 있습니다.

| 필드 | 설명 |
|------|------|
| `name` | 서브에이전트 이름 |
| `messages` | 서브에이전트가 발생시킨 메시지 |
| `subagents` | 중첩된 서브에이전트 호출 |
| `output` | 서브에이전트의 최종 상태, 또는 위임 작업의 완료 신호 |
| `path` | 서브에이전트 스트림의 네임스페이스 경로 |
| `status` | `started`, `completed`, `failed`, `interrupted` 같은 라이프사이클 상태 |
| `tool_calls` | 서브에이전트에 한정된 도구 호출 |

---

## 3. 서브에이전트 라이프사이클 추적 (Track subagent lifecycle)

어떤 서브에이전트가 시작되고 종료되었는지만 보여주면 되는 경우 `stream.subagents`를 사용하세요. 개별 서브에이전트의 메시지나 값 프로젝션에 접근하지 않는 한 그 스트림에 구독할 필요는 없습니다.

```python
stream = agent.stream_events(input, version="v3")

running = 0
completed = 0
failed = 0

for subagent in stream.subagents:
    running += 1
    print(f"{subagent.name}: started")

    try:
        _ = subagent.output
        running -= 1
        completed += 1
        print(f"{subagent.name}: completed")
    except Exception:
        running -= 1
        failed += 1
        print(f"{subagent.name}: failed")
```

---

## 4. 메시지 스트리밍 (Stream messages)

Deep Agents는 코디네이터(coordinator) 에이전트와 위임된 서브에이전트로부터 메시지를 발생시킬 수 있습니다. 상위 수준 메시지에는 `stream.messages`, 위임된 각 서브에이전트에는 `subagent.messages`를 사용하세요.

```python
stream = agent.stream_events(input, version="v3")

for message in stream.messages:
    print("[coordinator]", message.text)

for subagent in stream.subagents:
    for message in subagent.messages:
        print(f"[{subagent.name}]", message.text)
```

---

## 5. 도구 호출 스트리밍 (Stream tool calls)

Deep Agents는 에이전트 트리의 각 레벨에서 도구 호출을 노출합니다. 코디네이터 도구에는 상위 수준 `stream.tool_calls`를, 위임된 작업에는 각 `subagent.tool_calls`를 사용하세요.

```python
stream = agent.stream_events(input, version="v3")

for call in stream.tool_calls:
    print("[coordinator tool]", call.tool_name, call.input)
    print(call.completed, call.error)

for subagent in stream.subagents:
    for call in subagent.tool_calls:
        print(f"[{subagent.name} tool]", call.tool_name, call.input)
        for delta in call.output_deltas:
            print(delta, end="", flush=True)

        if call.completed and call.error is None:
            print(call.output)
        elif call.error is not None:
            print(call.error)
```

---

## 6. 중첩된 작업 스트리밍 (Stream nested work)

서브에이전트 스트림으로 재귀적으로 들어가 중첩된 서브에이전트, 메시지, 도구 호출을 관찰할 수 있습니다.

```python
stream = agent.stream_events(input, version="v3")

for subagent in stream.subagents:
    print(f"subagent {subagent.name}: {subagent.status}")

    for tool_call in subagent.tool_calls:
        print(f"{tool_call.tool_name}({tool_call.input})")
        for delta in tool_call.output_deltas:
            print(delta, end="", flush=True)

    for nested in subagent.subagents:
        print(f"nested subagent {nested.name}: {nested.status}")
```

---

## 7. 동시 소비 (Consume concurrently)

코디네이터와 서브에이전트의 출력은 종종 교차됩니다. 실시간 UI 업데이트가 필요할 때는 프로젝션을 동시에 소비하세요.

비동기 코드에서 동시 소비를 위해서는 `astream_events`와 `asyncio.gather`를 사용하세요.

```python
import asyncio

stream = await agent.astream_events(input, version="v3")

async def consume_coordinator():
    async for message in stream.messages:
        print("[coordinator]", await message.text)

async def consume_subagents():
    async for subagent in stream.subagents:
        async for message in subagent.messages:
            print(f"[{subagent.name}]", await message.text)

await asyncio.gather(consume_coordinator(), consume_subagents())
```

동기 코드에서는 대신 `stream.interleave(...)`를 사용하세요.

```python
stream = agent.stream_events(input, version="v3")

for name, item in stream.interleave("messages", "subagents"):
    if name == "messages":
        print("[coordinator]", item.text)
    else:
        for message in item.messages:
            print(f"[{item.name}]", message.text)
```

코디네이터와 모든 서브에이전트에 대해 정확한 도착 순서가 필요하다면, 원시(raw) 프로토콜 이벤트를 직접 이터레이트하고 `namespace`로 출처를 식별하세요.

```python
stream = agent.stream_events(input, version="v3")

for event in stream:
    if event.get("method") != "messages":
        continue

    payload = event["params"]["data"][0]
    if not isinstance(payload, dict):
        continue
    if payload.get("event") != "content-block-delta":
        continue

    block = payload.get("delta") or {}
    if block.get("type") == "text-delta":
        source = "subagent" if event["params"]["namespace"] else "coordinator"
        print(f"[{source}] {block['text']}")
```

---

## 8. 서브에이전트 vs 서브그래프 (Subagents versus subgraphs)

`stream.subgraphs`는 그래프 실행 구조를 보여줍니다. `stream.subagents`는 제품 레벨의 Deep Agents 태스크 위임을 보여줍니다. 사용자에게 보여지는 UI에는 내부 그래프 노드를 숨기고 서브에이전트 개념을 직접 노출하는 `stream.subagents`를 사용하세요.

---

## 9. 관련 자료 (Related)

- [LangChain Event Streaming](https://docs.langchain.com/oss/python/langchain/event-streaming) — 일반 에이전트 메시지 및 도구 호출 스트리밍 개념
- [Subagent frontend streaming](https://docs.langchain.com/oss/python/deepagents/frontend/subagent-streaming) — 코디네이터 메시지와 서브에이전트 카드를 분리하는 UI 패턴
- [LangGraph Event Streaming](https://docs.langchain.com/oss/python/langgraph/event-streaming) — 기반 그래프 스트리밍 모델
