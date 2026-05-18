# Deep Agents Frontend: 서브에이전트 스트리밍 (Subagent Streaming)

> 원문: https://docs.langchain.com/oss/python/deepagents/frontend/subagent-streaming
>
> 스트리밍 콘텐츠, 진행 상황 추적, 접을 수 있는 카드와 함께 전문 서브에이전트(specialist subagents)를 표시

---

## 📖 목차

1. [개요](#개요)
2. [🎯 서브에이전트 메시지를 필터링하는 이유](#-서브에이전트-메시지를-필터링하는-이유-why-filter-subagent-messages)
3. [🛠️ useStream 설정](#️-usestream-설정-setting-up-usestream)
4. [📡 서브그래프 스트리밍으로 제출](#-서브그래프-스트리밍으로-제출-submitting-with-subgraph-streaming)
5. [🧩 SubagentStreamInterface](#-subagentstreaminterface)
6. [🔗 서브에이전트를 메시지에 연결](#-서브에이전트를-메시지에-연결-linking-subagents-to-messages)
7. [🎨 SubagentCard 구축](#-subagentcard-구축-building-the-subagentcard)
8. [✅ 상태 아이콘 및 배지](#-상태-아이콘-및-배지-status-icons-and-badges)
9. [📊 진행 상황 추적](#-진행-상황-추적-progress-tracking)
10. [🖥️ 서브에이전트 카드와 함께 메시지 렌더링](#️-서브에이전트-카드와-함께-메시지-렌더링-rendering-messages-with-subagent-cards)
11. [🔧 종합(Synthesis) 인디케이터](#-종합synthesis-인디케이터-synthesis-indicator)
12. [🐛 디버깅: 필터링되지 않은 출력](#-디버깅-필터링되지-않은-출력-debug-unfiltered-output)
13. [💡 사용 사례](#-사용-사례-use-cases)
14. [📚 전체 서브에이전트 맵 접근](#-전체-서브에이전트-맵-접근-accessing-the-full-subagents-map)
15. [📝 모범 사례](#-모범-사례-best-practices)

---

## 개요

코디네이터 에이전트가 전문 서브에이전트(리서처, 분석가, 라이터 등)를 생성할 때, 오케스트레이터(orchestrator)의 메시지를 각 서브에이전트의 스트리밍 출력과 분리하여 렌더링해야 합니다. `useStream`에 `filterSubagentMessages: true`를 설정하여 두 스트림을 깔끔하게 분리한 다음, `getSubagentsByMessage`를 사용해 각 서브에이전트의 진행 상황 카드를 그것을 트리거한 코디네이터 메시지에 연결하세요.

---

## 🎯 서브에이전트 메시지를 필터링하는 이유 (Why filter subagent messages)

필터링이 없으면, 모든 서브에이전트가 생성하는 모든 토큰이 코디네이터의 메시지 스트림에 뒤섞여 나타나 읽을 수 없게 됩니다. `filterSubagentMessages: true`를 설정하면 다음과 같이 됩니다.

* `stream.messages`에는 **오직 코디네이터의 메시지만** 포함됩니다.
* 각 서브에이전트의 콘텐츠는 `stream.subagents`와 `stream.getSubagentsByMessage`를 통해 접근할 수 있습니다.
* UI가 깔끔하게 유지됩니다. 코디네이터의 추론이 전문가들의 작업과 분리됩니다.

이러한 분리 덕분에 한 곳에 오케스트레이터 메시지를 렌더링하면서, 각 서브에이전트의 진행 상황 카드를 그것을 생성한 코디네이터 메시지 바로 아래에 정확히 배치할 수 있습니다.

---

## 🛠️ useStream 설정 (Setting up useStream)

항상 `filterSubagentMessages: true`를 설정하세요. 그러면 서브에이전트 토큰이 메인 메시지 스트림에서 제거되어, 코디네이터의 메시지와 서브에이전트 출력을 독립적으로 렌더링할 수 있습니다.

에이전트의 상태(state) 스키마와 일치하는 TypeScript 인터페이스를 정의하고, 이를 타입 파라미터로 `useStream`에 전달하여 상태 값에 타입 안전하게 접근하세요. 아래 예시에서 `typeof myAgent`를 자신의 인터페이스 이름으로 교체하세요.

```ts
import type { BaseMessage } from "@langchain/core/messages";

interface AgentState {
  messages: BaseMessage[];
}
```

**React**

```tsx
import { useStream } from "@langchain/react";

const AGENT_URL = "http://localhost:2024";

export function DeepAgentChat() {
  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_subagent_cards",
    filterSubagentMessages: true,
  });

  return (
    <div>
      {stream.messages.map((msg) => (
        <MessageWithSubagents
          key={msg.id}
          message={msg}
          subagents={stream.getSubagentsByMessage(msg.id)}
        />
      ))}
    </div>
  );
}
```

**Vue**

```vue
<script setup lang="ts">
import { useStream } from "@langchain/vue";

const AGENT_URL = "http://localhost:2024";

const stream = useStream<typeof myAgent>({
  apiUrl: AGENT_URL,
  assistantId: "deep_agent_subagent_cards",
  filterSubagentMessages: true,
});
</script>

<template>
  <div>
    <MessageWithSubagents
      v-for="msg in stream.messages.value"
      :key="msg.id"
      :message="msg"
      :subagents="stream.getSubagentsByMessage(msg.id)"
    />
  </div>
</template>
```

**Svelte**

```svelte
<script lang="ts">
  import { useStream } from "@langchain/svelte";

  const AGENT_URL = "http://localhost:2024";

  const { messages, getSubagentsByMessage, submit } = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_subagent_cards",
    filterSubagentMessages: true,
  });
</script>

<div>
  {#each $messages as msg (msg.id)}
    <MessageWithSubagents
      message={msg}
      subagents={getSubagentsByMessage(msg.id)}
    />
  {/each}
</div>
```

**Angular**

```ts
import { Component } from "@angular/core";
import { useStream } from "@langchain/angular";

const AGENT_URL = "http://localhost:2024";

@Component({
  selector: "app-deep-agent-chat",
  template: `
    @for (msg of stream.messages(); track msg.id) {
      <app-message-with-subagents
        [message]="msg"
        [subagents]="stream.getSubagentsByMessage(msg.id)"
      />
    }
  `,
})
export class DeepAgentChatComponent {
  stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_subagent_cards",
    filterSubagentMessages: true,
  });
}
```

---

## 📡 서브그래프 스트리밍으로 제출 (Submitting with subgraph streaming)

메시지를 제출할 때 서브그래프 스트리밍을 활성화하고 적절한 재귀 제한(recursion limit)을 설정하세요. Deep Agent 워크플로는 종종 여러 계층의 중첩된 서브그래프를 포함하므로, 더 높은 재귀 제한이 조기 종료를 방지합니다.

```ts
stream.submit(
  { messages: [{ type: "human", content: text }] },
  { streamSubgraphs: true }
);
```

> 📝 Deep Agents는 기본 재귀 제한을 10,000으로 설정하며, 이는 대부분의 다중 전문가(multi-expert) 설정에 충분합니다. 필요한 경우 `config.recursion_limit`을 통해 재정의할 수 있습니다.

---

## 🧩 SubagentStreamInterface

각 서브에이전트는 작업, 상태, 타이밍에 관한 메타데이터를 가진 `SubagentStreamInterface`를 노출합니다.

```ts
interface SubagentStreamInterface {
  id: string;
  status: "pending" | "running" | "complete" | "error";
  messages: BaseMessage[];
  result: string | undefined;
  toolCall: {
    id: string;
    name: string;
    args: {
      description: string;
      subagent_type: string;
      [key: string]: unknown;
    };
  };
  startedAt: number | undefined;
  completedAt: number | undefined;
}
```

| 속성                          | 설명                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `id`                          | 이 서브에이전트 인스턴스의 고유 식별자                                         |
| `status`                      | 라이프사이클 상태: `pending` → `running` → `complete` 또는 `error`             |
| `messages`                    | 서브에이전트 자체의 메시지 스트림 (실시간으로 업데이트)                         |
| `result`                      | 최종 출력 텍스트. `status`가 `"complete"`일 때만 사용 가능                     |
| `toolCall`                    | 이 서브에이전트를 생성한 도구 호출. 작업 메타데이터 포함                        |
| `toolCall.args.description`   | 코디네이터가 이 서브에이전트에 할당한 작업 설명                                 |
| `toolCall.args.subagent_type` | 전문 분야의 타입/이름 (예: `"researcher"`, `"analyst"`)                        |
| `startedAt`                   | 서브에이전트가 실행을 시작한 타임스탬프                                         |
| `completedAt`                 | 서브에이전트가 종료된 타임스탬프                                                |

---

## 🔗 서브에이전트를 메시지에 연결 (Linking subagents to messages)

`getSubagentsByMessage` 메서드는 특정 AI 메시지가 생성한 서브에이전트들을 반환합니다. 이를 통해 서브에이전트 카드를 그것을 트리거한 코디네이터 메시지 바로 아래에 렌더링할 수 있습니다.

```ts
const turnSubagents = stream.getSubagentsByMessage(msg.id);
```

이 메서드는 `SubagentStreamInterface` 객체의 배열을 반환합니다. 해당 메시지가 어떤 서브에이전트도 생성하지 않았다면 빈 배열을 반환합니다.

---

## 🎨 SubagentCard 구축 (Building the SubagentCard)

각 서브에이전트 카드는 전문가의 이름, 작업 설명, 스트리밍 콘텐츠 또는 최종 결과, 타이밍 정보를 보여줍니다.

```tsx
import { AIMessage } from "@langchain/core/messages";

function SubagentCard({
  subagent,
}: {
  subagent: SubagentStreamInterface;
}) {
  const [expanded, setExpanded] = useState(true);

  const title =
    subagent.toolCall?.args?.subagent_type ?? `Agent ${subagent.id}`;
  const description = subagent.toolCall?.args?.description ?? "";

  const lastAIMessage = subagent.messages
    .filter(AIMessage.isInstance)
    .at(-1);

  const displayContent =
    subagent.status === "complete"
      ? subagent.result
      : typeof lastAIMessage?.content === "string"
        ? lastAIMessage.content
        : "";

  const elapsed = getElapsedTime(subagent.startedAt, subagent.completedAt);

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={subagent.status} />
          <div>
            <h4 className="font-semibold capitalize">{title}</h4>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {elapsed && (
            <span className="text-xs text-gray-400">{elapsed}</span>
          )}
          <StatusBadge status={subagent.status} />
        </div>
      </button>

      {expanded && displayContent && (
        <div className="border-t px-4 py-3">
          <div className="prose prose-sm max-w-none line-clamp-6">
            {displayContent}
            {subagent.status === "running" && (
              <span className="inline-block h-4 w-1 animate-pulse bg-blue-500" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getElapsedTime(
  startedAt: number | undefined,
  completedAt: number | undefined
): string | null {
  if (!startedAt) return null;
  const end = completedAt ?? Date.now();
  const seconds = Math.round((end - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
```

---

## ✅ 상태 아이콘 및 배지 (Status icons and badges)

일관된 시각적 표시는 사용자가 서브에이전트 상태를 한눈에 파악하는 데 도움이 됩니다.

```tsx
function StatusIcon({ status }: { status: SubagentStreamInterface["status"] }) {
  switch (status) {
    case "pending":
      return <span className="text-gray-400">○</span>;
    case "running":
      return <span className="animate-spin text-blue-500">◉</span>;
    case "complete":
      return <span className="text-green-500">✓</span>;
    case "error":
      return <span className="text-red-500">✕</span>;
  }
}

function StatusBadge({ status }: { status: SubagentStreamInterface["status"] }) {
  const styles = {
    pending: "bg-gray-100 text-gray-600",
    running: "bg-blue-100 text-blue-700",
    complete: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
```

---

## 📊 진행 상황 추적 (Progress tracking)

사용자가 몇 개의 서브에이전트가 완료되었는지 알 수 있도록 진행 막대와 카운터를 표시합니다.

```tsx
function SubagentProgress({
  subagents,
}: {
  subagents: SubagentStreamInterface[];
}) {
  const completed = subagents.filter((s) => s.status === "complete").length;
  const total = subagents.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Subagent progress</span>
        <span>
          {completed}/{total} complete
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

---

## 🖥️ 서브에이전트 카드와 함께 메시지 렌더링 (Rendering messages with subagent cards)

핵심 레이아웃 패턴은 각 코디네이터 메시지를 렌더링하고, 만약 그 메시지가 서브에이전트를 생성했다면 그 카드들을 바로 아래에 함께 렌더링하는 것입니다.

```tsx
function MessageWithSubagents({
  message,
  subagents,
}: {
  message: BaseMessage;
  subagents: SubagentStreamInterface[];
}) {
  if (message.type === "human") {
    return <HumanMessage content={message.content} />;
  }

  return (
    <div className="space-y-3">
      {message.content && (
        <div className="prose prose-sm max-w-none">
          {message.content}
        </div>
      )}

      {subagents.length > 0 && (
        <div className="ml-4 space-y-3 border-l-2 border-blue-200 pl-4">
          <SubagentProgress subagents={subagents} />
          {subagents.map((subagent) => (
            <SubagentCard key={subagent.id} subagent={subagent} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🔧 종합(Synthesis) 인디케이터 (Synthesis indicator)

모든 서브에이전트가 완료된 후, 코디네이터는 그 결과를 최종 응답으로 종합(synthesize)하는 데 시간이 걸립니다. 이 단계 동안 명확한 인디케이터를 표시하세요.

```tsx
function SynthesisIndicator({
  subagents,
  isLoading,
}: {
  subagents: SubagentStreamInterface[];
  isLoading: boolean;
}) {
  const allComplete =
    subagents.length > 0 &&
    subagents.every((s) => s.status === "complete" || s.status === "error");

  if (!allComplete || !isLoading) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2 text-sm text-purple-700">
      <span className="animate-spin">⟳</span>
      Synthesizing results from {subagents.length} subagent
      {subagents.length !== 1 ? "s" : ""}...
    </div>
  );
}
```

> 💡 복잡한 다중 전문가 워크플로의 경우 종합(synthesis) 단계가 몇 초 걸릴 수 있습니다. 명확한 "Synthesizing results..." 인디케이터는 사용자가 에이전트가 멈췄다고 오해하는 것을 막아 줍니다.

---

## 🐛 디버깅: 필터링되지 않은 출력 (Debug unfiltered output)

개발 중에는 일시적으로 `filterSubagentMessages: false`로 설정하여 메인 메시지 스트림에 모든 서브에이전트의 원시(raw) 출력이 뒤섞여 나오는 것을 볼 수 있습니다. 서브에이전트 토큰이 올바르게 흐르고 있는지 확인하는 데 유용하지만, 프로덕션 UI에서는 사용하지 마세요.

---

## 💡 사용 사례 (Use cases)

Deep Agent 서브에이전트 카드는 다음과 같은 에이전트 워크플로에서 올바른 선택입니다.

* **심층 리서치(Deep research)**: 코디네이터가 질문의 다양한 측면을 조사하기 위해 리서처들을 파견(dispatch)하고, 그 결과를 종합하는 경우
* **다중 전문가 분석(Multi-expert analysis)**: 도메인 전문가(법무, 재무, 기술 등)가 각자의 관점을 기여하는 경우
* **복잡한 작업 분해(Complex task decomposition)**: 플래너가 큰 작업을 하위 작업으로 분해하고, 각각을 전문가 워커(specialist worker)에게 할당하는 경우
* **코드 리뷰 파이프라인(Code review pipelines)**: 보안 검토, 스타일 검사, 성능 분석, 문서 검토를 별도의 에이전트가 처리하는 경우

---

## 📚 전체 서브에이전트 맵 접근 (Accessing the full subagents map)

메시지별 조회 외에도 `stream.subagents`를 통해 모든 서브에이전트에 한 번에 접근할 수 있습니다.

```ts
const allSubagents = [...stream.subagents.values()];
const running = allSubagents.filter((s) => s.status === "running");
const completed = allSubagents.filter((s) => s.status === "complete");
const errors = allSubagents.filter((s) => s.status === "error");
```

어떤 코디네이터 메시지가 그들을 생성했는지에 관계없이 모든 서브에이전트 활동을 요약하는 전역 진행 상황 인디케이터나 대시보드를 구축할 때 유용합니다.

---

## 📝 모범 사례 (Best practices)

* **항상 `filterSubagentMessages: true`를 설정하세요.** 필터링되지 않은 스트림은 코디네이터와 서브에이전트의 토큰이 뒤섞여 읽을 수 없게 됩니다.
* **작업 설명을 보여주세요.** `toolCall.args.description` 필드는 각 서브에이전트가 무엇을 하도록 요청받았는지 사용자에게 정확히 알려줍니다. 항상 눈에 띄게 표시하세요.
* **접을 수 있는 카드를 사용하세요.** 5개 이상의 서브에이전트가 있는 워크플로에서는 완료된 카드를 자동으로 접어 사용자가 진행 중인 작업에 집중할 수 있게 하세요.
* **타이밍 데이터를 표시하세요.** 각 서브에이전트가 얼마나 걸렸는지 보여주면 사용자가 성능 특성을 이해하고 병목 지점을 식별하는 데 도움이 됩니다.
* **적절한 재귀 제한을 설정하세요.** 중첩된 서브그래프가 있는 Deep Agent 워크플로는 기본값 25보다 높은 제한이 필요합니다. 100부터 시작하세요.
* **서브에이전트별로 에러를 처리하세요.** 한 서브에이전트가 실패한다고 해서 전체 UI가 깨지면 안 됩니다. 그 서브에이전트의 카드에 에러를 표시하고 나머지는 계속 실행되도록 하세요.
