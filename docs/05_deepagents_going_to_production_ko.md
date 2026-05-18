# 프로덕션 배포하기 (Going to production)

> 원문: https://docs.langchain.com/oss/python/deepagents/going-to-production
>
> 영속 메모리, 샌드박스, 복원력 미들웨어, 배포 옵션을 활용하여 deep agent를 프로덕션 환경으로 가져갑니다.

---

## 📖 목차

1. [개요 (Overview)](#-개요-overview)
2. [LangSmith 배포 (LangSmith Deployments)](#-langsmith-배포-langsmith-deployments)
3. [프로덕션 고려 사항 (Production considerations)](#-프로덕션-고려-사항-production-considerations)
4. [메모리 (Memory)](#-메모리-memory)
5. [실행 환경 (Execution environment)](#-실행-환경-execution-environment)
6. [가드레일 (Guardrails)](#-가드레일-guardrails)
7. [프론트엔드 (Frontend)](#-프론트엔드-frontend)

---

이 가이드는 deep agent를 로컬 프로토타입에서 프로덕션 배포로 가져가기 위한 고려 사항을 다룹니다. 메모리 범위 설정, 실행 환경 구성, 가드레일 추가, 프론트엔드 연결 단계를 설명합니다.

---

## 📌 개요 (Overview)

에이전트는 작업을 수행하기 위해 메모리와 실행 환경의 정보를 사용합니다. 프로덕션에서는 정보가 어떻게 공유되고 접근되는지를 결정하는 몇 가지 핵심 단위가 있습니다.

- **Thread(스레드)**: 단일 대화. 메시지 히스토리와 스크래치(scratch) 파일은 기본적으로 스레드 단위로 범위가 지정되며, 다른 스레드로 넘어가지 않습니다.
- **User(사용자)**: 에이전트와 상호작용하는 사람. 메모리와 파일은 사용자에게만 비공개로 할당하거나 사용자 간 공유할 수 있습니다. ID(identity)와 인가(authorization)는 [auth 계층](https://docs.langchain.com/langsmith/auth)에서 옵니다.
- **Assistant(어시스턴트)**: 구성된 에이전트 인스턴스. 메모리와 파일은 단일 어시스턴트에 묶거나 모든 어시스턴트에서 공유할 수 있습니다.

이 페이지에서 다루는 내용:

- **[LangSmith 배포](#-langsmith-배포-langsmith-deployments)**: 인증, 웹훅, 크론이 포함된 매니지드 인프라
- **[프로덕션 고려 사항](#-프로덕션-고려-사항-production-considerations)**: 멀티 테넌시, 인증, 자격 증명, 비동기, 내구성
- **[메모리](#-메모리-memory)**: 대화 간 정보 영속화
- **[실행 환경](#-실행-환경-execution-environment)**: 파일 저장과 코드 실행
- **[가드레일](#-가드레일-guardrails)**: 속도 제한, 에러 처리, 데이터 프라이버시
- **[프론트엔드](#-프론트엔드-frontend)**: 배포된 에이전트에 UI 연결

---

## 🚀 LangSmith 배포 (LangSmith Deployments)

![매니지드 Deep Agents는 LangSmith용으로 에이전트 설정, 도구, 런타임 설정을 패키징합니다](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/deepagents-deploy-config.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=5c3f2961994afe5fe67a2f5c9e9ba7ac)

Deep Agents에는 두 가지 호스팅 경로가 있습니다. [매니지드 Deep Agents (Managed Deep Agents)](https://docs.langchain.com/langsmith/deploy-managed-deep-agent) (프라이빗 프리뷰)는 LangSmith에서 deep agent를 생성, 실행, 운영할 수 있는 API 우선 런타임을 제공합니다. 커스텀 애플리케이션 코드, 커스텀 라우트, 고급 인증, 또는 전체 Agent Server API가 필요한 경우 [LangSmith Deployment](https://docs.langchain.com/langsmith/deployment)를 직접 구성할 수도 있습니다. 어느 경로든 에이전트가 필요로 하는 인프라([assistants](https://docs.langchain.com/langsmith/assistants), [threads](https://docs.langchain.com/langsmith/use-threads), [runs](https://docs.langchain.com/langsmith/runs), store, checkpointer)를 프로비저닝해 주므로 직접 세팅할 필요가 없습니다. 또한 [인증(authentication)](https://docs.langchain.com/langsmith/auth), [웹훅(webhooks)](https://docs.langchain.com/langsmith/use-webhooks), [크론 작업(cron jobs)](https://docs.langchain.com/langsmith/cron-jobs), [관찰성(observability)](https://docs.langchain.com/langsmith/observability)을 기본 제공하며, 에이전트를 [MCP](https://docs.langchain.com/langsmith/server-mcp) 또는 [A2A](https://docs.langchain.com/langsmith/server-a2a)를 통해 노출할 수 있습니다.

이 페이지의 모든 코드 스니펫은 별도 명시가 없는 한 다음 `langgraph.json`을 사용합니다.

```json
// langgraph.json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./agent.py:agent"
  },
  "env": ".env"
}
```

`langgraph.json`은 LangGraph 플랫폼에게 애플리케이션을 어떻게 빌드하고 실행할지 알려주는 설정 파일입니다. 프로젝트 루트에 위치하며, 로컬 개발(`langgraph dev`)과 프로덕션 배포 양쪽 모두에서 필수입니다. 주요 필드는 다음과 같습니다.

| 필드 | 설명 |
| --- | --- |
| `dependencies` | 설치할 패키지. `["."]`은 현재 디렉터리를 패키지로 설치합니다(`requirements.txt`, `pyproject.toml`, `package.json`에서 읽음). |
| `graphs` | 그래프 ID와 코드 위치를 매핑. 각 엔트리는 `"<id>": "./<file>:<variable>"` 형식이며, `<id>`는 API를 통해 그래프를 호출할 때 사용하는 이름, `<variable>`은 `<file>`에서 export된 컴파일된 그래프 또는 생성자(constructor) 함수입니다. |
| `env` | 환경 변수(API 키, 시크릿)가 담긴 `.env` 파일 경로. 빌드 시 설정되며 런타임에 사용 가능합니다. |

전체 설정 옵션(커스텀 Docker 단계, store 인덱싱, auth 핸들러 등)은 [application structure](https://docs.langchain.com/oss/python/langgraph/application-structure)를 참고하세요.

---

## ⚙️ 프로덕션 고려 사항 (Production considerations)

### 멀티 테넌시 (Multi-tenancy)

에이전트가 여러 사용자를 서비스할 때는 세 가지를 처리해야 합니다. 각 사용자의 신원을 검증하는 일, 접근 가능한 항목을 제어하는 일, 사용자를 대신해 행동할 때 사용하는 자격 증명을 관리하는 일입니다.

![세 가지 인증 계층의 구성: 최종 사용자 인증, 사용자로서 행동하는 에이전트 인증, 팀 RBAC](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/auth-layers.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=11137d8bae74093c459416fd3e541d68)

#### 사용자 ID와 접근 제어 (User identity and access control)

[LangSmith Deployments](https://docs.langchain.com/langsmith/deployment)는 사용자 신원을 확립하는 [커스텀 인증](https://docs.langchain.com/langsmith/custom-auth)과, 스레드/어시스턴트/store 네임스페이스 등 리소스에 대한 접근을 제어하는 [인가 핸들러(authorization handlers)](https://docs.langchain.com/langsmith/auth)를 지원합니다. 인가 핸들러는 인증이 성공한 후 실행되며 다음을 할 수 있습니다.

- 소유권 메타데이터로 리소스에 태깅(예: `owner: user_id`)
- 필터를 반환하여 사용자가 자신의 리소스만 보도록 함
- 인가되지 않은 작업에 대해 HTTP 403으로 접근 거부

CLI로 배포할 경우, `deepagents.toml`의 [`[auth]`](https://docs.langchain.com/oss/python/deepagents/deploy#auth) 섹션이 Clerk, Supabase, 익명(anonymous) 인증을 자동 연결해 주며, [`[frontend]`](https://docs.langchain.com/oss/python/deepagents/deploy#frontend) 섹션이 같은 설정을 재사용하여 번들된 chat UI를 게이트(gate)합니다. 단계별 튜토리얼은 [Make conversations private](https://docs.langchain.com/langsmith/resource-auth)를 참고하세요. 실습 영상은 [custom auth 비디오](https://www.youtube.com/watch?v=DkNqgCz8cjE)를 시청해 보세요.

[메모리 범위 설정](#-메모리-memory)과 [실행 환경](#-실행-환경-execution-environment) 구성 방식에 따라 사용자 간에 어떤 데이터가 공유되는지가 결정됩니다. 자세한 내용은 아래 섹션을 참고하세요.

#### 팀 접근 제어 (Team access control, RBAC)

LangSmith의 [역할 기반 접근 제어 (role-based access control)](https://docs.langchain.com/langsmith/rbac)는 팀 내에서 누가 에이전트를 배포, 설정, 모니터링할 수 있는지를 관리합니다. 이는 위의 최종 사용자 인가와는 별개입니다.

| 역할 | 권한 |
| --- | --- |
| Workspace Admin | 설정과 멤버 관리를 포함한 전체 권한 |
| Workspace Editor | 리소스 생성/수정 가능. 단, 실행(run) 삭제와 멤버 관리는 불가 |
| Workspace Viewer | 읽기 전용 접근 |

세분화된 권한이 가능한 커스텀 역할은 Enterprise 플랜에서 사용할 수 있습니다. 전체 권한 모델은 [RBAC reference](https://docs.langchain.com/langsmith/rbac)를 참고하세요.

#### 최종 사용자 자격 증명 (End-user credentials)

에이전트가 사용자를 대신해 외부 API를 호출해야 할 때(예: 사용자의 GitHub 리포지토리 읽기, Slack 메시지 전송, 데이터 웨어하우스 조회), 사용자의 자격 증명을 하드코딩하지 않고 에이전트에 전달할 방법이 필요합니다.

**Agent Auth를 통한 OAuth.** [Agent Auth](https://docs.langchain.com/langsmith/agent-auth)는 매니지드 OAuth 2.0 흐름을 제공합니다. OAuth 프로바이더를 구성하면 에이전트가 사용자별로 스코프(scope) 지정된 토큰을 요청할 수 있습니다. 최초 사용 시 에이전트는 실행을 [인터럽트(interrupts)](https://docs.langchain.com/oss/python/langgraph/interrupts)하고 OAuth 동의 URL을 표시합니다. 사용자가 인증을 완료하면 유효한 토큰과 함께 에이전트가 재개됩니다. 토큰은 자동으로 저장되고 갱신됩니다.

```python
from langchain_auth import Client
from langchain.tools import tool, ToolRuntime

auth_client = Client()

# 에이전트의 도구 안에서:
@tool
async def github_action(runtime: ToolRuntime):
    """Perform an action on behalf of the user via GitHub."""
    auth_result = await auth_client.authenticate(
        provider="github",
        scopes=["repo", "read:org"],
        user_id=runtime.server_info.user.identity,
    )
    # auth_result.token을 사용해 사용자를 대신해 GitHub API 호출
```

**샌드박스용 자격 증명 주입.** 에이전트가 [샌드박스](#샌드박스-sandboxes) 내부에서 외부 API를 호출하는 코드를 실행할 경우, [sandbox auth proxy](https://docs.langchain.com/langsmith/sandbox-auth-proxy)가 외부 요청에 자격 증명을 자동으로 주입해 줄 수 있어, 샌드박스 코드는 절대 원본 API 키를 받지 않습니다. 설정 세부 사항은 [Managing secrets](#시크릿-관리-managing-secrets)를 참고하세요.

**Workspace secrets.** 모든 사용자가 공유하는 API 키(예: 조직의 LLM 프로바이더 키, 검색 API 키)는 LangSmith의 [workspace secrets](https://docs.langchain.com/langsmith/set-up-hierarchy#configure-workspace-settings)로 저장하세요. 자세한 내용은 [Managing secrets](#시크릿-관리-managing-secrets)를 참고하세요.

### 비동기 (Async)

LLM 기반 애플리케이션은 I/O 바운드 비중이 높습니다(언어 모델, 데이터베이스, 외부 서비스 호출). 비동기 프로그래밍은 이러한 작업이 블로킹되지 않고 동시에 실행되도록 하여 처리량(throughput)과 응답성을 개선합니다.

> ℹ️ LangChain은 비동기 메서드 이름 앞에 `a`를 붙이는 컨벤션을 따릅니다(예: `ainvoke`, `abefore_agent`, `astream`). 동기/비동기 변형은 같은 클래스 또는 네임스페이스에 있습니다.

프로덕션을 위해 빌드할 때:

- **비동기 도구 생성.** LangChain은 블로킹을 피하기 위해 동기 도구를 별도 스레드에서 실행하지만, 네이티브 비동기를 사용하면 스레딩 오버헤드를 완전히 피할 수 있습니다.
- **비동기 미들웨어 메서드 사용.** 커스텀 [미들웨어](https://docs.langchain.com/oss/python/langchain/middleware/custom)는 비동기 훅(예: `before_agent` 대신 `abefore_agent`)을 구현해야 합니다.
- **외부 리소스 라이프사이클에 비동기 사용.** [샌드박스](#샌드박스-sandboxes) 생성이나 [MCP 서버](https://docs.langchain.com/oss/python/langchain/mcp) 연결은 네트워크 호출을 수반하므로 await 되어야 합니다. 이런 리소스를 프로비저닝하는 [graph factory](https://docs.langchain.com/langsmith/graph-rebuild)가 비동기인 이유이기도 합니다.

### 내구성 (Durability)

Deep Agents는 LangGraph 위에서 실행되며, LangGraph는 [durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)을 기본 제공합니다. [영속화(persistence)](https://docs.langchain.com/oss/python/langgraph/persistence) 계층은 각 단계에서 상태를 체크포인트로 저장하므로, 장애, 타임아웃, [human-in-the-loop](https://docs.langchain.com/oss/python/langgraph/interrupts) 일시정지로 인해 중단된 실행은 마지막 기록 상태에서 이전 단계들을 다시 처리하지 않고 재개됩니다. 많은 서브에이전트를 생성하는 장기 실행 deep agent의 경우, 실행 중 장애가 발생해도 완료된 작업이 손실되지 않음을 의미합니다.

![Durable execution: 워커가 실행 도중 크래시되면 다른 워커가 최신 체크포인트에서 실행을 이어받음](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/durable-execution.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=d3bfd69460769dba142c68c7a20ae43b)

체크포인팅은 다음도 가능하게 합니다.

- **무기한 [인터럽트(interrupts)](https://docs.langchain.com/oss/python/langgraph/interrupts).** Human-in-the-loop 워크플로는 몇 분에서 며칠까지 일시 중지되었다가 정확히 중단된 지점에서 재개될 수 있습니다.
- **[Time travel](https://docs.langchain.com/oss/python/langgraph/use-time-travel).** 체크포인트된 모든 단계는 되감을 수 있는 스냅샷이므로, 문제가 생기면 이전 상태에서 다시 재생할 수 있습니다.
- **민감한 작업의 안전한 처리.** 결제 등 되돌릴 수 없는 작업이 포함된 워크플로의 경우, 체크포인트는 감사 추적(audit trail)과 행동을 유발한 정확한 상태를 검사할 수 있는 복구 지점을 제공합니다.

> 💡 [LangSmith Deployments](https://docs.langchain.com/langsmith/deployment)는 영속 checkpointer를 자동으로 구성합니다. 셀프 호스팅한다면 설정 방법은 [persistence](https://docs.langchain.com/oss/python/langgraph/persistence)를 참고하세요.

---

## 🧷 메모리 (Memory)

메모리가 없으면 모든 대화가 처음부터 시작됩니다. 메모리는 에이전트가 대화 간 정보(사용자 선호, 학습된 지시, 이전 경험)를 유지하게 해주어, 시간이 지남에 따라 동작을 개인화할 수 있게 합니다. 메모리 타입 개요는 [memory concepts guide](https://docs.langchain.com/oss/python/concepts/memory)를 참고하세요.

![단기 메모리는 체크포인트를 통해 단일 스레드 단위, 장기 메모리는 store를 통해 스레드 간 영속화됨](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/memory.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=3ec585271dcd8d62e0207d79d68c296b)

### 범위 설정 (Scoping)

메모리는 항상 대화 간에 영속됩니다. 핵심 질문은 사용자와 어시스턴트 경계 사이에서 어떻게 범위가 지정되는지입니다. 올바른 범위는 누가 데이터를 보고 수정해야 하는지에 따라 달라집니다.

| 범위 | 네임스페이스 | 사용 사례 | 예시 |
| --- | --- | --- | --- |
| **User** (권장 기본값) | `(user_id)` | 사용자별 선호와 컨텍스트 | "간결한 응답을 선호합니다" |
| **Assistant** | `(assistant_id)` | 한 어시스턴트에 대한 공유 지시 | "게시물은 280자로 제한" |
| **Global** | `(org_id)` | 모든 사용자와 어시스턴트를 위한 읽기 전용 정책 | "내부 가격을 절대 공개하지 말 것" |

> ⚠️ 공유 메모리(어시스턴트, 사용자, 조직 범위)는 prompt injection의 벡터가 될 수 있습니다. 한 사용자가 다른 사용자의 대화가 읽는 메모리에 쓸 수 있다면, 악의적인 사용자가 공유 상태에 지시를 주입할 수 있습니다. 적절한 곳에서는 읽기 전용 접근을 강제하세요. 예를 들어 조직 전역 정책은 에이전트가 아닌 애플리케이션 코드에서만 쓸 수 있도록 하세요. 공유 경로에 대한 쓰기를 선언적으로 거부하려면 [permissions](https://docs.langchain.com/oss/python/deepagents/permissions)를, 커스텀 검증 로직이 필요하면 [backend policy hooks](https://docs.langchain.com/oss/python/deepagents/backends#add-policy-hooks)를 사용하세요.

### 설정 (Configuration)

Deep Agents에서는 메모리가 가상 파일 시스템의 파일로 저장됩니다. 기본적으로 파일은 단일 스레드(대화)에 한정되며 스레드 간 공유되지 않습니다.

[`deepagents deploy`](https://docs.langchain.com/oss/python/deepagents/deploy)로 배포할 경우 사용자별 쓰기 가능 메모리가 기본 내장되어 있습니다 — 프로젝트 루트의 `user/AGENTS.md` 템플릿이 인증된 사용자별로 자동 범위 지정됩니다. CLI 단축키는 [User Memory](https://docs.langchain.com/oss/python/deepagents/deploy#user-memory)를, 서브에이전트별 격리 네임스페이스는 [Subagents](https://docs.langchain.com/oss/python/deepagents/deploy#subagents)를 참고하세요.

그 외의 경우, 스레드 간 메모리 공유를 위해 `/memories/`와 같은 경로를 LangGraph [Store](https://docs.langchain.com/langsmith/custom-store)에 쓰는 [StoreBackend](https://reference.langchain.com/python/deepagents/backends/store/StoreBackend)로 라우팅하세요. 에이전트에게 스레드 범위 스크래치 공간과 스레드 간 [장기 메모리](https://docs.langchain.com/oss/python/deepagents/memory)를 모두 제공하려면 [CompositeBackend](https://reference.langchain.com/python/deepagents/backends/composite/CompositeBackend)를 사용하세요.

> ℹ️ 아래 예제의 `rt.server_info`와 `rt.execution_info` 네임스페이스 패턴은 `deepagents>=0.5.0`이 필요합니다.

**User (권장)** — `user_id`로 네임스페이스 지정. 각 사용자는 자신만의 비공개 메모리를 가집니다. 대부분의 애플리케이션이 단일 어시스턴트를 배포하므로 권장 기본값입니다.

```python
# agent.py
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(
                namespace=lambda rt: (
                    rt.server_info.assistant_id,
                    rt.server_info.user.identity,
                ),
            ),
        },
    ),
    system_prompt="""You have persistent memory at /memories/.

    Read /memories/instructions.txt at the start of each conversation for
    accumulated knowledge and preferences. When you learn something that
    should persist, update that file.""",
)
```

**Assistant** — `assistant_id`로 네임스페이스. 같은 어시스턴트의 모든 사용자가 메모리를 공유하므로, 누구나 읽거나 업데이트할 수 있습니다. 특정 어시스턴트를 사용하는 모든 이에게 적용되는 공유 지시나 지식에 사용하세요(예: "항상 격식 있는 톤으로 응답").

```python
# agent.py
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(
                namespace=lambda rt: (
                    rt.server_info.assistant_id,
                ),
            ),
        },
    ),
)
```

**User (단독)** — `user_id`만으로 네임스페이스. 메모리가 모든 어시스턴트에 걸쳐 사용자를 따라갑니다. 사용자가 어떤 어시스턴트와 대화하든 적용되는 전역 사용자 프로필(이름, 시간대, 커뮤니케이션 선호)에 사용하세요.

```python
# agent.py
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(
                namespace=lambda rt: (rt.server_info.user.identity,),
            ),
        },
    ),
)
```

**Organization** — `org_id`로 네임스페이스. 모든 사용자와 어시스턴트가 메모리를 공유합니다. 일반적으로 에이전트가 읽기 전용으로 사용해야 하는 조직 전역 정책(규정 준수 규칙, 브랜드 가이드라인)에 사용합니다. prompt injection 방지를 위해 쓰기 권한은 애플리케이션 코드로 제한해야 합니다.

```python
# agent.py
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(
                namespace=lambda rt: (rt.context.org_id,),
            ),
        },
    ),
)
```

[Store API](https://docs.langchain.com/langsmith/custom-store)를 사용해 애플리케이션 코드에서도 store를 읽고 쓸 수 있습니다. 예시는 [Advanced usage](https://docs.langchain.com/oss/python/deepagents/memory#advanced-usage)를 참고하세요.

전체 네임스페이스 팩토리 API는 [namespace factories](https://docs.langchain.com/oss/python/deepagents/backends#namespace-factories)를 참고하세요. 자기개선 지시 사항, 지식 베이스 같은 메모리 패턴은 [long-term memory](https://docs.langchain.com/oss/python/deepagents/memory)를 참고하세요.

---

## 🛠️ 실행 환경 (Execution environment)

로컬에서는 에이전트가 디스크에 파일을 읽고 쓰고 셸 명령을 직접 실행할 수 있습니다. 프로덕션에서는 격리(isolation)와 영속성(persistence)을 고려해야 합니다. 올바른 셋업은 에이전트가 코드를 실행해야 하는지에 달려 있습니다.

- **파일 시스템 백엔드**는 에이전트가 파일을 읽고 쓰기만 한다면 충분합니다. 영속성 요구에 맞는 백엔드를 선택하세요: 스레드 범위 스크래치 공간, 스레드 간 저장소, 또는 둘의 혼합.
- **샌드박스**는 셸 명령을 실행할 수 있는 `execute` 도구가 있는 격리된 컨테이너를 추가합니다. 에이전트가 코드를 실행하거나, 패키지를 설치하거나, 파일 I/O 이상의 작업을 해야 한다면 샌드박스를 사용하세요.

### 파일 시스템 (Filesystem)

영속화해야 할 대상에 따라 백엔드를 선택하세요.

- [StateBackend](https://reference.langchain.com/python/deepagents/backends/state/StateBackend) (기본값): 스레드 범위 스크래치 공간. 파일은 checkpointer를 통해 스레드 내 턴 간에는 유지되지만 스레드 간에는 공유되지 않습니다. 매 단계마다 체크포인트되므로 큰 파일 쓰기는 피하세요.
- [StoreBackend](https://reference.langchain.com/python/deepagents/backends/store/StoreBackend): 대화 간에도 유지되는 스레드 간 저장소. [namespace factory](https://docs.langchain.com/oss/python/deepagents/backends#namespace-factories)로 범위 지정.
- [CompositeBackend](https://reference.langchain.com/python/deepagents/backends/composite/CompositeBackend): 둘을 혼합. 기본은 스레드 범위 스크래치 공간이고, `/memories/` 같은 특정 경로에는 스레드 간 라우트를 적용.
- [`ContextHubBackend`](https://docs.langchain.com/oss/python/deepagents/backends#contexthubbackend): LangSmith Hub 리포지토리(`owner/name` 또는 `name`)에 있는 내구성 파일. 별도 LangGraph store를 프로비저닝하지 않고 LangSmith 네이티브 영속화를 원할 때 사용하세요.

전체 백엔드 목록과 커스텀 백엔드 빌드 방법은 [backends](https://docs.langchain.com/oss/python/deepagents/backends)를 참고하세요.

> ⚠️ `FilesystemBackend`와 `LocalShellBackend`는 호스트에 직접 접근합니다. 배포된 에이전트에서는 사용하지 마세요.

### 샌드박스 (Sandboxes)

에이전트가 파일을 읽고 쓰는 것 이상으로 코드를 실행해야 한다면 [샌드박스](https://docs.langchain.com/oss/python/deepagents/sandboxes)를 사용하세요. 샌드박스는 격리된 컨테이너 내부에서 파일 시스템과 셸 명령 실행용 `execute` 도구를 모두 제공합니다. 이러한 격리는 호스트도 보호합니다 — 에이전트의 코드가 메모리를 다 써버리거나 크래시되더라도 영향을 받는 것은 샌드박스뿐이며, 서버는 계속 동작합니다.

> 💡 CLI 기반 배포의 경우, `deepagents.toml`의 [`[sandbox]`](https://docs.langchain.com/oss/python/deepagents/deploy#sandbox)에 샌드박스 프로바이더, 템플릿, 이미지, 스코프를 선언하세요 — 번들러가 해당 `langchain-*` 패키지를 설치하고 샌드박스를 배포된 에이전트에 연결해 줍니다.

#### 라이프사이클 (Lifecycle)

핵심 결정 사항은 샌드박스가 얼마나 오래 살아 있는가입니다. 대화마다 새 샌드박스를 받는가, 아니면 대화들이 영속적인 환경을 공유하는가?

| 범위 | 샌드박스 ID 저장 위치 | 라이프사이클 | 사용 사례 예시 |
| --- | --- | --- | --- |
| **Thread-scoped** | [Thread](https://docs.langchain.com/langsmith/use-threads) 메타데이터 | 대화마다 새로 생성, TTL에 의해 정리됨 | 매 대화가 깨끗하게 시작되는 데이터 분석 봇 |
| **Assistant-scoped** | [Assistant](https://docs.langchain.com/langsmith/assistants) 설정 | 모든 대화가 공유 | 대화 간 클론된 리포지토리를 유지하는 코딩 어시스턴트 |

> ℹ️ 아래 예시는 정적 그래프 대신 비동기 [graph factory](https://docs.langchain.com/langsmith/graph-rebuild)를 사용합니다. 샌드박스가 올바른 샌드박스를 조회/생성하려면 `thread_id` 또는 `assistant_id`가 필요하기 때문입니다. Graph factory는 완전한 `Runtime`을 받지 않습니다(`server_info`나 `execution_info` 없음). 대신 `RunnableConfig`를 받아 `config["configurable"]`에서 `thread_id`와 `assistant_id`를 읽어옵니다. 팩토리가 비동기인 이유는 샌드박스 생성이 I/O 바운드 작업이며, 호출 시점에만 사용 가능한 실행별 정보가 필요하기 때문입니다.

**Thread-scoped (가장 일반적)** — 각 대화가 자체 샌드박스를 가집니다. [graph factory](https://docs.langchain.com/langsmith/graph-rebuild)가 실행 config에서 `thread_id`를 읽으므로, 각 [thread](https://docs.langchain.com/langsmith/use-threads)는 자동으로 자체 격리 환경을 가집니다. 프로바이더의 라벨 기반 조회가 실행 간 중복 제거를 처리합니다. 샌드박스 [TTL](https://docs.langchain.com/langsmith/configure-ttl)이 만료되면 정리됩니다.

```python
# agent.py
from daytona import CreateSandboxFromSnapshotParams, Daytona
from deepagents import create_deep_agent
from langchain_core.runnables import RunnableConfig
from langchain_daytona import DaytonaSandbox

client = Daytona()


async def agent(config: RunnableConfig):
    thread_id = config["configurable"]["thread_id"]
    try:
        sandbox = await client.find_one(labels={"thread_id": thread_id})
    except Exception:
        sandbox = await client.create(
            CreateSandboxFromSnapshotParams(
                labels={"thread_id": thread_id},
                auto_delete_interval=3600,  # TTL: 유휴 상태일 때 정리
            )
        )
    return create_deep_agent(
        model="google_genai:gemini-3.1-pro-preview",
        backend=DaytonaSandbox(sandbox=sandbox)
    )
```

**Assistant-scoped** — 모든 대화가 하나의 샌드박스를 공유합니다. [graph factory](https://docs.langchain.com/langsmith/graph-rebuild)가 `config["configurable"]`에서 [assistant](https://docs.langchain.com/langsmith/assistants) ID를 읽으므로, 같은 어시스턴트의 모든 스레드는 동일한 환경으로 돌아갑니다. 파일, 설치된 패키지, 클론된 리포지토리가 대화 간에 유지됩니다.

```python
# agent.py
from daytona import CreateSandboxFromSnapshotParams, Daytona
from deepagents import create_deep_agent
from langchain_core.runnables import RunnableConfig
from langchain_daytona import DaytonaSandbox

client = Daytona()


async def agent(config: RunnableConfig):
    assistant_id = config["configurable"]["assistant_id"]
    try:
        sandbox = await client.find_one(labels={"assistant_id": assistant_id})
    except Exception:
        sandbox = await client.create(
            CreateSandboxFromSnapshotParams(labels={"assistant_id": assistant_id})
        )
    return create_deep_agent(
        model="google_genai:gemini-3.1-pro-preview",
        backend=DaytonaSandbox(sandbox=sandbox)
    )
```

> ⚠️ Assistant-scoped 샌드박스는 시간이 지나면서 파일, 설치된 패키지, 기타 샌드박스 내 상태가 누적됩니다. 샌드박스의 디스크와 메모리가 무한정 커지지 않도록, 샌드박스 프로바이더에서 TTL을 구성하거나 주기적으로 스냅샷으로 리셋하거나 정리 로직을 구현하세요.

`agent` 변수가 컴파일된 그래프가 아니라 비동기 함수이기 때문에, 서버는 이를 [graph factory](https://docs.langchain.com/langsmith/graph-rebuild)로 취급하여 매 실행 시 호출하고 config를 주입합니다. 팩토리는 프로바이더의 라벨 기반 검색을 통해 샌드박스를 조회하거나 생성한 후, 해당 샌드박스에 연결된 새 에이전트 그래프를 반환합니다.

`langgraph deploy`로 배포한 후에는 SDK를 사용해 애플리케이션 코드에서 에이전트를 호출합니다. 클라이언트 측 코드는 범위에 관계없이 동일합니다. 범위 지정은 위 에이전트 팩토리에서 전적으로 처리되지만, 동작은 다음과 같이 다릅니다.

**Thread-scoped**:

```python
# client.py
from langgraph_sdk import get_client

client = get_client(url="<DEPLOYMENT_URL>", api_key="<LANGSMITH_API_KEY>")

# 대화 1: pandas 설치 및 데이터 분석
thread_1 = await client.threads.create()
async for chunk in client.runs.stream(
    thread_1["thread_id"],
    "agent",
    input={"messages": [{"role": "human", "content": "Install pandas and analyze sales_data.csv"}]},
    stream_mode="updates",
):
    print(chunk.data)

# 같은 대화의 후속 메시지 — pandas는 여전히 설치되어 있음
async for chunk in client.runs.stream(
    thread_1["thread_id"],
    "agent",
    input={"messages": [{"role": "human", "content": "Now plot the results"}]},
    stream_mode="updates",
):
    print(chunk.data)

# 대화 2: 새 샌드박스 — pandas는 설치되어 있지 않고, 대화 1의 파일도 없음
thread_2 = await client.threads.create()
async for chunk in client.runs.stream(
    thread_2["thread_id"],
    "agent",
    input={"messages": [{"role": "human", "content": "What packages are installed?"}]},
    stream_mode="updates",
):
    print(chunk.data)
```

**Assistant-scoped**:

```python
# client.py
from langgraph_sdk import get_client

client = get_client(url="<DEPLOYMENT_URL>", api_key="<LANGSMITH_API_KEY>")

# 대화 1: 프로젝트 클론 및 셋업
thread_1 = await client.threads.create()
async for chunk in client.runs.stream(
    thread_1["thread_id"],
    "agent",
    input={"messages": [{"role": "human", "content": "Clone https://github.com/org/repo and install dependencies"}]},
    stream_mode="updates",
):
    print(chunk.data)

# 대화 2: 리포지토리와 의존성이 여전히 존재함
thread_2 = await client.threads.create()
async for chunk in client.runs.stream(
    thread_2["thread_id"],
    "agent",
    input={"messages": [{"role": "human", "content": "Run the test suite and fix any failures"}]},
    stream_mode="updates",
):
    print(chunk.data)
```

#### 파일 전송 (File transfers)

샌드박스는 격리된 컨테이너이므로 애플리케이션 코드에서 직접 그 안의 파일에 접근할 수 없습니다. 샌드박스 경계를 가로질러 데이터를 옮기려면 `upload_files()`와 `download_files()`를 사용하세요.

- **에이전트 실행 전에 샌드박스에 시드 데이터 제공**: 사용자 파일, [스킬](https://docs.langchain.com/oss/python/deepagents/skills) 스크립트, 설정, [영속 메모리](https://docs.langchain.com/oss/python/deepagents/memory)를 업로드하여 에이전트가 시작부터 필요한 것을 갖추도록 합니다.
- **에이전트 완료 후 결과 회수**: 생성된 결과물(리포트, 플롯, 익스포트)을 다운로드하고, 업데이트된 메모리를 후속 대화를 위해 다시 동기화합니다.

프로바이더별 파일 전송 예시는 [working with files](https://docs.langchain.com/oss/python/deepagents/sandboxes#working-with-files)를 참고하세요. 프로바이더 셋업, 보안, 라이프사이클 패턴은 전체 [샌드박스 가이드](https://docs.langchain.com/oss/python/deepagents/sandboxes)를 참고하세요.

<details>
<summary>예시: 커스텀 미들웨어로 스킬과 메모리 동기화</summary>

에이전트가 실행해야 할 [스킬](https://docs.langchain.com/oss/python/deepagents/skills) 스크립트는 에이전트가 실행되기 전에 샌드박스에 업로드되어야 합니다. 또한 에이전트가 컨테이너 내에서 [메모리](https://docs.langchain.com/oss/python/deepagents/memory)를 읽고 업데이트할 수 있도록 동기화하고 싶을 수도 있습니다. `before_agent`와 `after_agent` 훅을 가진 [커스텀 미들웨어](https://docs.langchain.com/oss/python/langchain/middleware/custom)를 사용해 샌드박스 경계를 가로질러 파일을 옮기세요.

```python
# agent.py
from deepagents import create_deep_agent
from langchain.agents.middleware import AgentMiddleware, AgentState
from langgraph.runtime import Runtime


def _safe_filename(key: str) -> str:
    """Reject keys that contain path traversal or glob characters."""
    name = key.split("/")[-1]
    if ".." in name or any(c in name for c in ("*", "?")):
        raise ValueError(f"Invalid key: {key}")
    return name


class SandboxSyncMiddleware(AgentMiddleware):
    """Sync skills and memories between the store and the sandbox."""

    def __init__(self, backend: CompositeBackend):
        super().__init__()
        self.backend = backend

    async def abefore_agent(self, state: AgentState, runtime: Runtime) -> None:
        """Upload skill scripts and memories into the sandbox."""
        user_id = runtime.server_info.user.identity
        store = runtime.store
        files = []
        for item in await store.asearch(("skills", user_id)):
            name = _safe_filename(item.key)
            files.append((f"/skills/{name}", item.value["content"].encode()))
        for item in await store.asearch(("memories", user_id)):
            name = _safe_filename(item.key)
            files.append((f"/memories/{name}", item.value["content"].encode()))
        if files:
            await self.backend.upload_files(files)

    async def aafter_agent(self, state: AgentState, runtime: Runtime) -> None:
        """Sync updated memories back to the store."""
        user_id = runtime.server_info.user.identity
        store = runtime.store
        items = await store.asearch(("memories", user_id))
        results = await self.backend.download_files(
            [f"/memories/{item.key}" for item in items]
        )
        for result in results:
            if result.content is not None:
                await store.aput(
                    ("memories", user_id),
                    result.path.split("/")[-1],
                    {"content": result.content.decode()},
                )


backend = CompositeBackend(
    default=DaytonaSandbox(sandbox=sandbox),
    routes={
        "/skills/": StoreBackend(
            rt,
            namespace=lambda rt: ("skills", rt.server_info.user.identity),
        ),
        "/memories/": StoreBackend(
            rt,
            namespace=lambda rt: ("memories", rt.server_info.user.identity),
        ),
    },
)

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=backend,
    middleware=[SandboxSyncMiddleware(backend)],
)
```

</details>

#### 시크릿 관리 (Managing secrets)

샌드박스는 격리된 컨테이너이므로 호스트의 환경 변수가 그 안에서 사용 가능하지 않습니다. 샌드박스 코드에 API 키와 기타 시크릿을 제공하는 방법은 두 가지입니다.

**Auth proxy (권장).** [sandbox auth proxy](https://docs.langchain.com/langsmith/sandbox-auth-proxy)는 샌드박스에서 나가는 요청을 가로채 인증 헤더를 자동으로 주입합니다. 샌드박스 코드는 외부 API를 평소처럼 호출하고, 프록시가 목적지 호스트에 따라 올바른 자격 증명을 추가합니다. 이는 API 키가 샌드박스 코드, 환경 변수, 로그 어디에도 나타나지 않는다는 뜻입니다.

![sandbox auth proxy가 외부 요청에 자격 증명을 주입하여 시크릿이 샌드박스에 절대 들어가지 않게 함](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/sandbox-auth-proxy.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=632c4a493f1d5928e41c6865ab86d1da)

```json
{
  "proxy_config": {
    "rules": [
      {
        "name": "openai-api",
        "match_hosts": ["api.openai.com"],
        "inject_headers": {
          "Authorization": "Bearer ${OPENAI_API_KEY}"
        }
      },
      {
        "name": "anthropic-api",
        "match_hosts": ["api.anthropic.com"],
        "inject_headers": {
          "x-api-key": "${ANTHROPIC_API_KEY}"
        }
      }
    ]
  }
}
```

`${SECRET_KEY}` 참조는 LangSmith [workspace settings](https://docs.langchain.com/langsmith/set-up-hierarchy#configure-workspace-settings)에 저장된 시크릿에 대해 해석됩니다. 이를 참조하는 템플릿을 만들기 전에 거기에서 시크릿을 먼저 구성하세요.

**Workspace secrets.** 프록시 기반 주입이 필요하지 않은 API 키(예: 샌드박스 코드가 아닌 에이전트 서버 자체가 사용하는 키)는 LangSmith의 [workspace secrets](https://docs.langchain.com/langsmith/set-up-hierarchy#configure-workspace-settings)로 저장하세요. 이들은 워크스페이스의 모든 에이전트에서 런타임 환경 변수로 사용 가능합니다. CLI로 배포하는 경우, `deepagents.toml` 옆의 [`.env` 파일](https://docs.langchain.com/oss/python/deepagents/deploy#environment-variables)이 번들과 함께 업로드되어 에이전트 서버 키로 사용됩니다. 샌드박스 코드가 호출하는 것들은 auth proxy에 맡기세요.

> ⚠️ 환경 변수나 파일 업로드를 통해 샌드박스에 시크릿을 전달하지 마세요. 에이전트는 자격 증명을 포함해 샌드박스 내의 모든 접근 가능한 파일이나 환경 변수를 읽을 수 있습니다. Auth proxy는 시크릿을 샌드박스에서 완전히 차단합니다.

---

## 🔒 가드레일 (Guardrails)

프로덕션의 에이전트는 자율적으로 실행되므로, 무한히 반복하거나, 속도 제한에 걸리거나, 민감한 정보가 포함된 사용자 데이터를 처리할 수 있습니다. Deep Agents는 두 가지 보호 계층을 제공합니다.

> ℹ️ 커스텀 미들웨어는 현재 [`deepagents deploy`](https://docs.langchain.com/oss/python/deepagents/deploy#limitations)를 통해 설정할 수 없습니다. 아래 미들웨어 패턴을 적용하려면 자체 에이전트 모듈로 [LangSmith Deployments](https://docs.langchain.com/langsmith/deployment)를 통해 직접 배포하세요.

- **[Permissions(권한)](https://docs.langchain.com/oss/python/deepagents/permissions)**: 에이전트가 어떤 파일과 디렉터리를 읽거나 쓸 수 있는지 제어하는 선언적 허용/거부 규칙. 에이전트를 작업 디렉터리에 격리하거나, 민감한 파일을 보호하거나, 읽기 전용 메모리를 강제하는 데 사용하세요.
- **[Middleware(미들웨어)](https://docs.langchain.com/oss/python/langchain/middleware/built-in)**: 속도 제한, 에러 처리, 데이터 프라이버시를 위해 모델 및 도구 호출을 감싸는 훅.

![미들웨어 훅 — before_model, wrap_model_call, wrap_tool_call, after_model — 이 에이전트 루프를 감싸 모든 관련 단계 주변에서 정책이 결정적으로 실행됨](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/middleware-lifecycle.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=0d30b34aba2b829a1b763b975cfb2817)

### 속도 제한 (Rate limiting)

여기서의 속도 제한은 에이전트 자체의 LLM 및 도구 사용을 실행 내에서 제한한다는 의미이며, 들어오는 요청에 대한 API 게이트웨이 속도 제한이 아닙니다.

제한이 없으면 혼란스러워진 에이전트가 같은 도구를 반복 호출하거나 수백 번의 모델 호출을 하면서 몇 분 안에 LLM API 예산을 다 써버릴 수 있습니다. 실행당 모델 호출과 도구 실행 양쪽에 상한을 설정하세요.

```python
from deepagents import create_deep_agent
from langchain.agents.middleware import ModelCallLimitMiddleware, ToolCallLimitMiddleware

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    middleware=[
        ModelCallLimitMiddleware(run_limit=50),
        ToolCallLimitMiddleware(run_limit=200),
    ],
)
```

`run_limit`은 단일 호출(invocation) 내 호출 수를 제한합니다(매 턴마다 리셋). `thread_limit`은 전체 대화에 걸쳐 호출 수를 제한합니다(checkpointer 필요). 전체 설정은 [ModelCallLimitMiddleware](https://reference.langchain.com/python/langchain/agents/middleware/model_call_limit/ModelCallLimitMiddleware)와 [ToolCallLimitMiddleware](https://reference.langchain.com/python/langchain/agents/middleware/tool_call_limit/ToolCallLimitMiddleware)를 참고하세요.

### 에러 처리 (Handling errors)

모든 에러를 같은 방식으로 처리해서는 안 됩니다. 일시적인 실패(네트워크 타임아웃, 속도 제한)는 자동 재시도해야 합니다. LLM이 복구할 수 있는 에러(잘못된 도구 출력, 파싱 실패)는 모델에 다시 피드백해야 합니다. 사람의 입력이 필요한 에러는 에이전트를 일시 중지해야 합니다. 코드 예시가 포함된 전체 분석은 [Handle errors appropriately](https://docs.langchain.com/oss/python/langgraph/thinking-in-langgraph#handle-errors-appropriately)를 참고하세요.

미들웨어는 일시적인 경우를 처리합니다. 모델 호출과 도구 호출 각각에 지수 백오프(exponential backoff)를 가진 재시도 미들웨어가 있습니다. 주요 모델 프로바이더가 완전히 다운되면, fallback 미들웨어가 대체 모델로 전환합니다.

```python
from deepagents import create_deep_agent
from langchain.agents.middleware import (
    ModelFallbackMiddleware,
    ModelRetryMiddleware,
    ToolRetryMiddleware,
)

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    middleware=[
        # 속도 제한, 타임아웃, 5xx 에러에 대해 모델 호출 재시도
        ModelRetryMiddleware(max_retries=3, backoff_factor=2.0, initial_delay=1.0),
        # 기본 모델이 완전히 다운되면 대체 모델로 전환
        ModelFallbackMiddleware("gpt-5.4"),
        # 외부 API에 도달하는 특정 도구만 재시도 (모든 도구가 아님)
        ToolRetryMiddleware(
            max_retries=2,
            tools=["search", "fetch_url"],
            retry_on=(TimeoutError, ConnectionError),
        ),
    ],
)
```

[ToolRetryMiddleware](https://reference.langchain.com/python/langchain/agents/middleware/tool_retry/ToolRetryMiddleware)는 모든 것을 재시도하지 말고 특정 도구로 범위를 좁히세요. 파일 시스템 `read_file`이 실패한 경우 재시도해도 이점이 없지만, 타임아웃된 웹 검색은 재시도가 도움이 될 가능성이 높습니다. 전체 설정은 [ModelRetryMiddleware](https://reference.langchain.com/python/langchain/agents/middleware/model_retry/ModelRetryMiddleware)와 [ModelFallbackMiddleware](https://reference.langchain.com/python/langchain/agents/middleware/model_fallback/ModelFallbackMiddleware)를 참고하세요.

### 데이터 프라이버시 (Data privacy)

에이전트가 이메일, 신용카드 번호 또는 기타 PII가 포함될 수 있는 사용자 입력을 처리하는 경우, 모델에 도달하거나 로그에 저장되기 전에 이를 탐지하고 처리할 수 있습니다.

```python
from deepagents import create_deep_agent
from langchain.agents.middleware import PIIMiddleware

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    middleware=[
        PIIMiddleware("email", strategy="redact", apply_to_input=True),
        PIIMiddleware("credit_card", strategy="mask", apply_to_input=True),
    ],
)
```

전략에는 `redact`(`[REDACTED_EMAIL]`로 대체), `mask`(예: `****-****-****-1234` 부분 마스킹), `hash`(결정적 해시), `block`(에러 발생)이 있습니다. 도메인별 패턴을 위한 커스텀 디텍터(detector)도 작성할 수 있습니다. 전체 설정은 [PIIMiddleware](https://reference.langchain.com/python/langchain/agents/middleware/pii/PIIMiddleware)를 참고하세요.

사용 가능한 미들웨어 전체 목록은 [prebuilt middleware](https://docs.langchain.com/oss/python/langchain/middleware/built-in)를 참고하세요.

---

## 🖥️ 프론트엔드 (Frontend)

Deep Agents는 UI를 에이전트 백엔드에 연결하기 위해 [`useStream`](https://docs.langchain.com/oss/python/langchain/frontend/overview)을 사용합니다. `useStream`은 React, Vue, Svelte, Angular용으로 제공되는 프론트엔드 훅으로, 에이전트에서 메시지, 서브에이전트 진행 상황, 커스텀 상태를 실시간으로 스트리밍합니다.

> 💡 커스텀 UI가 필요하지 않다면, [`deepagents deploy`](https://docs.langchain.com/oss/python/deepagents/deploy)는 배포 URL의 `/app`에 마운트된 prebuilt React chat UI를 제공합니다 — 설정은 [`[frontend]`](https://docs.langchain.com/oss/python/deepagents/deploy#frontend)를 참고하세요. 번들된 UI는 스트리밍, 스레드 선택, 라이브 todos/files/subagent 패널, Clerk/Supabase/익명 인증을 기본 제공합니다.

로컬에서 `useStream`은 `http://localhost:2024`를 가리킵니다. 프로덕션에서는 [LangSmith Deployment](https://docs.langchain.com/langsmith/deployment)를 가리키도록 설정하고, 연결이 끊겨도 사용자가 진행 상황을 잃지 않도록 재연결을 구성하세요.

```tsx
import { useStream } from "@langchain/react";

function App() {
  const stream = useStream<typeof agent>({
    apiUrl: "https://your-deployment.langsmith.dev",
    assistantId: "agent",
    reconnectOnMount: true,    // 페이지 새로고침이나 네비게이션 후 스트림 재개
    fetchStateHistory: true,   // 마운트 시 전체 스레드 히스토리 로드
  });
}
```

`reconnectOnMount`는 진행 중인 실행을 자동으로 이어 받습니다. 에이전트가 작업 중일 때 사용자가 새로고침하면 빈 화면이 아니라 실행이 계속되는 모습을 보게 됩니다. `fetchStateHistory`는 스레드의 전체 대화 히스토리를 로드하므로 돌아온 사용자가 이전 메시지를 볼 수 있습니다.

많은 서브에이전트를 생성하는 deep agent 워크플로의 경우, 장기 실행을 잘라먹지 않도록 제출 시 높은 `recursionLimit`을 설정하세요.

```tsx
stream.submit(
  { messages: [{ type: "human", content: text }] },
  {
    streamSubgraphs: true,
    config: { recursionLimit: 10000 },
  },
);
```

서브에이전트 카드, todo 목록, 커스텀 상태 렌더링 등 deep agent 전용 UI 패턴은 [frontend guide](https://docs.langchain.com/oss/python/deepagents/frontend/overview)를 참고하세요.

---

> 📝 이 문서를 Claude, VSCode 등에 MCP를 통해 실시간 답변용으로 [연결](https://docs.langchain.com/use-these-docs)할 수 있습니다. [GitHub에서 페이지 편집](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/going-to-production.mdx) 또는 [이슈 등록](https://github.com/langchain-ai/docs/issues/new/choose)도 가능합니다.
