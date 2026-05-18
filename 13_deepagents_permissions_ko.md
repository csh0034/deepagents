# Deep Agents 권한 (Permissions)

> 원문: https://docs.langchain.com/oss/python/deepagents/permissions
>
> 선언적 권한 규칙으로 Deep Agents의 파일 시스템 접근을 제어합니다.

---

## 📖 목차

1. [📌 권한 개요](#-권한-개요)
2. [🚀 기본 사용법 (Basic usage)](#-기본-사용법-basic-usage)
3. [🧩 규칙 구조 (Rule structure)](#-규칙-구조-rule-structure)
4. [📝 예시 (Examples)](#-예시-examples)
5. [👥 서브에이전트 권한 (Subagent permissions)](#-서브에이전트-권한-subagent-permissions)
6. [🧬 Composite 백엔드와 권한](#-composite-백엔드와-권한)

---

선언적 권한 규칙으로 에이전트가 읽거나 쓸 수 있는 파일과 디렉토리를 제어할 수 있습니다. `permissions=`에 규칙 목록을 전달하면 에이전트의 기본 내장 파일 시스템 도구가 이를 준수합니다.

> ℹ️ 권한 기능은 `deepagents>=0.5.2`를 필요로 합니다.

권한은 **기본 내장 파일 시스템 도구**(`ls`, `read_file`, `glob`, `grep`, `write_file`, `edit_file`)에만 적용됩니다. 파일 시스템에 접근하는 커스텀 도구와 MCP 도구는 대상이 아닙니다. 또한 권한은 `execute` 도구를 통해 임의의 명령 실행을 지원하는 [샌드박스 백엔드](https://docs.langchain.com/oss/python/deepagents/sandboxes)에도 적용되지 않습니다.

> 💡 **기본 내장 파일 시스템 도구**에 대해 **경로 기반 allow/deny 규칙**이 필요하다면 `permissions`를 사용하세요. 커스텀 검증 로직(레이트 리미팅, 감사 로깅, 콘텐츠 검사)이나 커스텀 도구 제어가 필요하다면 [백엔드 정책 훅](https://docs.langchain.com/oss/python/deepagents/backends#add-policy-hooks)을 사용하세요.

---

## 📌 권한 개요

권한은 에이전트가 파일 시스템에서 무엇을 할 수 있는지를 선언적으로 표현하는 규칙입니다. 각 규칙은 어떤 작업(operations), 어떤 경로(paths), 어떤 모드(mode: allow 또는 deny)에 해당하는지 지정합니다. 규칙은 선언된 순서대로 평가되며, 처음 일치하는 규칙이 결정합니다.

---

## 🚀 기본 사용법 (Basic usage)

[`FilesystemPermission`](https://reference.langchain.com/python/deepagents/middleware/permissions/FilesystemPermission) 규칙 목록을 [`create_deep_agent`](https://reference.langchain.com/python/deepagents/graph/create_deep_agent)에 전달합니다. 규칙은 선언 순서대로 평가됩니다. 첫 번째로 일치하는 규칙이 승리합니다. 일치하는 규칙이 없다면, 해당 작업은 **허용**됩니다.

```python
from deepagents import FilesystemPermission, create_deep_agent


# 읽기 전용 에이전트: 모든 쓰기 거부
agent = create_deep_agent(
    model=model,
    backend=backend,
    permissions=[
        FilesystemPermission(
            operations=["write"],
            paths=["/**"],
            mode="deny",
        ),
    ],
)
```

---

## 🧩 규칙 구조 (Rule structure)

각 `FilesystemPermission`은 세 개의 필드를 가집니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `operations` | `list["read" \| "write"]` | 규칙이 적용되는 작업. `"read"`는 `ls`, `read_file`, `glob`, `grep`을 포함. `"write"`는 `write_file`, `edit_file`을 포함. |
| `paths` | `list[str]` | 파일 경로 매칭용 글롭 패턴(예: `["/workspace/**"]`). 재귀 매칭의 `**`와 대체(alternation)의 `{a,b}` 지원. |
| `mode` | `"allow" \| "deny"` | 일치하는 작업을 허용/거부할지. 기본값은 `"allow"`. |

규칙은 first-match-wins 평가를 사용합니다. `operations`와 `paths`가 현재 호출과 일치하는 첫 번째 규칙이 결과를 결정합니다. 일치하는 규칙이 없다면 호출은 **허용**됩니다(허용형 기본값, permissive default).

---

## 📝 예시 (Examples)

### 워크스페이스 디렉토리로 격리

`/workspace/` 아래에서만 읽기/쓰기를 허용하고 그 외 모든 것은 거부합니다.

```python
agent = create_deep_agent(
    model=model,
    backend=backend,
    permissions=[
        FilesystemPermission(
            operations=["read", "write"],
            paths=["/workspace/**"],
            mode="allow",
        ),
        FilesystemPermission(
            operations=["read", "write"],
            paths=["/**"],
            mode="deny",
        ),
    ],
)
```

### 특정 파일 보호

```python
agent = create_deep_agent(
    model=model,
    backend=backend,
    permissions=[
        FilesystemPermission(
            operations=["read", "write"],
            paths=["/workspace/.env", "/workspace/examples/**"],
            mode="deny",
        ),
        FilesystemPermission(
            operations=["read", "write"],
            paths=["/workspace/**"],
            mode="allow",
        ),
        FilesystemPermission(
            operations=["read", "write"],
            paths=["/**"],
            mode="deny",
        ),
    ],
)
```

### 읽기 전용 메모리

에이전트가 메모리 파일을 읽을 수는 있지만 수정하지는 못하도록 허용합니다. 조직 전체 정책이나, 애플리케이션 코드에서만 갱신되어야 하는 공유 지식 베이스에 유용합니다. 자세한 컨텍스트는 [read-only vs writable memory](https://docs.langchain.com/oss/python/deepagents/memory#read-only-vs-writable-memory)를 참고하세요.

```python
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend

agent = create_deep_agent(
    model=model,
    backend=CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(
                namespace=lambda rt: (rt.server_info.user.identity,),
            ),
            "/policies/": StoreBackend(
                namespace=lambda rt: (rt.context.org_id,),
            ),
        },
    ),
    permissions=[
        FilesystemPermission(
            operations=["write"],
            paths=["/memories/**", "/policies/**"],
            mode="deny",
        ),
    ],
)
```

### 모든 접근 차단

모든 읽기와 쓰기를 차단합니다. 더 구체적인 allow 규칙을 그 위에 쌓을 수 있는 제한적인 베이스라인입니다.

```python
agent = create_deep_agent(
    model=model,
    backend=backend,
    permissions=[
        FilesystemPermission(
            operations=["read", "write"],
            paths=["/**"],
            mode="deny",
        ),
    ],
)
```

### 규칙 순서 (Rule ordering)

first-match-wins 평가이므로 규칙 순서가 중요합니다. 더 구체적인 규칙을 더 일반적인 규칙 앞에 배치하세요.

```python
# 올바름: .env 거부, workspace 허용, 그 외 모두 거부
correct_permissions = [
    FilesystemPermission(
        operations=["read", "write"],
        paths=["/workspace/.env"],
        mode="deny",
    ),
    FilesystemPermission(
        operations=["read", "write"],
        paths=["/workspace/**"],
        mode="allow",
    ),
    FilesystemPermission(
        operations=["read", "write"],
        paths=["/**"],
        mode="deny",
    ),
]

# 버그: /workspace/**가 .env와 먼저 일치하므로 deny가 결코 실행되지 않음
incorrect_permissions = [
    FilesystemPermission(
        operations=["read", "write"],
        paths=["/workspace/**"],
        mode="allow",
    ),
    FilesystemPermission(
        operations=["read", "write"],
        paths=["/workspace/.env"],
        mode="deny",  # 도달하지 않음
    ),
    FilesystemPermission(
        operations=["read", "write"],
        paths=["/**"],
        mode="deny",
    ),
]
```

---

## 👥 서브에이전트 권한 (Subagent permissions)

[서브에이전트](https://docs.langchain.com/oss/python/deepagents/subagents)는 기본적으로 부모 에이전트의 권한을 상속합니다. 서브에이전트에 다른 권한을 부여하려면 스펙(spec)의 `permissions` 필드를 설정합니다. 이는 부모의 규칙을 **완전히 대체(replace)** 합니다.

```python
agent = create_deep_agent(
    model=model,
    backend=backend,
    permissions=[
        FilesystemPermission(
            operations=["read", "write"],
            paths=["/workspace/**"],
            mode="allow",
        ),
        FilesystemPermission(
            operations=["read", "write"],
            paths=["/**"],
            mode="deny",
        ),
    ],
    subagents=[
        {
            "name": "auditor",
            "description": "Read-only code reviewer",
            "system_prompt": "Review the code for issues.",
            "permissions": [
                FilesystemPermission(
                    operations=["write"],
                    paths=["/**"],
                    mode="deny",
                ),
                FilesystemPermission(
                    operations=["read"],
                    paths=["/workspace/**"],
                    mode="allow",
                ),
                FilesystemPermission(
                    operations=["read"],
                    paths=["/**"],
                    mode="deny",
                ),
            ],
        }
    ],
)
```

---

## 🧬 Composite 백엔드와 권한

샌드박스를 기본값(default)으로 두는 [`CompositeBackend`](https://reference.langchain.com/python/deepagents/backends/composite/CompositeBackend)를 사용하는 경우, 모든 권한 경로는 알려진 라우트 접두사(route prefix) 아래에 속해야 합니다. 샌드박스는 임의의 명령 실행을 지원하므로, 경로 기반 제한만으로는 셸 명령을 통한 파일 시스템 접근을 막을 수 없습니다. 권한을 라우트별 [백엔드](https://docs.langchain.com/oss/python/deepagents/backends)로 한정하면 이 충돌을 피할 수 있습니다.

```python
from deepagents.backends import CompositeBackend


composite = CompositeBackend(
    default=sandbox,
    routes={"/memories/": memories_backend},
)

# 동작함: 권한이 /memories/ 라우트로 한정됨
agent = create_deep_agent(
    model=model,
    backend=composite,
    permissions=[
        FilesystemPermission(
            operations=["write"],
            paths=["/memories/**"],
            mode="deny",
        ),
    ],
)
```

어떤 라우트에도 속하지 않는 경로가 권한에 포함되면 `NotImplementedError`가 발생합니다.

```python
# NotImplementedError 발생: /workspace/**가 샌드박스 default에 걸림
try:
    create_deep_agent(
        model=model,
        backend=composite,
        permissions=[
            FilesystemPermission(
                operations=["write"],
                paths=["/workspace/**"],
                mode="deny",
            ),
        ],
    )
except NotImplementedError:
    pass

# 마찬가지로 발생: /**는 라우트와 default 모두를 커버
try:
    create_deep_agent(
        model=model,
        backend=composite,
        permissions=[
            FilesystemPermission(
                operations=["read"],
                paths=["/**"],
                mode="deny",
            ),
        ],
    )
except NotImplementedError:
    pass
```

---

## 📚 참고

- [Backends](https://docs.langchain.com/oss/python/deepagents/backends) — 파일 시스템 백엔드 전반
- [Backend policy hooks](https://docs.langchain.com/oss/python/deepagents/backends#add-policy-hooks) — 커스텀 검증 로직
- [Memory](https://docs.langchain.com/oss/python/deepagents/memory#read-only-vs-writable-memory) — 읽기 전용/쓰기 가능 메모리
- [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents) — 서브에이전트 권한 상속/재정의
- [Sandboxes](https://docs.langchain.com/oss/python/deepagents/sandboxes) — 샌드박스 백엔드와 권한의 한계
