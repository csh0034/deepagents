# Deep Agents Code: 설정 (Configuration)

> 원문: https://docs.langchain.com/oss/python/deepagents/code/configuration
>
> `config.toml`, hooks, MCP 서버로 Deep Agents Code를 설정하는 방법

---

Deep Agents Code는 설정을 `~/.deepagents/` 디렉터리에 저장합니다. 주요 설정 파일은 다음과 같습니다.

| 파일 | 형식 | 용도 |
| ---- | ---- | ---- |
| `config.toml` | TOML | 모델 기본값, 프로바이더 설정, 생성자 파라미터, 프로파일 오버라이드, 테마, 업데이트 설정, MCP 신뢰 저장소(trust store) |
| `.env` | Dotenv | 전역 API 키 및 시크릿 |
| `hooks.json` | JSON | Deep Agents Code 라이프사이클 이벤트에 대한 외부 도구 구독 |
| `.mcp.json` | JSON | 전역 MCP 서버 정의 |

> ℹ️ `~/.deepagents/.state/` 하위의 파일들은 머신별 Deep Agents Code 상태(state)를 담고 있으며 자동으로 관리됩니다.

---

## 📖 목차

1. [프로바이더 자격 증명 (Provider credentials)](#-프로바이더-자격-증명-provider-credentials)
2. [환경 변수 (Environment variables)](#-환경-변수-environment-variables)
3. [Config 파일](#-config-파일)
4. [스킬 추가 허용 디렉터리 (Skills extra allowed directories)](#-스킬-추가-허용-디렉터리-skills-extra-allowed-directories)
5. [테마 (Themes)](#-테마-themes)
6. [자동 업데이트 (Auto-update)](#-자동-업데이트-auto-update)
7. [관리형 배포 (Managed deployments)](#-관리형-배포-managed-deployments)
8. [환경 변수 레퍼런스](#-환경-변수-레퍼런스)
9. [외부 에디터 (External editor)](#-외부-에디터-external-editor)
10. [Hooks](#-hooks)

---

## 🔑 프로바이더 자격 증명 (Provider credentials)

모든 프로바이더에 대해, Deep Agents Code는 다음 두 가지 자격 증명 소스를 순서대로 확인합니다.

1. **저장된 키(Stored keys)** — `/auth`로 입력하여 로컬에 영속 저장된 키.
2. **환경 변수(Environment variables)** — `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` 등과 동일한 이름에 [`DEEPAGENTS_CODE_`](#deepagents_code_-접두어) 접두어가 붙은 변수, 그리고 [`.env` 파일](#-환경-변수-environment-variables)에서 로드된 키.

같은 프로바이더에 대해 저장된 키가 환경 변수 키보다 항상 우선합니다.

### `/auth` 사용 (권장)

세션 중 어디서든 자격 증명 관리자를 엽니다.

```txt
/auth
```

관리자는 Deep Agents Code가 알고 있는 모든 LLM 프로바이더를 나열하고, 이미 키가 있는 항목을 표시해 주며, 인라인으로 자격 증명을 붙여넣기/회전/삭제할 수 있게 합니다. 각 프로바이더는 다음 중 하나로 렌더링됩니다.

| 라벨 | 의미 |
| ---- | ---- |
| `✓ credentials set` | 저장된 키 또는 환경 변수 키가 사용 가능함 |
| `! missing OPENAI_API_KEY` | 명시된 환경 변수가 설정되지 않았고 저장된 키도 없음 — 행을 선택해 붙여 넣으세요 |
| `local provider` | 자격 증명 불필요(예: 로컬 Ollama) |
| `implicit auth` | 자격 증명이 암묵적임(예: Vertex AI Application Default Credentials) |
| `custom auth` | `class_path` 프로바이더가 자체 인증을 관리함(mTLS, JWT, 커스텀 헤더) |

키를 붙여 넣으려면 행에서 Enter를 누르고, 기존 키를 지우려면 행의 삭제 기능을 사용하세요. 저장된 키는 원자적으로 기록되며 세션과 `/reload` 사이에 영속됩니다.

> ℹ️ 키는 이 머신의 사용자 계정으로 스코프가 한정됩니다 — Deep Agents Code는 설정된 프로바이더 API 외에는 키를 어디로도 전송하지 않습니다.

`/auth`는 **LLM 프로바이더** 자격 증명만 관리합니다. `TAVILY_API_KEY`(웹 검색), `LANGSMITH_API_KEY`(트레이싱)와 같은 도구 자격 증명은 환경에서 직접 읽어옵니다 — [`~/.deepagents/.env`나 셸에 설정하세요](#-환경-변수-environment-variables).

### 환경 변수 (CI 및 헤드리스 환경)

비대화식 실행, CI/CD 파이프라인, TUI를 사용할 수 없는 환경에서는 프로바이더의 환경 변수를 export하거나 `~/.deepagents/.env`에 작성하세요.

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

로드 순서, `DEEPAGENTS_CODE_` 접두어, 프로젝트별 오버라이드에 대한 자세한 내용은 아래 [환경 변수](#-환경-변수-environment-variables)를 참고하세요.

---

## 🌐 환경 변수 (Environment variables)

Deep Agents Code는 dotenv 파일에서 환경 변수를 로드하기 때문에, 셸 프로필에 API 키를 `export`하거나 프로젝트마다 `.env` 파일을 중복으로 두지 않아도 됩니다.

### 로드 순서와 우선순위

시작 시 두 개의 `.env` 파일이 로드됩니다.

1. **프로젝트 `.env`** — 현재 작업 디렉터리의 `.env` 파일(존재할 경우)
2. **전역 `~/.deepagents/.env`** — 모든 프로젝트의 폴백 역할을 하는 단일 공유 파일

실제 우선순위는 **셸 환경 > 프로젝트 `.env` > 전역 `.env`** 입니다. 셸에 이미 설정된 값은 절대 덮어쓰이지 않으며 — `/reload` 시에도 마찬가지입니다.

### `DEEPAGENTS_CODE_` 접두어

모든 Deep Agents Code 전용 환경 변수에는 `DEEPAGENTS_CODE_` 접두어가 붙습니다(예: `DEEPAGENTS_CODE_AUTO_UPDATE`, `DEEPAGENTS_CODE_DEBUG`). 전체 목록은 [환경 변수 레퍼런스](#-환경-변수-레퍼런스)를 참고하세요.

접두어는 또한 Deep Agents Code가 읽는 모든 환경 변수(서드파티 자격 증명 포함)에 대한 **오버라이드 메커니즘**으로도 동작합니다. Deep Agents Code는 먼저 `DEEPAGENTS_CODE_{NAME}`을 확인한 다음 `{NAME}`으로 폴백합니다.

```bash title="~/.deepagents/.env"
# 다른 도구에 영향을 주지 않고 Deep Agents Code에서만 OPENAI_API_KEY 오버라이드
DEEPAGENTS_CODE_OPENAI_API_KEY=sk-cli-only

# 셸에서 export된 키를 Deep Agents Code 내부에서만 차단하려면 접두 변수를 빈 값으로 설정
DEEPAGENTS_CODE_ANTHROPIC_API_KEY=
```

`/reload` 시 Deep Agents Code는 `.env` 파일을 다시 읽고 접두어 값을 가져오므로, 재시작 없이 키를 회전할 수 있습니다.

### 예시

API 키를 `~/.deepagents/.env`에 한 번만 저장하세요.

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
LANGSMITH_API_KEY=lsv2_...
TAVILY_API_KEY=tvly-...

# OPENAI_API_KEY가 다른 도구를 위해 이미 셸에 export된 경우,
# 접두어를 사용해 충돌 없이 Deep Agents Code에 별도 키를 부여
DEEPAGENTS_CODE_OPENAI_API_KEY=sk-cli-only-...
```

필요할 때는 프로젝트 디렉터리에 `.env`를 두어 프로젝트별로 오버라이드할 수 있습니다.

### Tavily로 웹 검색 활성화

기본 내장 `web_search` 도구는 [Tavily](https://tavily.com)를 사용합니다. 키를 제공할 때까지 Deep Agents Code는 시작 시 "Web search disabled — `TAVILY_API_KEY` is not set" 알림을 표시합니다. 모델 프로바이더 키와 달리, Tavily는 `/auth`로 관리되지 **않으며** 환경에서 직접 읽습니다.

1. **키 발급**: [tavily.com](https://tavily.com)에서 가입하고 `tvly-`로 시작하는 키를 복사합니다. 대부분의 Deep Agents Code 사용에는 무료 등급으로 충분합니다.
2. **환경에 추가**: 모든 세션에서 인식하도록 `~/.deepagents/.env`에 키를 추가하세요.
   ```bash title="~/.deepagents/.env"
   TAVILY_API_KEY=tvly-...
   ```
   또는 일회성으로 셸에서 export 할 수도 있습니다.
   ```bash
   export TAVILY_API_KEY=tvly-...
   ```
   셸 export가 `.env` 값보다 우선합니다([로드 순서와 우선순위](#로드-순서와-우선순위) 참조). 다른 도구가 읽는 `TAVILY_API_KEY`에 영향을 주지 않고 Deep Agents Code에만 적용하려면 [`DEEPAGENTS_CODE_` 접두어](#deepagents_code_-접두어)를 사용하세요: `DEEPAGENTS_CODE_TAVILY_API_KEY=tvly-...`.
3. **Reload 또는 재시작**: 기존 세션에서는 `/reload`로 `.env` 파일을 다시 읽도록 합니다. 다음 실행 시에는 "Web search disabled" 알림이 사라지고 에이전트가 `web_search`를 호출할 수 있습니다.

---

## ⚙️ Config 파일

`~/.deepagents/config.toml`로 모델 프로바이더를 커스터마이징하고, 기본값을 설정하며, 모델 생성자에 추가 파라미터를 전달할 수 있습니다.

### 기본 모델과 최근 모델

```toml
[models]
default = "ollama:qwen3:4b"             # 의도적으로 설정한 장기 선호값
recent = "google_genai:gemini-3.1-pro-preview"   # 마지막 /model 전환(자동 기록)
```

`[models].default`는 항상 `[models].recent`보다 우선합니다. `/model` 명령은 `[models].recent`에만 쓰므로 세션 중간 전환이 설정된 기본값을 덮어쓰지 않습니다. 기본값을 제거하려면 `/model --default --clear`를 사용하거나 설정 파일에서 `default` 키를 삭제하세요.

### 기본 에이전트와 최근 에이전트

```toml
[agents]
default = "backend-dev"  # 의도적인 장기 선호값(/agents 선택기에서 Ctrl+S)
recent = "frontend-dev"  # 마지막 /agents 전환(자동 기록)
```

`[agents].default`는 항상 `[agents].recent`보다 우선합니다. `/agents` 선택기에서 `Enter`로 에이전트를 선택하면 `recent`에 기록되고, 강조된 행에서 `Ctrl+S`를 누르면 `default`로 고정됩니다. 같은 행에서 `Ctrl+S`를 다시 누르면 기본값이 해제됩니다.

명시적인 `-a`/`--agent`는 항상 둘 다 오버라이드하며, `-r`/`--resume`은 둘 다 우회하여 스레드 원래의 에이전트를 복원합니다. 관련 플래그는 [Command reference](https://docs.langchain.com/oss/python/deepagents/code/overview#command-reference)를 참고하세요.

### 프로바이더 설정

각 프로바이더는 `[models.providers]` 아래의 TOML 테이블로 정의됩니다.

```toml
[models.providers.<name>]
models = ["gpt-4o"]
api_key_env = "OPENAI_API_KEY"
base_url = "https://api.openai.com/v1"
class_path = "my_package.models:MyChatModel"
enabled = true

[models.providers.<name>.params]
temperature = 0
max_tokens = 4096

[models.providers.<name>.params."gpt-4o"]
temperature = 0.7
```

프로바이더의 설정 옵션은 다음과 같습니다.

- **`models`** *(string[], 선택)*: 이 프로바이더에 대해 대화형 `/model` 전환기에 표시할 모델 이름 목록. 이미 모델 프로파일이 번들된 프로바이더의 경우, 여기 추가한 이름들이 번들된 항목과 함께 표시되며 패키지에 아직 추가되지 않은 최신 모델을 노출할 때 유용합니다. [임의 프로바이더(arbitrary providers)](#임의-프로바이더-arbitrary-providers)의 경우 이 목록이 전환기의 유일한 모델 소스입니다.

  여기 나열된 모델은 프로파일 기반 [필터링 기준](https://docs.langchain.com/oss/python/deepagents/code/providers#which-models-appear-in-the-switcher)을 **우회**하고 항상 전환기에 표시됩니다. 프로파일에 `tool_calling` 지원이 없거나 아직 프로파일이 없어 제외된 모델을 노출하는 데 권장되는 방법입니다.

  이 키는 선택입니다. 모델이 전환기에 표시되든 안 되든 `/model`이나 `--model`에 모델 이름을 직접 전달할 수 있으며, 프로바이더가 요청 시점에 이름을 검증합니다.

- **`api_key_env`** *(string, 선택)*: API 키가 담긴 환경 변수의 **이름**(예: `"OPENAI_API_KEY"`)이며 키 자체가 아닙니다. Deep Agents Code는 모델 생성 전 접근을 검증하기 위해 시작 시 이 환경 변수에서 자격 증명을 읽습니다. 대부분의 채팅 모델 패키지는 기본 환경 변수에서 자동으로 읽어옵니다. 각 프로바이더가 확인하는 변수는 [Provider reference](https://docs.langchain.com/oss/python/deepagents/code/providers#provider-reference) 테이블을 참고하세요.

- **`base_url`** *(string, 선택)*: 지원되는 경우 프로바이더가 사용하는 base URL을 오버라이드합니다. 자세한 내용은 프로바이더 패키지의 [reference docs](https://reference.langchain.com/python/integrations/)를 참고하세요.

- **`params`** *(object, 선택)*: 모델 생성자에 전달되는 추가 키워드 인자. 평면 키(예: `temperature = 0`)는 이 프로바이더의 모든 모델에 적용됩니다. 모델 키 하위 테이블(예: `[params."gpt-4o"]`)은 해당 모델에 대해서만 개별 값을 오버라이드합니다. 머지는 얕은(shallow) 방식으로 충돌 시 모델 값이 우선합니다.

  자격 증명(예: `api_key`)은 `params`에 넣지 마세요. 환경 변수를 가리키도록 [`api_key_env`](#프로바이더-설정)를 사용하세요.

- **`profile`** *(object, 선택)*: (고급) 모델 런타임 [프로파일](https://docs.langchain.com/oss/python/langchain/models#model-profiles) 필드(예: `max_input_tokens`)를 오버라이드. 평면 키는 이 프로바이더의 모든 모델에 적용됩니다. 모델 키 하위 테이블(예: `[profile."claude-sonnet-4-5"]`)은 해당 모델에 대해서만 개별 값을 오버라이드하며, 머지는 얕은 방식으로 모델 값이 충돌 시 우선합니다. 이러한 오버라이드는 모델 생성 이후에 적용되므로 컨텍스트 한도 표시, 자동 요약, 그리고 프로파일을 읽는 모든 기능에 영향을 줍니다.

- **`class_path`** *(string, 선택)*: [임의 모델](#임의-프로바이더-arbitrary-providers) 프로바이더에 사용. `module.path:ClassName` 형식의 정규화된 Python 클래스. 설정 시 Deep Agents Code는 프로바이더 `<name>`에 대해 이 클래스를 직접 import 및 인스턴스화합니다. 클래스는 `BaseChatModel` 서브클래스여야 합니다.

- **`enabled`** *(boolean, 기본값 `true`, 선택)*: `/model` 셀렉터에 이 프로바이더가 표시되는지 여부. 설치된 패키지로부터 자동 발견되었지만 전환기를 어지럽히고 싶지 않은 프로바이더(예: 의도치 않은 전이 의존성)를 숨기려면 `false`로 설정. 비활성화된 프로바이더도 `/model provider:model`이나 `--model`로 직접 사용 가능합니다.

### 모델 생성자 파라미터

모든 프로바이더는 `params` 테이블을 사용해 모델 생성자에 추가 인자를 전달할 수 있습니다.

```toml
[models.providers.ollama.params]
temperature = 0
num_ctx = 8192
```

#### 모델별 오버라이드

특정 모델에 다른 파라미터가 필요하면 전체 프로바이더 설정을 복제하지 않고 `params` 아래 모델 키 하위 테이블을 추가하여 개별 값을 오버라이드하세요.

```toml
[models.providers.ollama]
models = ["qwen3:4b", "llama3"]

[models.providers.ollama.params]
temperature = 0
num_ctx = 8192

[models.providers.ollama.params."qwen3:4b"]
temperature = 0.5
num_ctx = 4000
```

이 설정에서는,

- `ollama:qwen3:4b`는 `{temperature: 0.5, num_ctx: 4000}`을 받습니다 — 모델 오버라이드 승리.
- `ollama:llama3`는 `{temperature: 0, num_ctx: 8192}`을 받습니다 — 오버라이드 없음, 프로바이더 수준 파라미터만 적용.

머지는 얕은 방식으로, 모델 하위 테이블에 존재하는 키는 프로바이더 수준 params의 동일 키를 대체하고, 프로바이더 수준에만 있는 키는 보존됩니다.

> 💡 `config.toml`을 편집하지 않는 일회성 조정은 시작 시 `--model-params`로 JSON 객체를 전달하거나 세션 중에 `/model`로 전달하세요. CLI 플래그는 설정 파일보다 가장 높은 우선순위를 가집니다. 문법과 프로바이더별 예시는 providers 페이지의 [Model parameters](https://docs.langchain.com/oss/python/deepagents/code/providers#model-parameters)를 참고하세요.

### 프로파일 오버라이드 (고급)

모델의 런타임 프로파일 필드를 오버라이드하여 Deep Agents Code가 모델 기능을 해석하는 방식을 변경할 수 있습니다. 가장 일반적인 사용 사례는 자동 요약을 더 빨리 트리거하기 위해 `max_input_tokens`를 낮추는 것입니다 — 테스트나 컨텍스트 사용을 제약할 때 유용합니다.

```toml
# 이 프로바이더의 모든 모델에 적용
[models.providers.anthropic.profile]
max_input_tokens = 4096
```

모델별 하위 테이블은 `params`와 동일한 방식으로 동작합니다 — 충돌 시 모델 수준 값이 우선합니다.

```toml
[models.providers.anthropic.profile]
max_input_tokens = 4096

# 이 모델은 더 높은 한도를 가짐
[models.providers.anthropic.profile."claude-sonnet-4-5"]
max_input_tokens = 8192
```

프로파일 오버라이드는 모델 생성 이후 모델 프로파일에 머지됩니다. 상태 표시줄의 컨텍스트 한도 표시, 자동 요약 임계값, 능력 체크 등 프로파일을 읽는 모든 기능이 오버라이드된 값을 봅니다.

#### `--profile-override`로 CLI 프로파일 오버라이드 (고급)

설정 파일을 편집하지 않고 런타임에 모델 프로파일 필드를 오버라이드하려면 `--profile-override`로 JSON 객체를 전달하세요.

```bash
dcode --profile-override '{"max_input_tokens": 4096}'

# --model과 결합
dcode --model google_genai:gemini-3.1-pro-preview --profile-override '{"max_input_tokens": 4096}'

# 비대화식 모드
dcode -n "Summarize this repo" --profile-override '{"max_input_tokens": 4096}'
```

이 값들은 설정 파일 프로파일 오버라이드 위에 머지됩니다(CLI 승리). 우선순위 체인은 `모델 기본값 < config.toml 프로파일 < CLI --profile-override` 입니다.

`--profile-override` 값은 세션 중 `/model` 핫스왑 이후에도 지속됩니다 — 모델을 전환하면 새 모델에 오버라이드가 재적용됩니다.

### 커스텀 base URL

일부 프로바이더 패키지는 기본 엔드포인트를 오버라이드하기 위해 `base_url`을 받습니다. 예를 들어 `langchain-ollama`는 내부의 `ollama` 클라이언트를 통해 기본적으로 `http://localhost:11434`를 사용합니다. 다른 곳을 가리키게 하려면 설정에 `base_url`을 지정하세요.

```toml
[models.providers.ollama]
base_url = "http://your-host-here:port"
```

호환성 정보와 추가 고려 사항은 프로바이더의 reference 문서를 참고하세요.

### 호환 API (Compatible APIs)

OpenAI 또는 Anthropic와 wire-호환되는 API를 노출하는 프로바이더의 경우, `base_url`을 프로바이더 엔드포인트로 가리키게 하여 기존 `langchain-openai`나 `langchain-anthropic` 패키지를 사용할 수 있습니다.

```toml
[models.providers.openai]
base_url = "https://api.example.com/v1"
api_key_env = "EXAMPLE_API_KEY"
models = ["my-model"]
```

```toml
[models.providers.anthropic]
base_url = "https://api.example.com"
api_key_env = "EXAMPLE_API_KEY"
models = ["my-model"]
```

> ℹ️ 프로바이더가 공식 스펙 위에 추가한 기능은 반영되지 않습니다. 프로바이더가 전용 LangChain 통합 패키지를 제공한다면 그쪽을 우선 사용하세요.

> ⚠️ OpenAI 프로바이더는 기본적으로 [Responses API](https://platform.openai.com/docs/api-reference/responses)를 사용하는데, 대부분의 OpenAI 호환 게이트웨이는 이를 구현하지 않습니다. 프로바이더가 Chat Completions API만 지원한다면 호출이 실패할 가능성이 높습니다. Responses API를 명시적으로 비활성화하세요.
>
> ```toml
> [models.providers.openai.params]
> use_responses_api = false
> ```

### 대화형 전환기에 모델 추가

일부 프로바이더(예: `langchain-ollama`)는 모델 프로파일 데이터를 번들하지 않습니다(전체 목록은 [Provider reference](https://docs.langchain.com/oss/python/deepagents/code/providers#provider-reference) 참고). 이 경우 대화형 `/model` 전환기는 해당 프로바이더의 모델을 나열하지 않습니다. 설정 파일에서 프로바이더에 대해 `models` 목록을 정의하여 빈 공간을 채울 수 있습니다.

```toml
[models.providers.ollama]
models = ["llama3", "mistral", "codellama"]
```

이제 `/model` 전환기에 이 모델들이 나열된 Ollama 섹션이 포함됩니다.

이 설정은 완전히 선택입니다. 전체 이름을 직접 지정하여 어떤 모델로든 전환할 수 있습니다.

```txt
/model ollama:llama3
```

> ℹ️ `langchain-ollama`가 설치되어 있고 데몬에 접근할 수 있다면, Deep Agents Code는 로컬로 pull한 모델을 자동 발견하고 전환기에 머지합니다 — `models` 목록이 필요 없습니다. 새 모델을 pull한 뒤 새로 고치려면 `/reload`를 실행하거나, 옵트아웃하려면 `DEEPAGENTS_CODE_OLLAMA_DISCOVERY=0`을 설정하세요.

### 임의 프로바이더 (Arbitrary providers)

`class_path`를 사용해 모든 [LangChain `BaseChatModel`](https://reference.langchain.com/python/langchain_core/language_models/#langchain_core.language_models.BaseChatModel) 서브클래스를 사용할 수 있습니다. Deep Agents Code는 클래스를 직접 import 및 인스턴스화합니다 — 기본 내장 프로바이더 패키지가 필요하지 않습니다.

```toml
[models.providers.my_custom]
class_path = "my_package.models:MyChatModel"
api_key_env = "MY_API_KEY"
base_url = "https://my-endpoint.example.com"

[models.providers.my_custom.params]
temperature = 0
max_tokens = 4096
```

`api_key_env`와 `base_url`은 선택입니다. `class_path` 프로바이더는 내부적으로 자체 인증을 처리할 것으로 기대됩니다 — 모델이 표준 API 키가 아닌 커스텀 인증(JWT 토큰, 독점 헤더, mTLS 등)을 사용할 때 유용합니다.

```toml
[models.providers.xyz]
class_path = "abc.integrations.deepagents:DeepAgentsXYZChat"
models = ["abc-xyz-1"]

[models.providers.xyz.params]
bypass_auth = true
temperature = 0
```

이 설정에서는 `/model xyz:abc-xyz-1`이나 `--model xyz:abc-xyz-1`로 모델로 전환합니다.

> ℹ️ Deep Agents Code는 **tool calling** 지원이 필요합니다. 커스텀 모델이 tool calling을 지원하지만 Deep Agents Code가 이를 인식하지 못한다면 프로바이더 프로파일에 선언하세요.
>
> ```toml
> [models.providers.xyz.profile]
> tool_calling = true
> max_input_tokens = 128000
> ```
>
> 정확한 컨텍스트 길이 추적과 자동 요약을 활성화하려면 `max_input_tokens`를 모델이 지원하는 값으로 설정하세요.

프로바이더 패키지는 `deepagents-code`와 동일한 Python 환경에 설치되어야 합니다.

```bash
# deepagents-code를 uv tool로 설치한 경우:
uv tool install deepagents-code --with my_package
```

`my_custom:my-model-v1`로 전환하면(via `/model` 또는 `--model`) 모델 이름(`my-model-v1`)이 `model` 키워드 인자로 전달됩니다.

```python
MyChatModel(model="my-model-v1", base_url="...", api_key="...", temperature=0, max_tokens=4096)
```

> ⚠️ `class_path`는 설정 파일에서 임의 Python 코드를 실행합니다. `pyproject.toml`의 빌드 스크립트와 동일한 신뢰 모델입니다 — 당신은 자기 머신의 통제자입니다.

프로바이더 패키지는 선택적으로 `models` 키 아래에 정의하는 대신 `<package>.data._profiles`의 `_PROFILES` 딕셔너리에서 모델 프로파일을 제공할 수 있습니다. 자세한 내용은 LangChain [model profiles](https://github.com/langchain-ai/langchain/tree/master/libs/model-profiles)를 참고하세요.

---

## 🗂️ 스킬 추가 허용 디렉터리 (Skills extra allowed directories)

기본적으로 Deep Agents Code는 스킬을 로드할 때 해결된 스킬 파일 경로가 표준 [스킬 디렉터리](https://docs.langchain.com/oss/python/deepagents/code/data-locations#skills) 중 하나 내부에 있는지 검증합니다. 이는 스킬 디렉터리 내의 심볼릭 링크가 해당 루트 외부의 임의 파일을 읽지 못하도록 막습니다.

비표준 위치에 공유 스킬 자산을 저장하고 표준 스킬 디렉터리의 심볼릭 링크가 이를 참조한다면, 해당 위치를 컨테인먼트 허용 목록에 추가할 수 있습니다. 이는 새로운 스킬 검색 위치를 추가하는 것이 **아닙니다**: 스킬은 여전히 표준 디렉터리에서만 발견됩니다.

- **`extra_allowed_dirs`** *(string[], 선택)*: 스킬 컨테인먼트 허용 목록에 추가되는 경로. `~` 확장을 지원합니다.

  ```toml
  [skills]
  extra_allowed_dirs = [
      "~/shared-skills",
      "/opt/team-skills",
  ]
  ```

또는 `DEEPAGENTS_CODE_EXTRA_SKILLS_DIRS` 환경 변수를 콜론 구분 목록으로 설정할 수 있습니다.

```bash
export DEEPAGENTS_CODE_EXTRA_SKILLS_DIRS="~/shared-skills:/opt/team-skills"
```

환경 변수가 설정되면 설정 파일 값보다 우선합니다. 변경은 `/reload` 시 반영됩니다.

---

## 🎨 테마 (Themes)

`/theme`로 대화형 테마 선택기를 엽니다. 목록을 탐색하면서 테마를 실시간으로 미리 보고 `Enter`를 눌러 `config.toml`에 선택을 영속 저장합니다.

Deep Agents Code는 다수의 내장 테마를 함께 제공합니다. 기본 테마는 LangChain 브랜드 색상의 다크 테마인 `langchain`입니다. 선택된 테마는 `[ui]` 아래에 영속 저장됩니다.

```toml
[ui]
theme = "langchain-dark"
```

### 사용자 정의 테마

`config.toml`의 `[themes.<name>]` 섹션으로 커스텀 테마를 정의합니다. 각 섹션은 `label`(str)이 필수입니다. `dark`(bool)는 생략 시 `false`가 기본값입니다 — 다크 테마라면 `true`로 설정. 모든 색상 필드는 선택입니다 — 생략된 필드는 `dark` 플래그에 따라 내장 다크/라이트 팔레트로 폴백됩니다.

```toml
[themes.my-solarized]
label = "My Solarized"
dark = true
primary = "#268BD2"
warning = "#B58900"

# 공백이 포함된 테마 이름은 TOML 따옴표가 필요함
[themes."ocean breeze"]
label = "Ocean Breeze"
primary = "#0077B6"
background = "#CAF0F8"
```

사용자 정의 테마는 `/theme` 선택기에서 내장 테마와 함께 표시됩니다.

### 내장 테마 색상 오버라이드

새 테마를 만들지 않고 내장 테마의 색상만 조정하려면 `[themes.<builtin-name>]` 섹션을 사용하세요. 색상 필드만 읽히며 — `label`과 `dark`는 내장 테마에서 상속됩니다.

```toml
[themes.langchain]
primary = "#FF5500"
```

생략된 색상 필드는 기존 내장 값을 유지합니다.

`[themes.*]` 섹션의 변경은 `/reload` 시 반영됩니다.

### 테마를 터미널에 매핑

색상 스킴이 다른 터미널 간을 전환한다면(예: 다크 iTerm과 라이트 Apple Terminal), `[ui.terminal_themes]` 아래에 각각을 테마로 매핑하세요. Deep Agents Code는 셸의 `TERM_PROGRAM`을 매칭하여 매핑된 테마를 자동 적용합니다.

```toml
[ui.terminal_themes]
"Apple_Terminal" = "langchain-light"
"iTerm.app" = "langchain"
```

`/theme` 선택기에서 `T`를 누르면 강조된 테마를 현재 터미널에 저장하거나, `echo $TERM_PROGRAM`으로 터미널 식별자를 찾아 수동으로 추가할 수 있습니다.

<details>
<summary>고급: 선택기 단축키, 해결 순서, 터미널 식별자</summary>

#### 선택기 단축키

`/theme` 선택기에서,

- `N`은 표시 라벨과 정규화된 레지스트리 키를 토글합니다 — 키는 `[ui] theme`과 `[ui.terminal_themes]`가 받는 값입니다.
- `T`는 강조된 테마를 현재 `TERM_PROGRAM`에 대한 `[ui.terminal_themes]`에 저장합니다. 매핑된 테마는 선택기에서 `(default)` 배지로 표시됩니다.

#### 흔한 `TERM_PROGRAM` 값

키는 환경 변수와 그대로 매칭됩니다 — 점이나 특수 문자를 포함하면 TOML에서 따옴표로 묶으세요.

| 터미널 | `TERM_PROGRAM` |
| ------ | -------------- |
| Apple Terminal | `Apple_Terminal` |
| iTerm2 | `iTerm.app` |
| WezTerm | `WezTerm` |
| VS Code 통합 터미널 | `vscode` |
| Ghostty | `ghostty` |

#### 해결 순서

Deep Agents Code는 매 실행마다 다음 우선순위로 테마를 해결합니다.

1. `DEEPAGENTS_CODE_THEME` 환경 변수(명시적 오버라이드).
2. 현재 `TERM_PROGRAM`에 대한 `[ui.terminal_themes]` 매핑.
3. `/theme`로 저장된 `[ui] theme` 선호값.
4. 내장 기본값(`langchain`).
</details>

---

## 🔄 자동 업데이트 (Auto-update)

Deep Agents Code는 자동으로 업데이트를 확인하고 설치할 수 있습니다.

**설정 파일:**

```toml
[update]
auto_update = true
```

**환경 변수:**

```bash
export DEEPAGENTS_CODE_AUTO_UPDATE=1
```

환경 변수가 설정 파일보다 우선합니다.

활성화되면, Deep Agents Code는 세션 시작 시 PyPI에서 최신 버전을 확인하고 감지된 설치 방법(uv, Homebrew, pip)을 사용해 자동 업그레이드합니다. 비활성화되어 있을 때(기본)는 적절한 설치 명령과 함께 업데이트 힌트를 표시합니다.

`/update` 슬래시 명령으로 언제든 수동으로 업데이트를 확인하고 설치할 수도 있으며, 이는 캐시를 우회하고 인라인으로 성공/실패를 보고합니다.

업그레이드 후 Deep Agents Code는 다음 실행 시 변경 로그 링크가 있는 "what's new" 배너를 표시합니다.

세션 종료 시 세션 중에 더 새로운 버전이 감지되었다면, 알림 배너가 표시됩니다.

---

## 📦 관리형 배포 (Managed deployments)

[설치 스크립트](https://github.com/langchain-ai/deepagents/blob/main/libs/cli/scripts/install.sh)는 macOS MDM 도구(Kandji, Jamf 등)가 최소화된 root 환경에서 스크립트를 실행하는 시나리오를 위해 root로 실행하는 것을 지원합니다.

`id -u`가 `0`일 때 스크립트는,

1. 실제 콘솔 사용자의 `HOME`을 해결(`/dev/console` 또는 `/Users` 디렉터리 스캔으로)
2. 각 설치 단계 후 생성된 모든 파일을 대상 사용자에게 다시 `chown`

비 root 설치는 영향을 받지 않습니다. 모든 root 전용 코드 경로는 root가 아닐 때 단락(short-circuit)합니다.

관리형 설치에 자동 업데이트를 사전 설정하려면 사용자 셸 프로필에 `DEEPAGENTS_CODE_AUTO_UPDATE=1`을 설정하거나 `[update] auto_update = true`가 있는 `config.toml`을 `~/.deepagents/config.toml`에 배포하세요. 자동 업데이트와 업데이트 체크를 완전히 억제하려면 `DEEPAGENTS_CODE_NO_UPDATE_CHECK=1`을 설정하세요.

---

## 📚 환경 변수 레퍼런스

모든 Deep Agents Code 전용 환경 변수는 `DEEPAGENTS_CODE_` 접두어를 사용합니다. 접두어가 서드파티 자격 증명 오버라이드로도 동작하는 방식은 [`DEEPAGENTS_CODE_` 접두어](#deepagents_code_-접두어)를 참고하세요.

- **`DEEPAGENTS_CODE_AUTO_UPDATE`** *(string, 선택)*: Deep Agents Code 자동 업데이트 활성화(`1`, `true`, `yes`).

- **`DEEPAGENTS_CODE_DEBUG`** *(string, 선택)*: 파일에 상세 디버그 로깅 활성화. `1`, `true`, `yes`, `on`(대소문자 무관)을 활성으로 받음; `0`, `false`, `no`, `off`, 빈 문자열, 또는 미설정은 비활성화. 활성화되면 세션별 서버 로그 파일이 셧다운 시 보존되고 트리아주를 위해 그 경로가 stderr에 출력됩니다.

- **`DEEPAGENTS_CODE_DEBUG_FILE`** *(string, 기본값 `/tmp/deepagents_debug.log`, 선택)*: 디버그 로그 파일 경로.

- **`DEEPAGENTS_CODE_EXTRA_SKILLS_DIRS`** *(string, 선택)*: [스킬 컨테인먼트 허용 목록](#-스킬-추가-허용-디렉터리-skills-extra-allowed-directories)에 추가되는 콜론 구분 경로.

- **`DEEPAGENTS_CODE_LANGSMITH_PROJECT`** *(string, 선택)*: 에이전트 트레이스에 대한 LangSmith 프로젝트 이름 오버라이드. [Trace with LangSmith](https://docs.langchain.com/oss/python/deepagents/code/overview#trace-with-langsmith)를 참고하세요.

- **`DEEPAGENTS_CODE_NO_UPDATE_CHECK`** *(string, 선택)*: 설정 시 자동 업데이트 체크 비활성화.

- **`DEEPAGENTS_CODE_SHELL_ALLOW_LIST`** *(string, 선택)*: 허용할 셸 명령의 콤마 구분 목록(또는 `recommended` / `all`).

- **`DEEPAGENTS_CODE_USER_ID`** *(string, 선택)*: LangSmith 트레이스 메타데이터에 부착할 사용자 식별자.

---

## 📝 외부 에디터 (External editor)

`Ctrl+X`를 누르거나 `/editor`를 입력하여 외부 에디터에서 프롬프트를 작성합니다. Deep Agents Code는 `$VISUAL`, 다음 `$EDITOR`, 그 다음 `vi`(macOS/Linux) 또는 `notepad`(Windows)로 폴백합니다. GUI 에디터(VS Code, Cursor, Zed, Sublime Text, Windsurf)는 자동으로 `--wait` 플래그를 받아 파일을 닫을 때까지 Deep Agents Code가 블록합니다.

```bash
# 셸 프로필(~/.zshrc, ~/.bashrc 등)에 설정
export VISUAL="code"    # GUI 에디터(--wait 자동 주입)
export EDITOR="nvim"    # 터미널 폴백
```

---

## 🪝 Hooks

Hooks를 사용하면 외부 프로그램이 Deep Agents Code 라이프사이클 이벤트에 반응할 수 있습니다. `~/.deepagents/hooks.json`에 명령을 설정하면 이벤트가 발생할 때마다 매칭되는 각 명령의 stdin으로 JSON 페이로드를 파이프합니다.

Hooks는 백그라운드 스레드에서 fire-and-forget 방식으로 실행됩니다 — Deep Agents Code를 절대 블록하지 않으며 실패는 세션을 방해하지 않고 로그됩니다.

### 설정

`~/.deepagents/hooks.json`을 생성합니다.

```json
{
  "hooks": [
    {
      "command": ["bash", "-c", "cat >> ~/deepagents-events.log"],
      "events": ["session.start", "session.end"]
    }
  ]
}
```

이제 세션이 시작되거나 끝날 때마다 Deep Agents Code는 이벤트 페이로드를 `~/deepagents-events.log`에 append합니다.

### Hook 설정

설정 파일은 단일 `hooks` 배열을 포함합니다. 각 항목은,

- **`command`** *(list[str], 필수)*: 실행할 명령과 인자. 셸 확장 없음: 필요한 경우 `["bash", "-c", "..."]`를 사용.

- **`events`** *(list[str], 선택)*: 구독할 이벤트 이름. 생략하거나 비워두면 **모든** 이벤트를 받음.

```json
{
  "hooks": [
    {
      "command": ["python3", "my_handler.py"],
      "events": ["session.start", "task.complete"]
    },
    {
      "command": ["bash", "log_everything.sh"]
    }
  ]
}
```

위 두 번째 hook은 `events` 필터가 없으므로 Deep Agents Code가 emit하는 모든 이벤트를 받습니다.

### 페이로드 형식

각 hook 명령은 `"event"` 키와 이벤트별 필드를 포함한 JSON 객체를 stdin으로 받습니다.

```json
{
  "event": "session.start",
  "thread_id": "abc123"
}
```

### 이벤트 레퍼런스

#### `session.start`

에이전트 세션이 시작될 때 발생(대화형 및 비대화형 모드 모두).

- **`thread_id`** *(string, 필수)*: 세션 스레드 식별자.

#### `session.end`

세션이 종료될 때 발생.

- **`thread_id`** *(string, 필수)*: 세션 스레드 식별자.

#### `user.prompt`

대화형 모드에서 사용자가 채팅 메시지를 제출할 때 발생.

추가 필드 없음.

#### `input.required`

에이전트가 사람의 입력을 요구할 때 발생(human-in-the-loop interrupt).

추가 필드 없음.

#### `permission.request`

하나 이상의 도구 호출에 사용자 권한이 필요할 때 승인 다이얼로그 전에 발생.

- **`tool_names`** *(list[str], 필수)*: 승인을 요청하는 도구 이름들.

#### `tool.error`

도구 호출이 오류를 반환할 때 발생.

- **`tool_names`** *(list[str], 필수)*: 오류가 발생한 도구 이름들.

#### `task.complete`

에이전트가 현재 작업을 완료할 때(추가 인터럽트 없이 스트리밍 루프가 종료될 때) 발생.

- **`thread_id`** *(string, 필수)*: 세션 스레드 식별자.

#### `context.compact`

Deep Agents Code가 대화 컨텍스트를 압축(요약)하기 전에 발생.

추가 필드 없음.

### 실행 모델

- **백그라운드 스레드**: Hook 서브프로세스는 `asyncio.to_thread`를 통해 스레드에서 실행되어 메인 이벤트 루프가 절대 블록되지 않습니다.
- **동시 디스패치**: 여러 hooks가 이벤트와 매칭되면 스레드 풀에서 동시에 실행됩니다.
- **5초 타임아웃**: 각 명령은 5초 타임아웃을 가집니다. 초과하는 명령은 종료됩니다.
- **Fire-and-forget**: 오류는 hook별로 잡혀 debug/warning 수준에서 로그됩니다. 실패한 hook은 절대 Deep Agents Code를 크래시시키거나 스톨시키지 않습니다.
- **지연 로딩**: 설정 파일은 첫 이벤트 디스패치 시 한 번 읽히고 세션 동안 캐시됩니다.
- **셸 확장 없음**: 명령은 셸을 거치지 않고 직접 실행됩니다. 파이프나 변수 확장 같은 셸 기능이 필요하면 `["bash", "-c", "..."]`로 감싸세요.

### Hook 예시

<details>
<summary>모든 이벤트를 파일에 로그</summary>

```json
{
  "hooks": [
    {
      "command": ["bash", "-c", "jq -c . >> ~/.deepagents/hook-events.jsonl"],
      "events": []
    }
  ]
}
```
</details>

<details>
<summary>작업 완료 시 데스크톱 알림(macOS)</summary>

```json
{
  "hooks": [
    {
      "command": [
        "bash", "-c",
        "osascript -e 'display notification \"Agent finished\" with title \"Deep Agents\"'"
      ],
      "events": ["task.complete"]
    }
  ]
}
```
</details>

<details>
<summary>Python 핸들러</summary>

stdin에서 JSON 페이로드를 읽는 핸들러 스크립트를 작성하세요.

```python title="my_handler.py"
import json
import sys

payload = json.load(sys.stdin)
event = payload["event"]

if event == "session.start":
    print(f"Session started: {payload['thread_id']}", file=sys.stderr)
elif event == "permission.request":
    print(f"Approval needed for: {payload['tool_names']}", file=sys.stderr)
```

```json title="~/.deepagents/hooks.json"
{
  "hooks": [
    {
      "command": ["python3", "my_handler.py"],
      "events": ["session.start", "permission.request"]
    }
  ]
}
```
</details>

### 보안 고려 사항

Hooks는 Git hooks나 셸 aliases와 동일한 신뢰 모델을 따릅니다 — `~/.deepagents/hooks.json`에 쓸 수 있는 사용자라면 누구나 임의의 명령을 실행할 수 있습니다. 이는 의도된 설계입니다.

- **명령 주입 없음**: 페이로드 데이터는 명령줄 인자가 아니라 JSON으로 stdin에만 흐릅니다. 이스케이프는 `json.dumps`가 처리합니다.
- **기본적으로 셸 없음**: 명령은 `shell=False`로 실행되어 셸 주입을 방지합니다.
- **잘못된 설정**: 유효하지 않은 JSON이나 예상치 못한 타입은 보안 이슈가 아닌 로그된 경고로 처리됩니다.

> ⚠️ 신뢰하는 소스의 hooks만 추가하세요. Hook은 당신의 사용자 계정과 동일한 권한을 가집니다.
