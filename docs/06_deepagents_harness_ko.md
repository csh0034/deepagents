# Harness 기능 (Harness capabilities)

> 원문: https://docs.langchain.com/oss/python/deepagents/harness
>
> 장시간 실행되는 에이전트 구축을 쉽게 만들어 주는 Deep Agents 하니스의 핵심 기능들을 살펴봅니다.

---

## 📖 목차

1. [계획 수립 기능 (Planning capabilities)](#-계획-수립-기능-planning-capabilities)
2. [가상 파일 시스템 접근 (Virtual filesystem access)](#-가상-파일-시스템-접근-virtual-filesystem-access)
3. [파일 시스템 권한 (Filesystem permissions)](#-파일-시스템-권한-filesystem-permissions)
4. [작업 위임 / 서브에이전트 (Task delegation / subagents)](#-작업-위임-서브에이전트-task-delegation-subagents)
5. [컨텍스트 관리 (Context management)](#-컨텍스트-관리-context-management)
6. [코드 실행 (Code execution)](#-코드-실행-code-execution)
7. [Human-in-the-loop](#-human-in-the-loop)
8. [스킬 (Skills)](#-스킬-skills)
9. [메모리 (Memory)](#-메모리-memory)
10. [하니스 프로파일 (Harness profiles)](#-하니스-프로파일-harness-profiles)

---

에이전트 **하니스(harness)** 는 장시간 실행되는 에이전트를 더 쉽게 구축할 수 있도록 해주는 여러 기능들의 조합입니다.

- [계획 수립 기능 (Planning capabilities)](#-계획-수립-기능-planning-capabilities)
- [가상 파일 시스템 (Virtual filesystem)](#-가상-파일-시스템-접근-virtual-filesystem-access)
- [파일 시스템 권한 (Filesystem permissions)](#-파일-시스템-권한-filesystem-permissions)
- [작업 위임 / 서브에이전트 (Task delegation / subagents)](#-작업-위임-서브에이전트-task-delegation-subagents)
- [컨텍스트 및 토큰 관리 (Context and token management)](#-컨텍스트-관리-context-management)
- [코드 실행 (Code execution)](#-코드-실행-code-execution)
- [Human-in-the-loop](#-human-in-the-loop)
- [하니스 프로파일 (Harness profiles)](#-하니스-프로파일-harness-profiles)

이러한 기능들과 더불어, Deep Agents는 추가적인 컨텍스트와 지시 사항을 위해 [스킬(Skills)](#-스킬-skills)과 [메모리(Memory)](#-메모리-memory)를 사용합니다.

![Deep Agents 오픈 하니스: 계획 수립, 가상 파일 시스템, 권한, 서브에이전트, 컨텍스트 관리, 코드 실행, human-in-the-loop, 스킬, 메모리](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/open-harness.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=aad6b98dc01a1401c96c46e36f3c4dd9)

---

## 🧩 계획 수립 기능 (Planning capabilities)

하니스는 에이전트가 구조화된 작업 목록을 관리할 수 있도록 `write_todos` 도구를 제공합니다.

**기능:**

- 상태(`'pending'`, `'in_progress'`, `'completed'`)와 함께 여러 작업을 추적
- 에이전트 상태(state)에 영속화
- 복잡한 다단계 작업을 정리하는 데 도움
- 장기 실행 작업과 계획 수립에 유용

---

## 📁 가상 파일 시스템 접근 (Virtual filesystem access)

하니스는 여러 플러그형(pluggable) 백엔드로 구동될 수 있는 구성 가능한 가상 파일 시스템(virtual filesystem)을 제공합니다. 백엔드는 다음과 같은 파일 시스템 작업을 지원합니다.

| 도구 | 설명 |
| --- | --- |
| `ls` | 메타데이터(크기, 수정 시간)와 함께 디렉터리의 파일 목록을 표시 |
| `read_file` | 줄 번호와 함께 파일 내용을 읽음. 큰 파일을 위해 offset/limit를 지원하며, 텍스트가 아닌 파일(이미지, 비디오, 오디오, 문서)에 대해 멀티모달 콘텐츠 블록 반환도 지원. 지원 확장자는 아래 참고 |
| `write_file` | 새 파일 생성 |
| `edit_file` | 파일 내 정확한 문자열 치환 수행(글로벌 치환 모드 지원) |
| `glob` | 패턴(예: `**/*.py`)과 일치하는 파일 찾기 |
| `grep` | 여러 출력 모드(파일만, 컨텍스트가 포함된 내용, 또는 카운트)로 파일 내용 검색 |
| `execute` | 환경에서 셸 명령 실행 ([샌드박스 백엔드](https://docs.langchain.com/oss/python/deepagents/sandboxes)에서만 사용 가능) |

<details>
<summary>지원되는 멀티모달 파일 확장자</summary>

| 타입 | 확장자 |
| --- | --- |
| [Image](https://docs.langchain.com/oss/python/langchain/messages#multimodal) | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.heic`, `.heif` |
| [Video](https://docs.langchain.com/oss/python/langchain/messages#multimodal) | `.mp4`, `.mpeg`, `.mov`, `.avi`, `.flv`, `.mpg`, `.webm`, `.wmv`, `.3gpp` |
| [Audio](https://docs.langchain.com/oss/python/langchain/messages#multimodal) | `.wav`, `.mp3`, `.aiff`, `.aac`, `.ogg`, `.flac` |
| [File](https://docs.langchain.com/oss/python/langchain/messages#multimodal) | `.pdf`, `.ppt`, `.pptx` |

</details>

<details>
<summary>🚫 기본 파일 시스템 도구 없이 실행하기</summary>

위에 나열된 파일 시스템 도구를 모델에게 숨기려면, `excluded_tools`로 [하니스 프로파일](#-하니스-프로파일-harness-profiles)을 등록하세요.

```python
from deepagents import HarnessProfile, register_harness_profile

register_harness_profile(
    "anthropic:claude-sonnet-4-6",
    HarnessProfile(
        excluded_tools=frozenset(
            {"ls", "read_file", "write_file", "edit_file", "glob", "grep"}
        ),
    ),
)
```

`excluded_middleware`를 통해 `FilesystemMiddleware` 자체를 제거하는 것은 의도적으로 거부됩니다 — 모델에 보이는 도구 표면(surface)만 숨기고 미들웨어 자체는 유지하려면 `excluded_tools`를 사용하세요. `task` 도구를 제거하려면 [Running without subagents](https://docs.langchain.com/oss/python/deepagents/subagents#running-without-subagents)를 참조하세요.

</details>

가상 파일 시스템은 스킬, 메모리, 코드 실행, 컨텍스트 관리 등 여러 다른 하니스 기능들에서 사용됩니다. 또한 Deep Agents를 위한 커스텀 도구나 미들웨어를 빌드할 때도 파일 시스템을 활용할 수 있습니다.

자세한 내용은 [backends](https://docs.langchain.com/oss/python/deepagents/backends)를 참고하세요.

---

## 🔒 파일 시스템 권한 (Filesystem permissions)

하니스는 에이전트가 읽거나 쓸 수 있는 파일과 디렉터리를 제어하는 선언적 권한 규칙을 지원합니다. 권한은 위에서 나열한 내장 파일 시스템 도구에 적용되며, **선언 순서대로 평가되어 처음 일치하는 규칙이 적용(first-match-wins)** 됩니다.

**작동 방식:**

- 에이전트를 생성할 때 `permissions=`에 규칙 목록을 전달
- 각 규칙은 `operations`(`"read"`, `"write"`), `paths`(glob 패턴), `mode`(`"allow"` 또는 `"deny"`)를 명시
- 처음 일치하는 규칙이 승리. 일치하는 규칙이 없으면 작업은 허용됨

**유용한 이유:**

- 에이전트를 특정 디렉터리(예: `/workspace/`)로 제한
- 민감한 파일(예: `.env`, 자격 증명) 보호
- 서브에이전트에게 부모 에이전트보다 좁은 접근 권한 부여

권한은 [샌드박스 백엔드](https://docs.langchain.com/oss/python/deepagents/sandboxes)에는 적용되지 않으며, 샌드박스 백엔드는 `execute` 도구를 통해 임의 명령 실행을 지원합니다. 커스텀 검증 로직이 필요하다면 [backend policy hooks](https://docs.langchain.com/oss/python/deepagents/backends#add-policy-hooks)를 사용하세요.

전체 규칙 구조, 예시, 서브에이전트 상속에 대한 내용은 [Permissions](https://docs.langchain.com/oss/python/deepagents/permissions)를 참고하세요.

---

## 🧑‍🤝‍🧑 작업 위임 / 서브에이전트 (Task delegation / subagents)

하니스는 메인 에이전트가 격리된 다단계 작업을 위해 일시적(ephemeral) "서브에이전트(subagents)"를 만들 수 있도록 합니다.

**유용한 이유:**

- **컨텍스트 격리(Context isolation)** — 서브에이전트의 작업이 메인 에이전트 컨텍스트를 어지럽히지 않음
- **병렬 실행(Parallel execution)** — 여러 서브에이전트를 동시에 실행 가능
- **전문화(Specialization)** — 서브에이전트마다 다른 도구/설정을 가질 수 있음
- **토큰 효율성(Token efficiency)** — 큰 하위 작업의 컨텍스트가 단일 결과로 압축됨

**작동 방식:**

- 메인 에이전트는 `task` 도구를 가짐
- 호출되면, 자체 컨텍스트를 가진 새로운 에이전트 인스턴스를 생성
- 서브에이전트는 완료될 때까지 자율적으로 실행
- 메인 에이전트에게 최종 보고서 하나를 반환
- [기본 `general-purpose` 서브에이전트](https://docs.langchain.com/oss/python/deepagents/subagents#default-subagent) (기본 활성화) 사용 또는 [커스텀 서브에이전트](https://docs.langchain.com/oss/python/deepagents/subagents#custom-subagents) 추가 가능
- 서브에이전트는 무상태(stateless)이며 여러 메시지를 다시 보낼 수 없음

<details>
<summary>🚫 서브에이전트 없이 실행하기 (`task` 도구 없음)</summary>

`task` 도구 없이 에이전트를 실행하는 방법은 [Running without subagents](https://docs.langchain.com/oss/python/deepagents/subagents#running-without-subagents)를 참고하세요. `excluded_middleware`를 통해 `SubAgentMiddleware`를 제거하려고 하지 마세요 — 의도적으로 거부됩니다. 대신, [하니스 프로파일](#-하니스-프로파일-harness-profiles)을 통해 자동 추가된 서브에이전트를 비활성화하고, `subagents=`로 동기 서브에이전트를 전달하지 마세요. 비동기 서브에이전트는 영향을 받지 않습니다.

</details>

---

## 🧠 컨텍스트 관리 (Context management)

하니스는 컨텍스트를 관리하여, deep agent가 토큰 제한 내에서 장시간 실행 작업을 처리하면서도 필요한 정보를 유지할 수 있도록 합니다.

**작동 방식:**

- **입력 컨텍스트(Input context)** — 시스템 프롬프트, 메모리, 스킬, 도구 프롬프트가 시작 시점에 에이전트가 알고 있는 내용을 형성
- **압축(Compression)** — 기본 내장된 오프로딩(offloading)과 요약(summarization)이 작업이 진행됨에 따라 컨텍스트를 윈도우 제한 내로 유지
- **격리(Isolation)** — 서브에이전트가 무거운 작업을 격리하고 결과만 반환 ([작업 위임](#-작업-위임-서브에이전트-task-delegation-subagents) 참고)
- **장기 메모리(Long-term memory)** — 가상 파일 시스템을 통한 스레드 간 영속 저장소

**유용한 이유:**

- 단일 컨텍스트 윈도우를 초과하는 다단계 작업 가능
- 수동 정리 없이도 가장 관련성 높은 정보를 범위 내에 유지
- 자동 요약 및 오프로딩을 통해 토큰 사용량 감소

설정에 대한 자세한 내용은 [Context engineering](https://docs.langchain.com/oss/python/deepagents/context-engineering)을 참고하세요.

---

## 💻 코드 실행 (Code execution)

Deep Agents는 두 가지 방식으로 코드 실행을 지원합니다.

- [샌드박스 백엔드(Sandbox backends)](https://docs.langchain.com/oss/python/deepagents/sandboxes)는 격리된 환경에서 셸 명령을 실행하기 위한 `execute` 도구를 제공합니다.
- [인터프리터(Interpreters)](https://docs.langchain.com/oss/python/deepagents/interpreters)는 범위가 지정된 QuickJS 런타임에서 JavaScript를 실행하는 `eval` 도구를 추가합니다.

에이전트가 의존성 설치, 테스트 실행, CLI 호출, 운영체제 파일 시스템 작업이 필요할 때는 샌드박스 백엔드를 사용하세요. 샌드박스 백엔드는 `SandboxBackendProtocolV2`를 구현하며, 감지되면 하니스가 에이전트가 사용할 수 있는 도구 목록에 `execute` 도구를 추가합니다.

루프, 배치 처리, 결정적(deterministic) 데이터 변환, 프로그래밍 방식의 도구 호출을 위한 경량 프로그래머블 계층이 필요할 때는 인터프리터를 사용하세요. 인터프리터는 셸 접근, 패키지 설치, 파일 시스템 및 네트워크 접근을 제공하지 않습니다.

샌드박스 설정, 프로바이더, 파일 전송 API에 대한 내용은 [Sandboxes](https://docs.langchain.com/oss/python/deepagents/sandboxes)를 참고하세요. QuickJS 런타임과 프로그래밍 방식 도구 호출은 [Interpreters](https://docs.langchain.com/oss/python/deepagents/interpreters)를 참고하세요.

---

## 🙋 Human-in-the-loop

하니스는 지정된 도구 호출 시점에 에이전트 실행을 일시 중지(pause)하여 사람의 승인 또는 수정을 받을 수 있게 합니다. 이 기능은 `interrupt_on` 파라미터를 통해 옵트인(opt-in) 방식으로 제공됩니다.

**설정:**

- `create_deep_agent`에 도구 이름과 인터럽트 설정의 매핑을 `interrupt_on`으로 전달
- 예시: `interrupt_on={"edit_file": True}`는 모든 편집 전에 일시 중지
- 프롬프트가 표시될 때 승인 메시지를 제공하거나 도구 입력을 수정할 수 있음

**유용한 이유:**

- 파괴적인 작업을 위한 안전 게이트(safety gate)
- 비용이 큰 API 호출 전에 사용자 검증
- 인터랙티브한 디버깅 및 가이드

---

## 📚 스킬 (Skills)

하니스는 deep agent에 전문화된 워크플로와 도메인 지식을 제공하는 **스킬(skills)** 을 지원합니다.

**작동 방식:**

- 스킬은 [Agent Skills 표준](https://agentskills.io/)을 따름
- 각 스킬은 지시 사항과 메타데이터가 담긴 `SKILL.md` 파일이 포함된 디렉터리
- 스킬에는 추가 스크립트, 참조 문서, 템플릿 등 기타 리소스를 포함할 수 있음
- 스킬은 점진적 공개(progressive disclosure)를 사용함 — 현재 작업에 유용하다고 에이전트가 판단할 때만 로드됨
- 에이전트는 시작 시 각 `SKILL.md`의 frontmatter를 읽고, 필요할 때 전체 스킬 콘텐츠를 검토

**유용한 이유:**

- 필요한 스킬만 로드하여 토큰 사용량 감소
- 추가 컨텍스트와 함께 기능을 더 큰 액션으로 묶음
- 시스템 프롬프트를 어지럽히지 않으면서 전문 지식 제공
- 모듈식, 재사용 가능한 에이전트 기능 구현

자세한 내용은 [Skills](https://docs.langchain.com/oss/python/deepagents/skills)를 참고하세요.

---

## 🧷 메모리 (Memory)

하니스는 대화 간에 deep agent에 추가 컨텍스트를 제공하는 영속 메모리 파일을 지원합니다. 이 파일에는 보통 코딩 스타일, 선호 사항, 컨벤션, 가이드라인 등이 담겨 있어, 에이전트가 코드베이스와 사용자의 선호를 이해하고 따르도록 돕습니다.

**작동 방식:**

- 영속 컨텍스트를 제공하기 위해 [`AGENTS.md` 파일](https://agents.md/)을 사용
- 메모리 파일은 항상 로드됨 (점진적 공개를 사용하는 스킬과 달리)
- 에이전트 생성 시 `memory` 파라미터에 하나 이상의 파일 경로 전달
- 파일은 에이전트의 백엔드(StateBackend, StoreBackend, FilesystemBackend)에 저장됨
- 에이전트는 사용자와의 상호작용, 피드백, 식별된 패턴에 따라 메모리를 업데이트할 수 있음

**유용한 이유:**

- 대화마다 다시 지정할 필요 없는 영속 컨텍스트 제공
- 사용자 선호, 프로젝트 가이드라인, 도메인 지식 저장에 유용
- 항상 에이전트가 사용 가능하여 일관된 동작 보장

설정 세부 사항과 예시는 [Memory](https://docs.langchain.com/oss/python/deepagents/customization#memory)를 참고하세요.

---

## ⚙️ 하니스 프로파일 (Harness profiles)

하니스는 특정 프로바이더(provider) 또는 모델(model)이 선택될 때 적용되는 선언적 설정 번들(`HarnessProfile`)을 적용할 수 있습니다. 프로파일은 모델이 빌드된 후 런타임 동작을 조정하며, 에이전트별 설정 코드가 필요하지 않습니다.

**작동 방식:**

- 프로바이더 이름(`"openai"`) 또는 `provider:model` 키(`"openai:gpt-5.4"`) 아래에 프로파일을 등록
- `create_deep_agent`는 모델을 해석할 때 프로파일을 조회하고 적용
- 프로바이더 수준과 모델 수준 프로파일은 해석 시점에 병합

**유용한 이유:**

- 프로바이더별 또는 모델별 기본값(시스템 프롬프트 조정, 도구 오버라이드, 미들웨어)을 한 곳에 패키징
- 모델을 전환할 때 `create_deep_agent` 호출부를 그대로 유지
- 엔트리 포인트(entry point)를 통해 재사용 가능한 프로파일을 플러그인으로 배포 가능

전체 필드 목록, 병합 시맨틱, 플러그인 패키징은 [Profiles](https://docs.langchain.com/oss/python/deepagents/profiles)를 참고하세요.

---

> 📝 이 문서를 Claude, VSCode 등에 MCP를 통해 실시간 답변용으로 [연결](https://docs.langchain.com/use-these-docs)할 수 있습니다. [GitHub에서 페이지 편집](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/harness.mdx) 또는 [이슈 등록](https://github.com/langchain-ai/docs/issues/new/choose)도 가능합니다.
