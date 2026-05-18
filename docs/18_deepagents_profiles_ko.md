# Deep Agents 프로파일 (Profiles)

> 원문: https://docs.langchain.com/oss/python/deepagents/profiles
>
> 모델 선택 시 Deep Agents가 적용하는 프로바이더별 / 모델별 기본값을 패키징합니다.

---

## 📖 목차

1. [프로파일이란?](#-프로파일이란)
2. [Harness profiles](#-harness-profiles)
3. [등록 키 (Registration keys)](#-등록-키-registration-keys)
4. [병합 의미론 (Merge semantics)](#-병합-의미론-merge-semantics)
5. [Provider profiles](#-provider-profiles)
6. [구성 파일에서 프로파일 로드](#-구성-파일에서-프로파일-로드)
7. [프로파일을 플러그인으로 배포](#-프로파일을-플러그인으로-배포)
8. [관련 문서 (Related)](#-관련-문서-related)

---

## 📌 프로파일이란?

**Harness profiles**는 주어진 프로바이더 또는 특정 모델이 선택될 때마다 Deep Agents가 적용할 구성을 패키징할 수 있게 해줍니다. 시스템 프롬프트 조정, 도구 설명 오버라이드, 제외된 도구 또는 미들웨어, 추가 미들웨어, general-purpose 서브에이전트 편집 등이 포함됩니다. `create_deep_agent` 호출 지점을 변경하지 않고 특정 모델에 대해 하니스가 동작하는 방식을 튜닝하는 주된 방법입니다. Python에서 프로파일을 빌드할 때는 `HarnessProfile`을 사용하고, [YAML/JSON 파일 로드 또는 저장](#-구성-파일에서-프로파일-로드) 시에는 `HarnessProfileConfig`를 사용하세요. Deep Agents는 OpenAI 및 Anthropic(Claude) 모델용 기본 내장 harness profile을 제공합니다.

**Provider profiles**는 *모델 생성(model-construction)* kwargs를 위한 더 좁은 동반 API이며, 하니스에는 영향을 미치지 않습니다. 대부분의 호출자에게는 필요하지 않습니다. 프로바이더 선택과 함께 `init_chat_model` 기본값, 자격 증명 검사, 또는 런타임에서 파생된 kwargs를 기본값으로 원할 때 사용하세요 (예: 프로바이더 통합을 패키징할 때).

---

## 🛠️ Harness profiles

`HarnessProfile`은 채팅 모델이 생성된 후에 `create_deep_agent`가 적용하는 프롬프트 조립, 도구 가시성, 미들웨어, 기본 서브에이전트 조정을 설명합니다.

```python
from deepagents import (
    GeneralPurposeSubagentProfile,
    HarnessProfile,
    register_harness_profile,
)

register_harness_profile(
    "openai:gpt-5.4",
    HarnessProfile(
        system_prompt_suffix="Respond in under 100 words.",
        excluded_tools={"execute"},
        excluded_middleware={"SummarizationMiddleware"},
        general_purpose_subagent=GeneralPurposeSubagentProfile(enabled=False),
    ),
)
```

### 필드 (Fields)

| 필드 | 타입 | 설명 |
|-----|-----|-----|
| `base_system_prompt` | `string` | Deep Agents 기본 시스템 프롬프트를 교체합니다 ([Prompt assembly](https://docs.langchain.com/oss/python/deepagents/customization#prompt-assembly)의 `CUSTOM`). |
| `system_prompt_suffix` | `string` | 조립된 기본 프롬프트 끝에 텍스트를 추가합니다 ([Prompt assembly](https://docs.langchain.com/oss/python/deepagents/customization#prompt-assembly)의 `SUFFIX`). 메인 에이전트, 선언적 서브에이전트, 자동 추가된 general-purpose 서브에이전트에 적용됩니다. |
| `tool_description_overrides` | `Mapping[str, str]` | 도구 이름으로 키된 개별 도구 설명을 오버라이드합니다. |
| `excluded_tools` | `frozenset[str]` | 도구셋에서 특정 하니스 레벨 도구를 제거합니다. 도구 이름(문자열)으로 매칭되며, 사용자 제공 도구와 하니스 미들웨어가 추가한 도구 모두를 제거할 수 있는 사후 주입 필터로 적용됩니다. 작동 예시는 [Running without the default filesystem tools](https://docs.langchain.com/oss/python/deepagents/harness#virtual-filesystem-access)를 참고하세요. |
| `excluded_middleware` | `frozenset[type[AgentMiddleware] \| str]` | 스택에서 특정 미들웨어 클래스를 제거합니다. 미들웨어 클래스나 문자열 이름을 받습니다. |
| `extra_middleware` | `Sequence[AgentMiddleware] \| Callable[[], Sequence[AgentMiddleware]]` | 이 프로파일이 적용되는 모든 스택에 미들웨어를 추가합니다. |
| `general_purpose_subagent` | `GeneralPurposeSubagentProfile` | general-purpose 서브에이전트를 비활성화, 이름 변경, 또는 재프롬프트합니다. 이 필드의 `system_prompt`가 `base_system_prompt`와 함께 설정될 때, general-purpose-특화 서브에이전트 프롬프트가 이깁니다. [General-purpose subagent prompt](https://docs.langchain.com/oss/python/deepagents/customization#general-purpose-subagent-prompt)를 참고하세요. |

> 📘 호출자가 제공한 `system_prompt=`는 항상 조립된 프롬프트의 맨 앞에 위치하고, `system_prompt_suffix`는 항상 맨 뒤에 위치합니다. 어떤 모델이 선택되었는지에 관계없이 그렇습니다. 동일한 오버레이 규칙이 서브에이전트에도 적용됩니다. 각 서브에이전트는 자체 모델에 대해 프로파일 해결을 다시 실행합니다. 전체 케이스별 분석(메인 에이전트, 서브에이전트, general-purpose 서브에이전트)은 [Prompt assembly](https://docs.langchain.com/oss/python/deepagents/customization#prompt-assembly)를 참고하세요.

> ⚠️ `task` 도구 없이 에이전트를 실행하려면 [Running without subagents](https://docs.langchain.com/oss/python/deepagents/subagents#running-without-subagents)를 참고하세요. `general_purpose_subagent=GeneralPurposeSubagentProfile(enabled=False)`를 설정하고 `subagents=`로 동기 서브에이전트를 전달하지 마세요. `SubAgentMiddleware`(및 `task` 도구)는 동기 서브에이전트가 최소 하나 존재할 때만 첨부되므로, 이 구성은 이를 깔끔하게 제외합니다. 비동기 서브에이전트는 영향을 받지 않습니다.
>
> `FilesystemMiddleware`, `SubAgentMiddleware`, 또는 내부 권한 미들웨어를 `excluded_middleware`에 나열하면 `ValueError`가 발생합니다. 이들은 필수 스캐폴딩입니다. 미들웨어를 제거하지 않고 모델에서 도구를 숨기려면 `excluded_tools`를 사용하세요. [Running without the default filesystem tools](https://docs.langchain.com/oss/python/deepagents/harness#virtual-filesystem-access)를 참고하세요.

`excluded_middleware`의 항목은 두 가지 형식을 받습니다.

* 미들웨어 *클래스* (정확한 타입으로 매칭) 또는 `AgentMiddleware.name`과 일치하는 일반 문자열. 빌트인 및 `"SummarizationMiddleware"` 같은 공용 별칭에는 일반 문자열을 사용하세요.
* 구성 파일에서 정확한 미들웨어 클래스를 타깃하기 위한 `module:Class` 임포트 참조(예: `"my_pkg.middleware:TelemetryMiddleware"`). 임포트 참조는 지연 해석되므로 신뢰할 수 있는 로컬 구성에만 사용하세요. 로딩하면 Python 코드가 임포트됩니다.

<details>
<summary><strong>사전 구성된 모델 인스턴스의 조회 순서</strong></summary>

`provider:model` 문자열 대신 사전 구성된 채팅 모델 인스턴스를 전달할 때, 하니스는 인스턴스에서 정식 `provider:identifier` 키를 합성하고 다음 순서로 조회합니다.

1. 정확한 `provider:identifier` 매칭
2. Identifier만 (identifier에 이미 `:`가 포함된 경우에만)
3. Provider만 fallback

</details>

---

## 🎯 등록 키 (Registration keys)

두 프로파일 타입 모두 동일한 키 형식을 사용합니다.

* **Provider-level** — `"openai"` 같은 단순 프로바이더 이름은 해당 프로바이더의 모든 모델에 적용됩니다.
* **Model-level** — `"openai:gpt-5.4"` 같은 정규화된 `provider:model` 키는 그 특정 모델에만 적용됩니다.

provider-level과 model-level 프로파일이 모두 존재하면 해석 시점에 병합됩니다. 설정되지 않은 model-level 필드는 provider-level 프로파일에서 상속됩니다. 명시적인 model-level 값이 이를 오버라이드합니다.

기존 키 아래에 다시 등록하면 새 프로파일이 이전 위에 병합됩니다. 교체되지 않습니다. 필드별 규칙은 [Merge semantics](#-병합-의미론-merge-semantics)를 참고하세요.

> 📘 모든 프로바이더에 매칭되는 와일드카드 키는 없습니다. 어디서나 동일한 오버라이드를 적용하려면(예: 어떤 모델이 선택되든 `TodoListMiddleware` 제거), 사용하는 각 프로바이더 키 아래에 프로파일을 등록하세요. 프로파일은 선택된 모델에 따라 달라지는 조정을 위한 것입니다. 모델에 관계없이 적용되어야 하는 전역 조정은 `create_deep_agent` 호출 지점에서 수행해야 합니다.

---

## 🔧 병합 의미론 (Merge semantics)

| 필드 | 병합 동작 |
|-----|---------|
| `base_system_prompt`, `system_prompt_suffix` | 설정되면 새 값이 이김. 그렇지 않으면 상속 |
| `tool_description_overrides` | 매핑이 키별로 병합. 공유 키에 새 값이 이김 |
| `excluded_tools`, `excluded_middleware` | 집합 합집합 (set union) |
| `extra_middleware` | 구체 클래스로 병합. 새 인스턴스가 위치에서 기존을 교체, 새로운 클래스는 추가됨 |
| `general_purpose_subagent` | 필드별 병합 (설정되지 않은 필드는 상속) |
| `init_kwargs` (provider) | 딕셔너리가 키별로 병합. 공유 키에 새 값이 이김 |
| `pre_init` (provider) | Callable이 체인됨. 기존이 먼저 실행, 그 다음 새 것 |
| `init_kwargs_factory` (provider) | 팩토리가 체인되며 모든 `resolve_model` 호출에서 출력이 병합됨 |

---

## ⚙️ Provider profiles

`ProviderProfile`은 Deep Agents가 주어진 프로바이더나 특정 모델 사양에 대해 채팅 모델을 어떻게 생성해야 하는지 선언합니다. deep agent 생성 시 `provider:model` 문자열을 제공할 때만 적용되며, [`init_chat_model`](https://reference.langchain.com/python/langchain/chat_models/base/init_chat_model)로 사전 구성된 모델을 전달할 때는 적용되지 않습니다.

```python
from deepagents import ProviderProfile, register_provider_profile

register_provider_profile(
    "openai",
    ProviderProfile(init_kwargs={"temperature": 0}),
)
```

### 필드

| 필드 | 타입 | 설명 |
|-----|-----|-----|
| `init_kwargs` | `Mapping[str, Any]` | `init_chat_model`로 전달되는 정적 초기화 인자. |
| `pre_init` | `Callable[[str], None]` | 생성 전에 실행할 side effect (예: 자격 증명 검증). |
| `init_kwargs_factory` | `Callable[[], dict[str, Any]]` | 런타임 상태에서 파생된 kwargs (예: 환경 변수에서 가져온 헤더). |

---

## 📚 구성 파일에서 프로파일 로드

YAML/JSON 기반 워크플로의 경우 `HarnessProfileConfig`를 사용하세요. `HarnessProfile`의 선언적 서브셋(프롬프트 텍스트, 도구 설명 오버라이드, 제외된 도구 및 미들웨어, general-purpose 서브에이전트 편집)을 미러링하며 `to_dict` / `from_dict`를 소유합니다. 런타임 전용 상태(미들웨어 인스턴스, 팩토리, 클래스 형식의 `excluded_middleware` 항목)는 `HarnessProfile`에 남아 있습니다.

`register_harness_profile`은 두 타입 모두를 받아들이므로, 구성 기반 호출자는 수동 변환 단계가 필요하지 않습니다.

```yaml
# openai.yaml
base_system_prompt: You are helpful.
system_prompt_suffix: Respond briefly.
excluded_tools:
  - execute
  - grep
excluded_middleware:
  - SummarizationMiddleware
  - my_pkg.middleware:TelemetryMiddleware
general_purpose_subagent:
  enabled: false
```

```python
import yaml
from deepagents import HarnessProfileConfig, register_harness_profile

with open("openai.yaml") as f:
    register_harness_profile(
        "openai",
        HarnessProfileConfig.from_dict(yaml.safe_load(f)),
    )
```

반대 방향으로 가려면, `HarnessProfileConfig.from_harness_profile(...)`이 직렬화 가능한 기능만 사용할 때 런타임 프로파일을 선언적 형태로 내보냅니다.

* 클래스 형식 `excluded_middleware` 항목은 공용 별칭(클래스가 `serialized_name: ClassVar[str]`을 통해 노출할 때) 또는 `module:Class` 임포트 참조로 직렬화됩니다.
* 비어 있지 않은 `extra_middleware`와 `__main__`이나 함수 스코프 내에 선언된 미들웨어 클래스는 직렬화할 수 없습니다. 내보내기는 `ValueError`를 발생시킵니다.

---

## 🧩 프로파일을 플러그인으로 배포

배포 가능한 프로파일은 호출자가 `register_*_profile`을 수동으로 실행하지 않고도 `importlib.metadata` 엔트리 포인트로 자체 등록할 수 있습니다. 로드 순서는 **빌트인 먼저, 그 다음 엔트리 포인트 플러그인, 그 다음 사용자 코드의 직접 `register_*_profile` 호출**입니다. 세 경로 모두 동일한 가산 등록을 통해 진행되므로, 동일한 키 아래에서 나중 등록이 이전 것 위에 계층화됩니다.

배포의 자체 `pyproject.toml`에서 적절한 그룹 아래에 엔트리 포인트를 선언하세요.

```toml
[project.entry-points."deepagents.harness_profiles"]
my_provider = "my_pkg.profiles:register_harness"

[project.entry-points."deepagents.provider_profiles"]
my_provider = "my_pkg.profiles:register_provider"
```

각 타깃은 `deepagents.profiles`가 임포트될 때 등록을 수행하는 무인자 callable로 해석됩니다.

```python
from deepagents import (
    HarnessProfile,
    ProviderProfile,
    register_harness_profile,
    register_provider_profile,
)


def register_harness() -> None:
    register_harness_profile(
        "my_provider",
        HarnessProfile(system_prompt_suffix="Batch independent tool calls in parallel."),
    )


def register_provider() -> None:
    register_provider_profile(
        "my_provider",
        ProviderProfile(init_kwargs={"temperature": 0}),
    )
```

---

## 🔗 관련 문서 (Related)

* [Harness](https://docs.langchain.com/oss/python/deepagents/harness) — 하니스 능력 개요
* [Models](https://docs.langchain.com/oss/python/deepagents/models) — 모델 프로바이더와 파라미터 구성
* [Customization](https://docs.langchain.com/oss/python/deepagents/customization) — 전체 `create_deep_agent` 구성 표면
