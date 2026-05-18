# 모델 (Models)

> 원문: https://docs.langchain.com/oss/python/deepagents/models
>
> Deep Agents의 모델 프로바이더와 파라미터를 구성하는 방법을 학습합니다.

---

Deep Agents는 [도구 호출(tool calling)](https://docs.langchain.com/oss/python/langchain/models#tool-calling)을 지원하는 모든 [LangChain 채팅 모델](https://docs.langchain.com/oss/python/langchain/models)과 함께 동작합니다.

---

## 📖 목차

1. [지원 모델](#-지원-모델)
   - [추천 모델](#추천-모델)
   - [모델 평가(Evaluations)](#모델-평가evaluations)
2. [모델 파라미터 구성](#-모델-파라미터-구성)
   - [프로바이더 프로파일(Provider profiles)](#프로바이더-프로파일provider-profiles)
3. [런타임에서 모델 선택](#-런타임에서-모델-선택)
4. [더 알아보기](#-더-알아보기)

---

## 📌 지원 모델

모델은 `provider:model` 형식으로 지정합니다(예: `google_genai:gemini-3.1-pro-preview`, `openai:gpt-5.4`, `anthropic:claude-sonnet-4-6`). 프로바이더 프리픽스(prefix)는 LangChain 통합을 선택하며, 콜론 뒤의 문자열은 해당 프로바이더에 모델 식별자로 그대로 전달됩니다. 유효한 프로바이더 문자열은 [`init_chat_model`](https://reference.langchain.com/python/langchain/chat_models/base/init_chat_model)의 `model_provider` 파라미터를 참고하세요. 프로바이더별 설정은 [chat model integrations](https://docs.langchain.com/oss/python/integrations/chat)를 참고하세요.

모델 식별자는 프로바이더가 기대하는 형식과 일치해야 합니다. 일부 프로바이더는 `gpt-5.4`처럼 단순한 이름을 사용하지만, 다른 곳은 `zai-org/GLM-5.1`과 같은 네임스페이스/배포 경로를 사용합니다. 이 경우 전체 Deep Agents 문자열은 `baseten:zai-org/GLM-5.1`이 됩니다. 최신 식별자는 프로바이더의 모델 카탈로그나 통합 문서를 확인하세요.

### 추천 모델

다음 모델들은 기본적인 에이전트 동작을 테스트하는 [Deep Agents eval suite](https://github.com/langchain-ai/deepagents/tree/main/libs/evals#readme)에서 좋은 성능을 보입니다. 이 평가를 통과하는 것은 더 길고 복잡한 작업에서 강력한 성능을 내기 위한 **필요 조건**이지만 충분 조건은 아닙니다.

| 프로바이더 | 모델 |
| --- | --- |
| [Google](https://docs.langchain.com/oss/python/integrations/providers/google) | `gemini-3.1-pro-preview`, `gemini-3-flash-preview` |
| [OpenAI](https://docs.langchain.com/oss/python/integrations/providers/openai) | `gpt-5.4`, `gpt-4o`, `gpt-5.4`, `o4-mini`, `gpt-5.2-codex`, `gpt-4o-mini`, `o3` |
| [Anthropic](https://docs.langchain.com/oss/python/integrations/providers/anthropic) | `claude-opus-4-6`, `claude-opus-4-5`, `claude-sonnet-4-6`, `claude-sonnet-4`, `claude-sonnet-4-5`, `claude-haiku-4-5`, `claude-opus-4-1` |
| 오픈 웨이트(Open-weight) | `GLM-5`, `Kimi-K2.5`, `MiniMax-M2.5`, `qwen3.5-397B-A17B`, `devstral-2-123B` |

오픈 웨이트 모델은 [Baseten](https://docs.langchain.com/oss/python/integrations/providers/baseten), [Fireworks](https://docs.langchain.com/oss/python/integrations/providers/fireworks), [OpenRouter](https://docs.langchain.com/oss/python/integrations/providers/openrouter), [Ollama](https://docs.langchain.com/oss/python/integrations/providers/ollama)와 같은 프로바이더를 통해 사용할 수 있습니다.

### 모델 평가(Evaluations)

[Deep Agents eval suite](https://github.com/langchain-ai/deepagents/tree/main/libs/evals#readme)는 인기 있는 모델들을 테스트합니다.

| 모델 | File Ops | Retrieval | Tool Use | Memory | Conversation | Summarization |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| google_genai:gemini-3.1-pro-preview | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234719085)** | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234686782)** | [25%](https://github.com/langchain-ai/deepagents/actions/runs/25234699517) | [54%](https://github.com/langchain-ai/deepagents/actions/runs/25290479270) | [48%](https://github.com/langchain-ai/deepagents/actions/runs/24113831669) | [80%](https://github.com/langchain-ai/deepagents/actions/runs/25235579950) |
| openai:gpt-5.4 | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/24172638583)** | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/24172638583)** | [18%](https://github.com/langchain-ai/deepagents/actions/runs/24906955930) | [51%](https://github.com/langchain-ai/deepagents/actions/runs/24172638583) | [38%](https://github.com/langchain-ai/deepagents/actions/runs/24425363630) | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/24172638583)** |
| openai:gpt-5.5 | [92%](https://github.com/langchain-ai/deepagents/actions/runs/25234719085) | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234686782)** | [20%](https://github.com/langchain-ai/deepagents/actions/runs/25234699517) | [64%](https://github.com/langchain-ai/deepagents/actions/runs/25232371743) | **[52%](https://github.com/langchain-ai/deepagents/actions/runs/25232371743)** | [80%](https://github.com/langchain-ai/deepagents/actions/runs/25235579950) |
| anthropic:claude-opus-4-6 | [92%](https://github.com/langchain-ai/deepagents/actions/runs/24172638583) | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/24172638583)** | [26%](https://github.com/langchain-ai/deepagents/actions/runs/24906955930) | **[69%](https://github.com/langchain-ai/deepagents/actions/runs/24172638583)** | [22%](https://github.com/langchain-ai/deepagents/actions/runs/24363491527) | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/24172638583)** |
| anthropic:claude-opus-4-7 | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234719085)** | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234686782)** | [18%](https://github.com/langchain-ai/deepagents/actions/runs/25234699517) | — | **[52%](https://github.com/langchain-ai/deepagents/actions/runs/24911513545)** | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25235579950)** |
| baseten:moonshotai/Kimi-K2.6 | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234719085)** | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234686782)** | [20%](https://github.com/langchain-ai/deepagents/actions/runs/25234699517) | — | — | [60%](https://github.com/langchain-ai/deepagents/actions/runs/25235579950) |
| baseten:zai-org/GLM-5 | [92%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785) | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785)** | **[87%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785)** | [44%](https://github.com/langchain-ai/deepagents/actions/runs/23872647281) | [29%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785) | [60%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785) |
| ollama:minimax-m2.7:cloud | [92%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785) | [90%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785) | [82%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785) | [38%](https://github.com/langchain-ai/deepagents/actions/runs/23872647281) | [29%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785) | [60%](https://github.com/langchain-ai/deepagents/actions/runs/24106499785) |
| openrouter:deepseek/deepseek-v4-pro | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234719085)** | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234686782)** | [25%](https://github.com/langchain-ai/deepagents/actions/runs/25234699517) | — | — | [80%](https://github.com/langchain-ai/deepagents/actions/runs/25235579950) |
| openrouter:minimax/minimax-m2.7 | [92%](https://github.com/langchain-ai/deepagents/actions/runs/25234719085) | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234686782)** | [20%](https://github.com/langchain-ai/deepagents/actions/runs/25234699517) | — | — | [60%](https://github.com/langchain-ai/deepagents/actions/runs/25235579950) |
| openrouter:nvidia/nemotron-3-super-120b-a12b | [0%](https://github.com/langchain-ai/deepagents/actions/runs/23874487832) | [0%](https://github.com/langchain-ai/deepagents/actions/runs/23874487832) | [0%](https://github.com/langchain-ai/deepagents/actions/runs/23874487832) | [0%](https://github.com/langchain-ai/deepagents/actions/runs/23874487832) | [0%](https://github.com/langchain-ai/deepagents/actions/runs/23874487832) | [0%](https://github.com/langchain-ai/deepagents/actions/runs/23874487832) |
| openrouter:z-ai/glm-5.1 | [92%](https://github.com/langchain-ai/deepagents/actions/runs/25234719085) | **[100%](https://github.com/langchain-ai/deepagents/actions/runs/25234686782)** | [25%](https://github.com/langchain-ai/deepagents/actions/runs/25234699517) | — | [33%](https://github.com/langchain-ai/deepagents/actions/runs/25225620506) | [80%](https://github.com/langchain-ai/deepagents/actions/runs/25235579950) |

자세한 내용은 [Eval runs](https://github.com/langchain-ai/deepagents/actions/workflows/evals.yml)를 참고하세요.

---

## ⚙️ 모델 파라미터 구성

`provider:model` 형식의 모델 문자열을 [`create_deep_agent`](https://reference.langchain.com/python/deepagents/graph/create_deep_agent)에 전달하거나, 더 자세한 제어를 위해 설정된 모델 인스턴스를 전달할 수 있습니다. 내부적으로 모델 문자열은 [`init_chat_model`](https://reference.langchain.com/python/langchain/chat_models/base/init_chat_model)을 통해 해석됩니다.

모델별 파라미터를 구성하려면 [`init_chat_model`](https://reference.langchain.com/python/langchain/chat_models/base/init_chat_model)을 사용하거나, 프로바이더 모델 클래스를 직접 인스턴스화하세요.

**`init_chat_model` 사용**

```python
from langchain.chat_models import init_chat_model
from deepagents import create_deep_agent

model = init_chat_model(
    model="google_genai:gemini-3.1-pro-preview",
    thinking_level="medium",  # [!code highlight]
)
agent = create_deep_agent(model=model)
```

**프로바이더 패키지 사용**

```python
from langchain_google_genai import ChatGoogleGenerativeAI
from deepagents import create_deep_agent

model = ChatGoogleGenerativeAI(
    model="gemini-3.1-pro-preview",
    thinking_level="medium",  # [!code highlight]
)
agent = create_deep_agent(model=model)
```

> [!NOTE]
> 사용 가능한 파라미터는 프로바이더에 따라 다릅니다. 프로바이더별 구성 옵션은 [chat model integrations](https://docs.langchain.com/oss/python/integrations/chat) 페이지를 참고하세요.

### 프로바이더 프로파일(Provider profiles)

[`ProviderProfile`](https://docs.langchain.com/oss/python/deepagents/profiles#provider-profiles)은 deep agent를 생성할 때 `provider:model` 문자열을 제공한 경우에 적용되는 초기화 파라미터들을 묶어 둡니다. [`init_chat_model`](https://reference.langchain.com/python/langchain/chat_models/base/init_chat_model)로 사전 구성된 모델을 전달한 경우에는 적용되지 않습니다.

두 가지 수준에서 등록할 수 있으며, 둘은 공존할 수 있습니다.

- **프로바이더 수준** — `"openai"`처럼 프로바이더 키만 지정하면 해당 프로바이더의 모든 모델에 적용됩니다.
- **모델 수준** — `"openai:gpt-5.4"`처럼 `provider:model` 키를 지정하면 해당 특정 모델에만 적용되며, 일치하는 프로바이더 수준 프로파일 위에 덮어쓰여(merge) 적용됩니다.

```python
from deepagents import ProviderProfile, register_provider_profile

# Provider-wide default: every openai model gets temperature=0.
register_provider_profile(
    "openai",
    ProviderProfile(init_kwargs={"temperature": 0}),
)

# Model-level override: gpt-5.4 additionally gets a specific reasoning effort.
# Inherits temperature=0 from the provider-level profile above.
register_provider_profile(
    "openai:gpt-5.4",
    ProviderProfile(init_kwargs={"reasoning_effort": "medium"}),
)
```

전체 필드 목록, 머지 시맨틱, 플러그인 패키징 방법은 [Profiles](https://docs.langchain.com/oss/python/deepagents/profiles)를 참고하세요.

> [!TIP]
> 모델이 빌드된 이후 *에이전트* 동작을 형성하고 싶다면 [harness profile](https://docs.langchain.com/oss/python/deepagents/profiles#harness-profiles)을 사용하세요.

---

## 🔄 런타임에서 모델 선택

애플리케이션에서 사용자가 모델을 선택하게 만들고 싶다면(예: UI 드롭다운), 에이전트를 다시 빌드하지 않고도 런타임에 모델을 교체할 수 있도록 [미들웨어](https://docs.langchain.com/oss/python/langchain/middleware)를 사용하세요.

사용자의 모델 선택을 [런타임 컨텍스트(runtime context)](https://docs.langchain.com/oss/python/langchain/agents#dynamic-model)로 전달한 다음, [`@wrap_model_call`](https://reference.langchain.com/python/langchain/agents/middleware/types/wrap_model_call) 데코레이터를 사용한 `wrap_model_call` 미들웨어로 호출마다 모델을 오버라이드합니다.

```python
from dataclasses import dataclass
from langchain.chat_models import init_chat_model
from langchain.agents.middleware import wrap_model_call, ModelRequest, ModelResponse
from deepagents import create_deep_agent
from typing import Callable


@dataclass
class Context:
    model: str

@wrap_model_call
def configurable_model(
    request: ModelRequest,
    handler: Callable[[ModelRequest], ModelResponse],
) -> ModelResponse:
    model_name = request.runtime.context.model
    model = init_chat_model(model_name)
    return handler(request.override(model=model))

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    middleware=[configurable_model],
    context_schema=Context,
)

# Invoke with the user's model selection
result = agent.invoke(
    {"messages": [{"role": "user", "content": "Hello!"}]},
    context=Context(model="openai:gpt-5.4"),
)
```

> [!TIP]
> 더 동적인 모델 패턴(예: 대화 복잡도 기반 라우팅, 비용 최적화)은 LangChain 에이전트 가이드의 [Dynamic model](https://docs.langchain.com/oss/python/langchain/agents#dynamic-model)을 참고하세요.

---

## 📚 더 알아보기

- [Models in LangChain](https://docs.langchain.com/oss/python/langchain/models): 도구 호출, 구조화된 출력, 멀티모달리티를 포함한 채팅 모델 기능
