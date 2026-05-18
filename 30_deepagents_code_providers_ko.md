# 모델 프로바이더 (Model providers)

> 원문: https://docs.langchain.com/oss/python/deepagents/code/providers
>
> Deep Agents Code를 위한 LangChain 호환 모델 프로바이더 구성

---

## 📖 목차

1. [빠른 시작 (Quickstart)](#-빠른-시작-quickstart)
2. [프로바이더 레퍼런스 (Provider reference)](#-프로바이더-레퍼런스-provider-reference)
3. [모델 전환 (Switch models)](#-모델-전환-switch-models)
4. [고급 설정 (Advanced configuration)](#-고급-설정-advanced-configuration)

---

## 📌 개요

Deep Agents Code는 [LangChain과 호환되는 모든 채팅 모델 프로바이더](https://docs.langchain.com/oss/python/integrations/chat)를 지원하므로, 도구 호출(tool calling)을 지원하는 거의 모든 LLM을 사용할 수 있습니다. OpenAI 호환 또는 Anthropic 호환 API를 노출하는 모든 서비스도 별도 설정 없이 동작합니다 — [Compatible APIs](https://docs.langchain.com/oss/python/deepagents/code/configuration#compatible-apis)를 참고하세요.

---

## 🚀 빠른 시작 (Quickstart)

Deep Agents Code는 [다음의 모델 프로바이더](#-프로바이더-레퍼런스-provider-reference)와 자동으로 통합됩니다. 해당 프로바이더 패키지를 설치하는 것 외에는 추가 설정이 필요하지 않습니다.

### 1. 프로바이더 패키지 설치

각 모델 프로바이더는 대응되는 LangChain 통합 패키지 설치가 필요합니다. 이들은 Deep Agents Code 설치 시 선택적 extras로 제공되어, 애플리케이션을 가볍게 유지할 수 있도록 의도된 설계입니다.

```bash
# 선택한 프로바이더와 함께 빠르게 설치
# OpenAI, Anthropic, Gemini는 기본 포함됨
DEEPAGENTS_EXTRAS="baseten,groq" curl -LsSf https://langch.in/dcode | bash

# 또는 uv로 직접 설치
uv tool install 'deepagents-code[baseten,groq]'

# 나중에 추가 패키지 설치
uv tool install deepagents-code --with langchain-ollama

# 모든 프로바이더
uv tool install 'deepagents-code[anthropic,baseten,bedrock,cohere,deepseek,fireworks,google-genai,groq,huggingface,ibm,litellm,mistralai,nvidia,ollama,openai,openrouter,perplexity,vertexai,xai]'
```

### 2. 자격 증명 설정

API 키를 `~/.deepagents/.env`에 저장하면 모든 프로젝트에서 사용할 수 있고, 또는 셸에서 export할 수 있습니다.

#### OpenAI

```bash
# 영구 추가
mkdir -p ~/.deepagents
echo 'OPENAI_API_KEY=your-api-key' >> ~/.deepagents/.env
```

```bash
# 현재 세션에만 추가
export OPENAI_API_KEY="your-api-key"
```

#### Anthropic

```bash
# 영구 추가
mkdir -p ~/.deepagents
echo 'ANTHROPIC_API_KEY=your-api-key' >> ~/.deepagents/.env
```

```bash
# 현재 세션에만 추가
export ANTHROPIC_API_KEY="your-api-key"
```

#### Google

```bash
# 영구 추가
mkdir -p ~/.deepagents
echo 'GOOGLE_API_KEY=your-api-key' >> ~/.deepagents/.env
```

```bash
# 현재 세션에만 추가
export GOOGLE_API_KEY="your-api-key"
```

#### 기타 프로바이더

Deep Agents Code는 도구 호출을 지원하는 모든 LLM과 함께 동작합니다. 지원되는 프로바이더 및 필요한 환경 변수 전체 목록은 [Provider reference](#-프로바이더-레퍼런스-provider-reference)를 참고하세요.

모델 파라미터 구성은 [Model parameters](#모델-파라미터-model-parameters)를 참고하세요.

자격 증명을 Deep Agents Code에만 적용하려면 [`DEEPAGENTS_CODE_` prefix](https://docs.langchain.com/oss/python/deepagents/code/configuration#deepagents_code_-prefix)를 사용할 수도 있습니다.

---

## 📚 프로바이더 레퍼런스 (Provider reference)

여기에 나열되지 않은 프로바이더를 사용하시나요? [Arbitrary providers](https://docs.langchain.com/oss/python/deepagents/code/configuration#arbitrary-providers)를 참고하세요. 추가 설정으로 LangChain 호환 프로바이더라면 모두 Deep Agents Code에서 사용할 수 있습니다.

| 프로바이더 | 패키지 | 자격 증명 환경 변수 | 모델 프로필 |
|------------|--------|---------------------|-------------|
| OpenAI | [`langchain-openai`](https://docs.langchain.com/oss/python/integrations/chat/openai) | `OPENAI_API_KEY` | ✅ |
| Azure OpenAI | [`langchain-openai`](https://docs.langchain.com/oss/python/integrations/chat/azure_chat_openai) | `AZURE_OPENAI_API_KEY` | ✅ |
| Anthropic | [`langchain-anthropic`](https://docs.langchain.com/oss/python/integrations/chat/anthropic) | `ANTHROPIC_API_KEY` | ✅ |
| Google Gemini API | [`langchain-google-genai`](https://docs.langchain.com/oss/python/integrations/chat/google_generative_ai) | `GOOGLE_API_KEY` | ✅ |
| Google Vertex AI | [`langchain-google-genai`](https://docs.langchain.com/oss/python/integrations/chat/google_generative_ai#credentials) | `GOOGLE_CLOUD_PROJECT` | ✅ |
| Baseten | [`langchain-baseten`](https://github.com/basetenlabs/langchain-baseten) | `BASETEN_API_KEY` | ✅ |
| AWS Bedrock | [`langchain-aws`](https://docs.langchain.com/oss/python/integrations/chat/bedrock) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | ✅ |
| AWS Bedrock Converse | [`langchain-aws`](https://docs.langchain.com/oss/python/integrations/chat/bedrock) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | ✅ |
| Hugging Face | [`langchain-huggingface`](https://docs.langchain.com/oss/python/integrations/chat/huggingface) | `HUGGINGFACEHUB_API_TOKEN` | ✅ |
| Ollama | [`langchain-ollama`](https://docs.langchain.com/oss/python/integrations/chat/ollama) | `OLLAMA_API_KEY` (클라우드만; 선택) | ❌ |
| Groq | [`langchain-groq`](https://docs.langchain.com/oss/python/integrations/chat/groq) | `GROQ_API_KEY` | ✅ |
| Cohere | [`langchain-cohere`](https://docs.langchain.com/oss/python/integrations/chat/cohere) | `COHERE_API_KEY` | ❌ |
| Fireworks | [`langchain-fireworks`](https://docs.langchain.com/oss/python/integrations/chat/fireworks) | `FIREWORKS_API_KEY` | ✅ |
| Together | [`langchain-together`](https://docs.langchain.com/oss/python/integrations/chat/together) | `TOGETHER_API_KEY` | ❌ |
| Mistral AI | [`langchain-mistralai`](https://docs.langchain.com/oss/python/integrations/chat/mistralai) | `MISTRAL_API_KEY` | ✅ |
| DeepSeek | [`langchain-deepseek`](https://docs.langchain.com/oss/python/integrations/chat/deepseek) | `DEEPSEEK_API_KEY` | ✅ |
| IBM (watsonx.ai) | [`langchain-ibm`](https://docs.langchain.com/oss/python/integrations/chat/ibm_watsonx) | `WATSONX_APIKEY` | ❌ |
| Nvidia | [`langchain-nvidia-ai-endpoints`](https://docs.langchain.com/oss/python/integrations/chat/nvidia_ai_endpoints) | `NVIDIA_API_KEY` | ✅ |
| xAI | [`langchain-xai`](https://docs.langchain.com/oss/python/integrations/chat/xai) | `XAI_API_KEY` | ✅ |
| Perplexity | [`langchain-perplexity`](https://docs.langchain.com/oss/python/integrations/chat/perplexity) | `PERPLEXITY_API_KEY` (또는 `PPLX_API_KEY`) | ✅ |
| OpenRouter | [`langchain-openrouter`](https://docs.langchain.com/oss/python/integrations/chat/openrouter) | `OPENROUTER_API_KEY` | ✅ |
| LiteLLM | [`langchain-litellm`](https://docs.langchain.com/oss/python/integrations/chat/litellm) | 프로바이더별 ([문서](https://docs.litellm.ai/) 참고) | ❌ |

> 💡 자격 증명에 `DEEPAGENTS_CODE_` 접두사를 붙이면 Deep Agents Code에만 적용할 수 있습니다. 예를 들어, `DEEPAGENTS_CODE_OPENAI_API_KEY`는 다른 도구에 영향을 주지 않으면서 Deep Agents Code 내부에서 `OPENAI_API_KEY`보다 우선됩니다. 자세한 내용은 [`DEEPAGENTS_CODE_` prefix](https://docs.langchain.com/oss/python/deepagents/code/configuration#deepagents_code_-prefix)를 참고하세요.

> 💡 **[모델 프로필(model profile)](https://docs.langchain.com/oss/python/langchain/models#model-profiles)** 은 프로바이더 패키지와 함께 제공되는 메타데이터 묶음(모델 이름, 기본 파라미터, 기능 등)으로, 주로 [models.dev](https://models.dev/) 프로젝트가 구동합니다.
>
> 모델 프로필을 포함한 프로바이더는 대화형 `/model` 스위처에 모델이 자동으로 나열됩니다(단, [필터링 기준](#-스위처에-나타나는-모델) 충족 필요 — 특히 `tool_calling`이 활성화되어야 함). 모델 프로필이 없는 프로바이더의 경우 모델 이름을 직접 지정하거나 `config.toml`에 모델을 추가해야 합니다.

### 모델 라우터 및 프록시

[OpenRouter](https://openrouter.ai/)와 [LiteLLM](https://docs.litellm.ai/) 같은 모델 라우터는 단일 엔드포인트로 여러 프로바이더의 모델에 접근할 수 있게 해 줍니다.

이 서비스를 위해서는 전용 통합 패키지를 사용하세요.

| 라우터 | 패키지 | 설정 |
|--------|--------|------|
| OpenRouter | [`langchain-openrouter`](https://docs.langchain.com/oss/python/integrations/chat/openrouter) | `openrouter:<model>` (내장, [Provider reference](#-프로바이더-레퍼런스-provider-reference) 참고) |
| LiteLLM | [`langchain-litellm`](https://docs.langchain.com/oss/python/integrations/chat/litellm) | `litellm:<model>` (내장, [Provider reference](#-프로바이더-레퍼런스-provider-reference) 참고) |

**OpenRouter**는 내장 프로바이더입니다 — 패키지를 설치하고 바로 사용하세요.

```bash
uv tool install 'deepagents-code[openrouter]'
```

**LiteLLM**도 내장 프로바이더입니다.

```bash
uv tool install 'deepagents-code[litellm]'
```

---

## 🔄 모델 전환 (Switch models)

Deep Agents Code에서 모델을 전환하려면 다음 중 하나를 사용하세요.

1. **대화형 모델 스위처 사용** — `/model` 명령. 설치된 LangChain 프로바이더 패키지의 [모델 프로필](https://docs.langchain.com/oss/python/langchain/models#model-profiles)에서 가져온 사용 가능한 모델들이 표시됩니다.

   > ℹ️ 모든 모델이 여기에 표시되지는 않습니다. 사용하려는 모델이 누락된 경우 모델 이름을 직접 전달하세요(예: `/model gpt-5.5`). 자세한 내용은 [스위처에 나타나는 모델](#-스위처에-나타나는-모델)을 참고하세요.

2. **모델 이름을 인자로 직접 지정** — 예: `/model gpt-5.5`. 옵션 1의 목록에 표시되는지와 관계없이 선택한 프로바이더가 지원하는 모든 모델을 사용할 수 있습니다. 모델 이름은 API 요청에 그대로 전달됩니다.

3. **실행 시 `--model`로 모델 지정** — 예:

   ```txt
   dcode --model openai:gpt-5.5
   ```

### 모델 해결 순서 (Model resolution order)

Deep Agents Code가 실행될 때 다음 순서로 사용할 모델을 결정합니다.

1. **`--model` 플래그** — 제공되면 항상 우선합니다.
2. **`~/.deepagents/config.toml`의 `[models].default`** — 사용자의 의도적 장기 선호.
3. **`~/.deepagents/config.toml`의 `[models].recent`** — `/model`을 통해 마지막으로 전환한 모델. 자동으로 기록되며 `[models].default`를 덮어쓰지 않습니다.
4. **환경 자동 감지** — 다음 순서로 확인되는 첫 번째 사용 가능한 시작 자격 증명으로 폴백: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT`(Vertex AI).

이 시작 폴백은 의도적으로 위 네 가지 자격 증명만 확인합니다. 지원되는 다른 프로바이더(예: Groq)는 여전히 `--model`, `/model`, 저장된 기본값(`[models].default` / `[models].recent`)을 통해 사용할 수 있습니다.

### 스위처에 나타나는 모델

`/model` 선택기는 설치된 프로바이더 패키지로부터 목록을 동적으로 구성합니다. 전체 기준과 트러블슈팅은 아래를 참고하세요.

#### 스위처가 모델 목록을 구성하는 방식

대화형 `/model` 선택기는 목록을 동적으로 구성합니다 — Deep Agents Code에 하드코딩되어 있는 것이 아닙니다. 모델이 스위처에 나타나려면 **다음을 모두** 만족해야 합니다.

1. **프로바이더 패키지가 설치되어 있어야 합니다.** 각 프로바이더(예: `langchain-anthropic`, `langchain-openai`)는 `deepagents-code`와 함께 — 설치 extras로(예: `uv tool install 'deepagents-code[ollama]'`) 또는 이후 `uv tool install deepagents-code --with <package>`로 — 설치되어야 합니다. 패키지가 없으면 해당 프로바이더 섹션 전체가 스위처에서 사라집니다.

2. **모델 프로필에 `tool_calling`이 활성화되어 있어야 합니다.** Deep Agents Code는 도구 호출 지원을 요구하므로, 프로필에 `tool_calling: true`가 없는 모델은 제외됩니다. 모델이 목록에서 누락되는 가장 흔한 이유입니다. 프로필을 번들하지 않는 프로바이더([Provider reference](#-프로바이더-레퍼런스-provider-reference) 표 참고)의 경우 `config.toml`에서 정의할 수 있습니다.

   ```toml
   [models.providers.ollama.profile."qwen3:4b"]
   tool_calling = true
   max_input_tokens = 32768
   max_output_tokens = 8192
   ```

   스위처에 모델을 표시하기 위해 이 작업이 반드시 필요한 것은 아닙니다 — [`models` 목록에 추가](https://docs.langchain.com/oss/python/deepagents/code/configuration#adding-models-to-the-interactive-switcher)하는 것이 더 간단하며 동일하게 동작합니다. 프로필은 자동 요약 같은 기능을 위해 Deep Agents Code가 모델의 컨텍스트 윈도우와 기능을 알아야 할 때 유용합니다. 재정의 가능한 모든 필드는 [Profile overrides](https://docs.langchain.com/oss/python/deepagents/code/configuration#profile-overrides-advanced)를 참고하세요.

3. **모델이 텍스트를 입력/출력해야 합니다.** 프로필에서 `text_inputs` 또는 `text_outputs`를 `false`로 명시한 모델(예: 임베딩, 이미지 생성 모델)은 제외됩니다.

`config.toml`의 [`[models.providers.<name>].models`](https://docs.langchain.com/oss/python/deepagents/code/configuration#adding-models-to-the-interactive-switcher)에 정의된 모델은 프로필 필터를 우회합니다 — 프로필 메타데이터와 관계없이 항상 스위처에 표시됩니다. 이는 목록에 누락된 모델을 추가하는 권장 방식입니다.

> 💡 자격 증명 상태는 모델이 목록에 표시되는지 여부에 영향을 주지 **않습니다**. 스위처는 자격 요건을 만족하는 모든 모델을 표시하고 각 프로바이더 헤더 옆에 자격 증명 상태 표시기를 보여줍니다 — 확인된 자격 증명에는 체크 마크, 누락된 자격 증명에는 경고, 자격 증명 상태가 알 수 없을 때는 물음표. 자격 증명이 누락된 모델도 선택할 수 있으며 — 프로바이더는 요청 시점에 인증 오류를 보고합니다.

#### 누락된 모델 트러블슈팅

| 증상 | 가능한 원인 | 해결 방법 |
|------|-------------|-----------|
| 프로바이더 전체가 스위처에서 누락 | 프로바이더 패키지 미설치 | 패키지 설치 (예: `uv tool install deepagents-code --with langchain-groq`) |
| 프로바이더는 표시되지만 특정 모델 누락 | 모델 프로필의 `tool_calling: false` 또는 프로필 없음 | `config.toml`의 `[models.providers.<name>].models`에 모델 추가, 또는 `/model <provider>:<model>` 직접 사용 |
| 프로바이더에 ⚠ "missing credentials" 표시 | API 키 환경 변수 미설정 | [Provider reference](#-프로바이더-레퍼런스-provider-reference) 표에서 자격 증명 환경 변수 설정 |
| 프로바이더에 ? "credentials unknown" 표시 | Deep Agents Code가 검증할 수 없는 비표준 인증 사용 | 자격 증명이 여전히 동작할 수 있음 — 모델로 전환 시도. 인증 실패 시 프로바이더 문서 확인 |

### 기본 모델 설정 (Set a default model)

이후 모든 CLI 실행에 사용될 영속 기본 모델을 설정할 수 있습니다.

- **모델 선택기 사용**: `/model`을 열고 원하는 모델로 이동한 다음 `Ctrl+S`를 눌러 기본값으로 고정합니다. 현재 기본값에서 `Ctrl+S`를 다시 누르면 해제됩니다.
- **명령 사용**: `/model --default provider:model` (예: `/model --default anthropic:claude-opus-4-7`)
- **설정 파일 사용**: `~/.deepagents/config.toml`에서 `[models].default` 설정 ([Configuration](https://docs.langchain.com/oss/python/deepagents/code/configuration) 참고).
- **셸에서 설정:**

  ```bash
  dcode --default-model anthropic:claude-opus-4-7
  ```

현재 기본값 확인:

```bash
dcode --default-model
```

기본값 해제:

- **셸에서:**

  ```bash
  dcode --clear-default-model
  ```

- **명령 사용**: `/model --default --clear`

- **모델 선택기 사용**: 현재 고정된 기본 모델에서 `Ctrl+S` 누르기.

기본값이 설정되어 있지 않으면 Deep Agents Code는 가장 최근 사용한 모델을 기본값으로 사용합니다.

### 모델 파라미터 (Model parameters)

모델에 추가 생성자 kwargs를 전달할 수 있습니다 — 샘플링 컨트롤, reasoning/thinking 예산, 컨텍스트 윈도우 크기, 요청 타임아웃, 그리고 기본 채팅 모델 클래스가 받아들이는 모든 것. 우선순위가 높은 순서대로 세 가지 설정 위치가 있습니다.

1. **실행 시 `--model-params`로 일회성 설정**. JSON 문자열, 세션 한정:

   ```bash
   # OpenAI reasoning effort
   dcode --model openai:gpt-5.5 --model-params '{"reasoning": {"effort": "high"}}'

   # Anthropic extended thinking
   dcode --model anthropic:claude-opus-4-7 --model-params '{"thinking": {"type": "enabled", "budget_tokens": 10000}, "max_tokens": 16000}'
   ```

2. **세션 중 `/model --model-params`로 설정**. 동일한 JSON 문법 — 재시작 없이 파라미터(및 선택적으로 모델)를 교체합니다.

   ```txt
   /model --model-params '{"temperature": 0.7}' anthropic:claude-opus-4-7
   /model --model-params '{"num_ctx": 16384}'           # 선택기를 열고 선택한 모델에 파라미터 적용
   ```

3. **`config.toml`에 영구 설정**. 매 실행 시 적용되는 프로바이더 수준 기본값(선택적으로 모델별 서브테이블 포함):

   ```toml
   [models.providers.anthropic.params]
   thinking = { type = "enabled", budget_tokens = 10000 }
   max_tokens = 16000

   [models.providers.openai.params]
   reasoning = { effort = "high", summary = "auto" }
   output_version = "responses/v1"

   [models.providers.ollama.params]
   num_ctx = 16384
   temperature = 0

   # Per-model override—wins over provider-level keys
   [models.providers.ollama.params."qwen3:4b"]
   temperature = 0.5
   ```

CLI 플래그는 설정 파일의 `params`를 재정의하며 세션 한정입니다(세션 중 변경은 영속되지 않음). `config.toml`의 모델별 서브테이블은 프로바이더 수준 키를 재정의합니다(얕은 병합 — 전체 의미는 [Model constructor params](https://docs.langchain.com/oss/python/deepagents/code/configuration#model-constructor-params) 참고). `--model-params`는 `--default`와 함께 사용할 수 없습니다.

> 💡 기본 채팅 모델 생성자가 받아들이는 모든 kwarg가 유효합니다. 전체 목록은 프로바이더의 레퍼런스 문서를 참고하세요 — 예: [`ChatAnthropic`](https://reference.langchain.com/python/langchain-anthropic/langchain_anthropic/chat_models/ChatAnthropic), [`ChatOpenAI`](https://reference.langchain.com/python/langchain-openai/langchain_openai/chat_models/base/ChatOpenAI), [`ChatOllama`](https://reference.langchain.com/python/langchain-ollama/langchain_ollama/chat_models/ChatOllama). 알 수 없는 kwarg는 업스트림 API 요청으로 그대로 전달되므로, 새로 출시된 파라미터도 CLI 업데이트 없이 동작합니다.

> ℹ️ 자격 증명(`api_key`)을 `params`에 넣지 마세요 — 대신 [`api_key_env`](https://docs.langchain.com/oss/python/deepagents/code/configuration#provider-configuration)로 환경 변수를 지정하세요.

모델의 런타임 *프로필* 필드(`max_input_tokens`, `tool_calling`, 기능 플래그)를 재정의하려면 — 생성자 파라미터와는 별개입니다 — [Profile overrides](https://docs.langchain.com/oss/python/deepagents/code/configuration#profile-overrides-advanced)를 참고하세요.

---

## 🔧 고급 설정 (Advanced configuration)

프로바이더 파라미터, 프로필 오버라이드, 커스텀 base URL, 호환 API, 임의 프로바이더, 라이프사이클 훅에 대한 자세한 구성은 [Configuration](https://docs.langchain.com/oss/python/deepagents/code/configuration)을 참고하세요.
