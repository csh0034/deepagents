# Changelog

> 원문: https://docs.langchain.com/oss/python/deepagents/changelog-py
>
> Python 패키지(deepagents, langchain, langgraph 등)의 업데이트 및 개선 사항 기록

---

> 📰 **구독(Subscribe)**: changelog에는 [RSS feed](https://docs.langchain.com/oss/python/releases/changelog/rss.xml)가 포함되어 있어 [Slack](https://slack.com/help/articles/218688467-Add-RSS-feeds-to-Slack), [이메일](https://zapier.com/apps/email/integrations/rss/1441/send-new-rss-feed-entries-via-email), [Readybot](https://readybot.io/)이나 [RSS Feeds to Discord Bot](https://rss.app/en/bots/rssfeeds-discord-bot) 같은 Discord 봇, 그리고 기타 구독 도구와 통합할 수 있습니다.

---

## 📰 2026년 5월 12일 — `deepagents` v0.6

> 태그: `deepagents`

- **[`CodeInterpreterMiddleware`](https://docs.langchain.com/oss/python/deepagents/interpreters)**: (experimental) `deepagents`가 이제 범위 지정된(scoped) QuickJS 런타임을 통해 코드 실행과 프로그래밍 방식의 도구 호출을 지원합니다.
- `stream_events` / `astream_events`에서 `version="v3"`을 지원합니다. 자세한 내용은 [event streaming](https://docs.langchain.com/oss/python/deepagents/event-streaming) 가이드를 참고하세요.

---

## 📰 2026년 5월 12일 — `langchain` v1.3

> 태그: `langchain`

이번 릴리스는 `langchain` 에이전트에서 `stream_events` / `astream_events`의 `version="v3"` 지원을 추가합니다. 자세한 내용은 [event streaming](https://docs.langchain.com/oss/python/langchain/event-streaming) 가이드를 참고하세요.

---

## 📰 2026년 5월 12일 — `langgraph` v1.2

> 태그: `langgraph`

이번 릴리스는 노드 실행에 대한 더 세분화된 제어(timeouts, error recovery, graceful shutdown), 장기 실행 스레드의 체크포인트 오버헤드를 줄이는 새로운 채널 타입, 그리고 타입화된 채널별 프로젝션을 가진 새로운 콘텐츠 블록 중심의 스트리밍 API(v3)를 추가합니다.

- **[`DeltaChannel`](https://docs.langchain.com/oss/python/langgraph/pregel#deltachannel-beta) (beta)**: 누적된 전체 값을 다시 직렬화하는 대신 매 단계의 증분 델타(incremental delta)만 저장하는 새로운 채널 타입입니다. 시간이 지남에 따라 커지는 채널(예: 장기 실행 스레드의 메시지 목록)에 가장 유용합니다. `snapshot_frequency=K`를 사용하면 K 단계마다 전체 스냅샷을 작성하여 읽기 지연을 제한할 수 있습니다.

- **[Per-node timeouts](https://docs.langchain.com/oss/python/langgraph/fault-tolerance#timeouts)**: [`add_node`](https://reference.langchain.com/python/langgraph/graph/state/StateGraph/add_node)에 `timeout=`을 전달하여 단일 시도의 최대 실행 시간을 제한할 수 있습니다. 절대 시계 기준 제한(`run_timeout`), 진행 시 리셋되는 유휴 제한(`idle_timeout`), 또는 [`TimeoutPolicy`](https://reference.langchain.com/python/langgraph/types/TimeoutPolicy)를 통해 둘 다 설정 가능합니다. 제한이 발동하면 LangGraph는 [`NodeTimeoutError`](https://reference.langchain.com/python/langgraph/errors/NodeTimeoutError)를 발생시키고 해당 시도의 쓰기를 지운 뒤 재시도 정책으로 넘어갑니다. 비동기 노드 전용입니다.

- **[Node-level error handlers](https://docs.langchain.com/oss/python/langgraph/fault-tolerance#error-handling)**: [`add_node`](https://reference.langchain.com/python/langgraph/graph/state/StateGraph/add_node)에 `error_handler=`를 전달하여 모든 재시도가 소진된 후 복구 함수를 실행합니다. 핸들러는 타입화된 [`NodeError`](https://reference.langchain.com/python/langgraph/errors/NodeError)를 받고, 상태를 업데이트하고 다른 노드로 라우팅하기 위해 [`Command`](https://reference.langchain.com/python/langgraph/types/Command)를 반환할 수 있어 Saga/보상(compensation) 패턴에 유용합니다.

- **[Graceful shutdown](https://docs.langchain.com/oss/python/langgraph/durable-execution#graceful-shutdown)**: 진행 중인 실행을 현재 supersep이 완료된 후 협조적으로 멈추고, 재개 가능한 체크포인트를 저장합니다. [`RunControl`](https://reference.langchain.com/python/langgraph/runtime/RunControl)을 만들어 어느 스레드에서든 `request_drain()`을 호출하세요. 실행은 `GraphDrained`를 발생시키고 동일한 config로 나중에 재개될 수 있습니다.

- **새 이벤트 스트리밍 API (beta)**: `stream_events()` / `astream_events()`에 `version="v3"`을 전달하여 타입화된 채널별 프로젝션(`run.values`, `run.messages`, `run.lifecycle`, `run.subgraphs`)과 updates, custom events, checkpoints, tasks, debug용 옵트인 변환기를 제공하는 콘텐츠 블록 중심 프로토콜을 사용할 수 있습니다. `run.messages`는 LLM 호출마다 하나의 `ChatModelStream`을 생성하며, text, reasoning, tool calls, usage에 대한 타입화된 서브 프로젝션을 제공합니다. `version="v1"`과 `version="v2"`는 변경되지 않았습니다.

Timeouts와 error handler는 Python 전용입니다. Retry 정책은 Python과 TypeScript 양쪽에서 계속 동작합니다.

---

## 📰 2026년 4월 7일 — `deepagents` v0.5.0

> 태그: `deepagents`

- **[Async subagents](https://docs.langchain.com/oss/python/deepagents/async-subagents)**: Deep Agents가 논블로킹(non-blocking) 백그라운드 작업을 실행할 수 있게 되어, 사용자가 서브에이전트가 동시에 작업하는 동안 에이전트와 계속 상호작용할 수 있습니다. 서브에이전트를 위해서는 [LangSmith Deployment](https://docs.langchain.com/langsmith/deployment)가 필요합니다.

- **멀티모달 지원(Multi-modal support)**: `read_file` 도구가 이제 이미지뿐 아니라 PDF, 오디오, 비디오 파일도 지원합니다.

- **백엔드 변경 사항(Backend changes)**: Deep Agents [backend protocol](https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/deepagents/backends/protocol.py)에 하위 호환 가능한 변경을 가했습니다.
  - [State 및 Store 백엔드](https://docs.langchain.com/oss/python/deepagents/backends)에 저장되는 파일 형식을 업데이트하여 바이너리 파일을 지원합니다.
  - 백엔드에서 도구로의 에러 전파를 개선했습니다.
  - 이제 `StateBackend()`와 `StoreBackend()`를 직접 인스턴스화할 수 있습니다. 팩토리로 지정하는 방식(예: `backend=(lambda rt: StateBackend(rt))`)은 deprecated 되었습니다.

- **Anthropic prompt caching 개선**: Anthropic 모델의 prompt caching 성능을 개선하기 위한 변경을 가했습니다.

---

## 📰 2026년 3월 10일 — `langgraph` v1.1

> 태그: `langgraph`

- **Type-safe streaming (`version="v2"`)**: `stream()` / `astream()`에 `version="v2"`를 전달하여 모든 청크에 `type`, `ns`, `data` 키를 가진 통합된 `StreamPart` 출력을 받습니다. 각 모드는 자체 `TypedDict`를 가지며 모두 `langgraph.types`에서 임포트 가능합니다. [streaming 문서](https://docs.langchain.com/oss/python/langgraph/streaming#stream-output-format-v2)를 참고하세요.

- **Type-safe invoke (`version="v2"`)**: `invoke()` / `ainvoke()`에 `version="v2"`를 전달하여 `.value`와 `.interrupts` 속성을 가진 `GraphOutput` 객체를 받습니다. [invoke 문서](https://docs.langchain.com/oss/python/langgraph/streaming#v2-invoke-format)를 참고하세요.

- **Pydantic 및 dataclass 강제 변환(coercion)**: `version="v2"`에서는 `invoke()`와 `values` 모드 스트림 출력이 선언된 Pydantic 모델 또는 dataclass 타입으로 자동 강제 변환됩니다.

- **인터럽트와 서브그래프가 있는 time travel 수정**: Replay가 더 이상 오래된 `RESUME` 값을 재사용하지 않으며, 서브그래프가 부모의 과거 상태에 대한 체크포인트를 올바르게 복원합니다.

- **완전한 하위 호환성**: `version="v2"`는 옵트인입니다. `GraphOutput`은 점진적 마이그레이션을 위해 deprecated된 dict 스타일 접근을 지원합니다.

---

## 📰 2026년 2월 10일 — `deepagents` v0.4

> 태그: `deepagents`

- 플러그형 샌드박스를 위한 새 통합 패키지: [`langchain-modal`](https://pypi.org/project/langchain-modal/), [`langchain-daytona`](https://pypi.org/project/langchain-daytona/), [`langchain-runloop`](https://pypi.org/project/langchain-runloop/). [sandboxes 가이드](https://docs.langchain.com/oss/python/deepagents/sandboxes)와 예시 [data analysis 튜토리얼](https://docs.langchain.com/oss/python/deepagents/data-analysis)을 참고하세요.
- [대화 히스토리 요약(conversation history summarization)](https://docs.langchain.com/oss/python/deepagents/context-engineering#summarization) 변경 사항:
  - 요약이 이제 `wrap_model_call` 이벤트를 통해 모델 노드에서 발생합니다. 이로 인해 그래프 상태에서 전체 메시지 히스토리를 유지합니다.
  - 더 정확한 토큰 카운팅.
  - 채팅 모델이 [`ContextOverflowError`](https://reference.langchain.com/python/langchain-core/exceptions/ContextOverflowError) (langchain-core에 정의됨)를 발생시키면 요약이 자동으로 트리거됩니다. 현재 `langchain-anthropic`과 `langchain-openai`가 이를 지원합니다.
- `"openai:"` 접두사가 붙은 모델 문자열에 대해 이제 기본적으로 Responses API를 사용합니다.

<details>
<summary>Responses API에서 데이터 보관 비활성화</summary>

```python
from langchain.chat_models import init_chat_model

agent = create_deep_agent(
    model=init_chat_model(
        "openai:...",
        use_responses_api=True,
        store=False,
        include=["reasoning.encrypted_content"],
    )
)
```

</details>

---

## 📰 2025년 12월 15일 — `langchain` v1.2.0

> 태그: `langchain`, `integrations`

- [`create_agent`](https://docs.langchain.com/oss/python/langchain/agents): [도구(tools)](https://docs.langchain.com/oss/python/langchain/tools)의 새로운 [`extras`](https://reference.langchain.com/python/langchain/tools/#langchain.tools.BaseTool.extras) 속성을 통해 프로바이더별 도구 파라미터와 정의에 대한 지원을 간소화했습니다. 예시:
  - Anthropic의 [programmatic tool calling](https://docs.langchain.com/oss/python/integrations/chat/anthropic#programmatic-tool-calling)과 [tool search](https://docs.langchain.com/oss/python/integrations/chat/anthropic#tool-search) 같은 프로바이더별 설정.
  - [Anthropic](https://docs.langchain.com/oss/python/integrations/chat/anthropic#built-in-tools), [OpenAI](https://docs.langchain.com/oss/python/integrations/chat/openai#responses-api) 등 프로바이더가 지원하는 클라이언트 측에서 실행되는 내장 도구.
- 에이전트 `response_format`에서 엄격한 스키마 준수 지원 ([`ProviderStrategy`](https://docs.langchain.com/oss/python/langchain/structured-output#provider-strategy) 문서 참고).

---

## 📰 2025년 12월 8일 — `langchain-google-genai` v4.0.0

> 태그: `langchain`, `integrations`

Google GenAI 통합을 Google의 통합 Generative AI SDK를 사용하도록 다시 작성했습니다. 이 SDK는 Gemini API와 Vertex AI Platform을 동일한 인터페이스로 제공합니다. 최소한의 호환성 깨짐(breaking changes)과 함께 `langchain-google-vertexai`의 패키지가 deprecated 되었습니다.

자세한 내용은 전체 [릴리스 노트 및 마이그레이션 가이드](https://github.com/langchain-ai/langchain-google/discussions/1422)를 참고하세요.

---

## 📰 2025년 11월 25일 — `langchain` v1.1.0

> 태그: `langchain`

- [Model profiles](https://docs.langchain.com/oss/python/langchain/models#model-profiles): 채팅 모델이 이제 `.profile` 속성을 통해 지원되는 기능과 capability를 노출합니다. 이 데이터는 모델 capability 데이터를 제공하는 오픈소스 프로젝트인 [models.dev](https://models.dev)에서 파생됩니다.
- [Summarization middleware](https://docs.langchain.com/oss/python/langchain/middleware/built-in#summarization): 컨텍스트를 인지하는 요약을 위해 model profile을 사용하는 유연한 트리거 포인트를 지원하도록 업데이트되었습니다.
- [Structured output](https://docs.langchain.com/oss/python/langchain/structured-output): `ProviderStrategy` 지원(네이티브 structured output)을 이제 model profile에서 추론할 수 있습니다.
- [`create_agent`를 위한 `SystemMessage`](https://docs.langchain.com/oss/python/langchain/middleware/custom#dynamic-prompt): `create_agent`의 `system_prompt` 파라미터에 `SystemMessage` 인스턴스를 직접 전달할 수 있도록 지원하여, 캐시 제어와 구조화된 콘텐츠 블록 같은 고급 기능을 사용할 수 있습니다.
- [Model retry middleware](https://docs.langchain.com/oss/python/langchain/middleware/built-in#model-retry): 설정 가능한 지수 백오프로 실패한 모델 호출을 자동 재시도하는 새 미들웨어.
- [Content moderation middleware](https://docs.langchain.com/oss/python/integrations/middleware/openai#content-moderation): 에이전트 상호작용에서 안전하지 않은 콘텐츠를 탐지하고 처리하는 OpenAI content moderation 미들웨어. 사용자 입력, 모델 출력, 도구 결과 확인을 지원합니다.

---

## 📰 2025년 10월 20일 — v1.0.0

> 태그: `langchain`, `langgraph`

### `langchain`

- [릴리스 노트](https://docs.langchain.com/oss/python/releases/langchain-v1)
- [마이그레이션 가이드](https://docs.langchain.com/oss/python/migrate/langchain-v1)

### `langgraph`

- [릴리스 노트](https://docs.langchain.com/oss/python/releases/langgraph-v1)
- [마이그레이션 가이드](https://docs.langchain.com/oss/python/migrate/langgraph-v1)

> 📢 문제가 있거나 피드백이 있다면 [이슈를 등록](https://github.com/langchain-ai/docs/issues/new?template=01-langchain.yml)하여 개선에 기여해 주세요. v0.x 문서를 보려면 [아카이브된 콘텐츠](https://github.com/langchain-ai/langchain/tree/v0.3/docs/docs)와 [API 레퍼런스](https://reference.langchain.com/v0.3/python/)로 이동하세요.

---

> 📝 이 문서를 Claude, VSCode 등에 MCP를 통해 실시간 답변용으로 [연결](https://docs.langchain.com/use-these-docs)할 수 있습니다. [GitHub에서 페이지 편집](https://github.com/langchain-ai/docs/edit/main/src/oss/python/releases/changelog.mdx) 또는 [이슈 등록](https://github.com/langchain-ai/docs/issues/new/choose)도 가능합니다.
