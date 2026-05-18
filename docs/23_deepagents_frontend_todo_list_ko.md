# Deep Agents Frontend: Todo 리스트 (Todo List)

> 원문: https://docs.langchain.com/oss/python/deepagents/frontend/todo-list
>
> 에이전트 상태에서 동기화된 실시간 todo 리스트로 에이전트 진행 상황 추적

---

## 📖 목차

1. [개요](#개요)
2. [🧩 작동 방식](#-작동-방식-how-it-works)
3. [🛠️ useStream 설정](#️-usestream-설정-setting-up-usestream)
4. [📌 Todo 인터페이스](#-todo-인터페이스-the-todo-interface)
5. [🎨 TodoList 컴포넌트 구축](#-todolist-컴포넌트-구축-building-the-todolist-component)
6. [📊 진행 상황 막대(Progress bar)](#-진행-상황-막대progress-bar)
7. [✅ 개별 todo 아이템](#-개별-todo-아이템-individual-todo-items)
8. [🧮 진행률 계산](#-진행률-계산-calculating-progress)
9. [🖥️ 채팅 메시지와 결합](#️-채팅-메시지와-결합-combining-with-chat-messages)
10. [🔧 todos 외의 커스텀 상태](#-todos-외의-커스텀-상태-custom-state-beyond-todos)
11. [🎬 전환 애니메이션](#-전환-애니메이션-animating-transitions)
12. [💡 사용 사례](#-사용-사례-use-cases)
13. [⚙️ 빈 상태와 로딩 상태 처리](#️-빈-상태와-로딩-상태-처리-handling-empty-and-loading-states)
14. [📝 모범 사례](#-모범-사례-best-practices)

---

## 개요

모든 에이전트 상호작용이 채팅인 것은 아닙니다. 때로는 에이전트가 다단계 계획을 실행 중이며, 진행 상황을 보여주는 가장 좋은 방법은 실시간으로 업데이트되는 **todo 리스트**입니다. Deep Agent의 todo 리스트 패턴은 에이전트 상태(state)에서 직접 `todos` 배열을 읽어, 에이전트가 계획을 따라 작업하는 동안 각 항목을 현재 상태(status)와 함께 렌더링합니다. 채팅에 사용하는 동일한 `useStream` 훅 위에 구축된 진행 상황 대시보드이며, 에이전트 상태가 메시지 버블뿐 아니라 어떤 UI든 구동할 수 있다는 점을 보여줍니다.

---

## 🧩 작동 방식 (How it works)

LangGraph 에이전트에서 상태(state)는 메시지에만 국한되지 않습니다. **커스텀 상태 키(custom state keys)** 를 정의해 임의의 데이터를 보관할 수 있습니다. 여기서는 `todos` 배열이 그 예입니다. 에이전트가 계획을 실행하면서 각 todo의 상태를 `"pending"` → `"in_progress"` → `"completed"`로 업데이트합니다. `useStream` 훅은 이러한 커스텀 상태 값을 `stream.values`를 통해 노출하며, UI는 이를 반응형(reactively)으로 렌더링합니다.

흐름은 다음과 같습니다.

1. 사용자가 요청 제출
2. 에이전트가 계획을 만들고 자신의 상태에 `todos`를 채움
3. 에이전트가 각 todo를 실행하기 시작하며 `pending` → `in_progress` → `completed`로 전환
4. 에이전트가 진행함에 따라 `stream.values.todos`가 실시간으로 업데이트됨
5. UI가 현재 상태(status)와 함께 todo 리스트를 다시 렌더링

---

## 🛠️ useStream 설정 (Setting up useStream)

특별한 설정이 필요하지 않습니다. `useStream`을 에이전트에 연결하고 `stream.values`에서 `todos`를 읽으세요.

에이전트의 상태 스키마와 일치하는 TypeScript 인터페이스를 정의하고, 이를 타입 파라미터로 `useStream`에 전달하면 `todos` 같은 커스텀 상태 키를 포함해 상태 값에 타입 안전하게 접근할 수 있습니다. 아래 예시에서 `typeof myAgent`를 자신의 인터페이스 이름으로 교체하세요.

```ts
import type { BaseMessage } from "@langchain/core/messages";

interface TodoItem {
  title: string;
  status: "pending" | "in_progress" | "completed";
  description?: string;
}

interface AgentState {
  messages: BaseMessage[];
  todos: TodoItem[];
}
```

**React**

```tsx
import { useStream } from "@langchain/react";

const AGENT_URL = "http://localhost:2024";

export function TodoAgent() {
  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_todo_list",
  });

  const todos = stream.values?.todos ?? [];

  return (
    <div>
      <TodoList todos={todos} />
      {stream.messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

**Vue**

```vue
<script setup lang="ts">
import { useStream } from "@langchain/vue";
import { computed } from "vue";

const AGENT_URL = "http://localhost:2024";

const stream = useStream<typeof myAgent>({
  apiUrl: AGENT_URL,
  assistantId: "deep_agent_todo_list",
});

const todos = computed(() => stream.values.value?.todos ?? []);
</script>

<template>
  <div>
    <TodoList :todos="todos" />
    <Message
      v-for="msg in stream.messages.value"
      :key="msg.id"
      :message="msg"
    />
  </div>
</template>
```

**Svelte**

```svelte
<script lang="ts">
  import { useStream } from "@langchain/svelte";

  const AGENT_URL = "http://localhost:2024";

  const { messages, values, submit } = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_todo_list",
  });

  $: todos = $values?.todos ?? [];
</script>

<div>
  <TodoList {todos} />
  {#each $messages as msg (msg.id)}
    <Message message={msg} />
  {/each}
</div>
```

**Angular**

```ts
import { Component, computed } from "@angular/core";
import { useStream } from "@langchain/angular";

const AGENT_URL = "http://localhost:2024";

@Component({
  selector: "app-todo-agent",
  template: `
    <div>
      <app-todo-list [todos]="todos()" />
      @for (msg of stream.messages(); track msg.id) {
        <app-message [message]="msg" />
      }
    </div>
  `,
})
export class TodoAgentComponent {
  stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_todo_list",
  });

  todos = computed(() => this.stream.values()?.todos ?? []);
}
```

---

## 📌 Todo 인터페이스 (The Todo interface)

배열의 각 todo는 단순한 구조를 가집니다.

```ts
interface Todo {
  status: "pending" | "in_progress" | "completed";
  content: string;
}
```

| 속성       | 설명                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `status`   | 이 작업의 현재 상태. 옵션: `pending` (시작되지 않음), `in_progress` (에이전트가 작업 중), `completed` (완료)                          |
| `content`  | 작업이 무엇을 포함하는지에 대한 사람이 읽을 수 있는 설명                                                                              |

에이전트는 계획을 만들 때 이 배열을 채우고, 각 단계를 실행하면서 개별 항목을 업데이트합니다.

---

## 🎨 TodoList 컴포넌트 구축 (Building the TodoList component)

todo 리스트는 각 항목을 상태 아이콘, 색상 코딩, 현재 상태를 반영한 시각적 스타일과 함께 렌더링합니다.

```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  const completed = todos.filter((t) => t.status === "completed").length;
  const percentage = todos.length
    ? Math.round((completed / todos.length) * 100)
    : 0;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agent Progress</h2>
        <span className="text-sm text-gray-500">
          {completed}/{todos.length} tasks
        </span>
      </div>

      <ProgressBar percentage={percentage} />

      <ul className="mt-4 space-y-2">
        {todos.map((todo, i) => (
          <TodoItem key={i} todo={todo} />
        ))}
      </ul>
    </div>
  );
}
```

---

## 📊 진행 상황 막대(Progress bar)

시각적 진행 막대는 사용자가 전체 완료율을 한눈에 파악하도록 해줍니다.

```tsx
function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Progress</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

---

## ✅ 개별 todo 아이템 (Individual todo items)

각 항목에는 상태 아이콘, 색상 코드 텍스트, 완료된 작업에 대한 취소선(strikethrough) 스타일이 적용됩니다.

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const config = {
    pending: {
      icon: "○",
      textClass: "text-gray-600",
      bgClass: "bg-gray-50",
      iconClass: "text-gray-400",
    },
    in_progress: {
      icon: "◉",
      textClass: "text-amber-800",
      bgClass: "bg-amber-50 border-amber-200",
      iconClass: "text-amber-500 animate-pulse",
    },
    completed: {
      icon: "✓",
      textClass: "text-green-800 line-through",
      bgClass: "bg-green-50 border-green-200",
      iconClass: "text-green-500",
    },
  };

  const style = config[todo.status];

  return (
    <li
      className={`flex items-start gap-3 rounded-md border px-3 py-2 ${style.bgClass}`}
    >
      <span className={`mt-0.5 text-lg leading-none ${style.iconClass}`}>
        {style.icon}
      </span>
      <span className={`text-sm ${style.textClass}`}>{todo.content}</span>
    </li>
  );
}
```

`in_progress` 아이콘은 `animate-pulse`를 사용해 현재 활성화된 작업에 주의를 끕니다.

---

## 🧮 진행률 계산 (Calculating progress)

진행 지표는 todos 배열에서 직접 도출합니다.

```ts
const todos = stream.values?.todos ?? [];

const completed = todos.filter((t) => t.status === "completed").length;
const inProgress = todos.filter((t) => t.status === "in_progress").length;
const pending = todos.filter((t) => t.status === "pending").length;
const percentage = todos.length
  ? Math.round((completed / todos.length) * 100)
  : 0;
```

이 값들은 에이전트가 상태를 수정함에 따라 반응형으로 업데이트되어, 진행 막대와 카운터를 동기화 상태로 유지합니다.

---

## 🖥️ 채팅 메시지와 결합 (Combining with chat messages)

todo 리스트는 일반 채팅 인터페이스와 함께 동작합니다. 실용적인 레이아웃은 todo 리스트를 영속적인 사이드바나 헤더 패널로 표시하고, 그 아래에 채팅 메시지를 두는 것입니다.

```tsx
function TodoAgentLayout() {
  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_todo_list",
  });

  const todos = stream.values?.todos ?? [];

  return (
    <div className="flex h-screen flex-col">
      {todos.length > 0 && (
        <div className="border-b bg-gray-50 p-4">
          <TodoList todos={todos} />
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {stream.messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}
        </div>
      </main>

      <ChatInput
        onSubmit={(text) =>
          stream.submit({ messages: [{ type: "human", content: text }] })
        }
        isLoading={stream.isLoading}
      />
    </div>
  );
}
```

> 💡 `todos.length > 0`일 때만 todo 리스트를 표시하세요. 에이전트가 계획을 만들기 전에는 표시할 것이 없으며, 빈 컴포넌트를 보여주는 것은 공간 낭비입니다.

---

## 🔧 todos 외의 커스텀 상태 (Custom state beyond todos)

이 패턴은 강력한 원칙을 보여줍니다. `stream.values`는 메시지뿐만 아니라 에이전트가 정의한 **어떠한 커스텀 상태**든 노출할 수 있습니다. `todos` 배열은 하나의 예시일 뿐이며, 동일한 접근 방식을 다음과 같이 사용할 수 있습니다.

* **진행 지표(Progress metrics)**: 수치형 완료 데이터가 담긴 `stream.values.progress`
* **생성된 아티팩트(Generated artifacts)**: 에이전트가 빌드 중인 구조화된 문서가 담긴 `stream.values.document`
* **결정 로그(Decision logs)**: 에이전트가 내린 모든 선택을 추적하는 `stream.values.decisions`
* **리소스 리스트(Resource lists)**: 에이전트가 찾은 링크와 참조가 담긴 `stream.values.sources`

```ts
// 에이전트가 정의한 어떤 커스텀 상태 키든 접근 가능
const document = stream.values?.document;
const sources = stream.values?.sources ?? [];
const confidence = stream.values?.confidence_score;
```

> ℹ️ 커스텀 상태 키는 LangGraph 그래프의 상태 스키마에서 정의됩니다. `useStream` 훅은 추가적인 클라이언트 측 설정 없이 이를 자동으로 `stream.values`에 포함합니다.

---

## 🎬 전환 애니메이션 (Animating transitions)

Todo 상태 전환은 실시간으로 발생하며, 부드러운 애니메이션은 이러한 변화를 거슬리지 않고 세련되게 느껴지도록 만들어 줍니다.

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  return (
    <li
      className={`
        flex items-start gap-3 rounded-md border px-3 py-2
        transition-all duration-300 ease-in-out
        ${getStatusStyles(todo.status)}
      `}
    >
      <span
        className={`
          mt-0.5 text-lg leading-none transition-colors duration-300
          ${getIconStyles(todo.status)}
        `}
      >
        {getStatusIcon(todo.status)}
      </span>
      <span
        className={`
          text-sm transition-all duration-300
          ${todo.status === "completed" ? "line-through opacity-60" : ""}
        `}
      >
        {todo.content}
      </span>
    </li>
  );
}
```

`transition-all duration-300` 클래스는 색상 변경, 취소선, 불투명도(opacity) 변화 모두를 부드럽게 애니메이션화합니다.

---

## 💡 사용 사례 (Use cases)

todo 리스트 패턴은 에이전트가 구조화된 계획을 실행하는 모든 시나리오에 적합합니다.

* **프로젝트 계획**: 에이전트가 프로젝트를 작업으로 분해하고 순차적으로 수행
* **리서치 워크플로**: 각 리서치 질문이 에이전트가 조사하고 완료하는 todo가 됨
* **데이터 처리**: 수집(ingestion), 검증(validation), 변환(transformation), 내보내기(export) 같은 단계 각각이 자체 todo가 됨
* **온보딩 플로**: 에이전트가 서비스를 구성하면서 각 단계를 체크하며 설정 단계를 안내
* **리포트 생성**: 리포트의 섹션이 각각의 todo가 됨 — 데이터 수집, 트렌드 분석, 요약 작성, 출력 포맷팅

---

## ⚙️ 빈 상태와 로딩 상태 처리 (Handling empty and loading states)

에이전트가 계획을 만들기 전의 초기 상태를 처리하세요.

```tsx
function TodoList({ todos, isLoading }: { todos: Todo[]; isLoading: boolean }) {
  if (todos.length === 0 && !isLoading) {
    return null;
  }

  if (todos.length === 0 && isLoading) {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="animate-spin">⟳</span>
          Agent is creating a plan...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      {/* ... 전체 todo 리스트 렌더링 */}
    </div>
  );
}
```

---

## 📝 모범 사례 (Best practices)

* **Todo 리스트를 눈에 띄게 표시하세요.** 계획 기반 에이전트의 주요 진행 지표입니다. 스크롤 아래에 묻히지 않게 하세요.
* **상태 전환에 애니메이션을 적용하세요.** 부드러운 전환은 에이전트가 더 반응적으로 느껴지게 만듭니다. 배경색, 텍스트 데코레이션, 불투명도에 CSS 트랜지션을 사용하세요.
* **하나의 `in_progress` 항목만 강조하세요.** 에이전트는 보통 한 번에 한 작업을 합니다. 여러 항목이 `in_progress`로 표시되면 UI가 어지러워집니다. 첫 번째 항목만 펄스시키는 것을 고려하세요.
* **완료된 항목은 접거나 흐리게 처리하세요.** 리스트가 길어질수록 완료된 항목의 중요도는 낮아집니다. 시각적 비중을 줄여 사용자가 진행 중인 작업에 집중할 수 있게 하세요.
* **진행률 퍼센티지를 표시하세요.** "67% complete" 같은 단일 숫자는 멀리서도 즉시 이해할 수 있습니다.
* **Todo 리스트를 동기화 상태로 유지하세요.** `stream.values`가 반응형으로 업데이트되기 때문에 todo 리스트는 자동으로 최신 상태를 유지합니다. 수동 폴링이나 새로고침 로직을 추가하지 마세요.
