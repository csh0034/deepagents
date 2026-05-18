# Deep Agents Code: MCP 도구 (MCP tools)

> 원문: https://docs.langchain.com/oss/python/deepagents/code/mcp-tools
>
> MCP(Model Context Protocol) 서버에서 추가 도구를 로드하는 방법

---

[MCP(Model Context Protocol)](https://modelcontextprotocol.io/)는 외부 서버 — 파일 시스템, API, 데이터베이스 등 — 의 도구로 Deep Agents Code를 확장할 수 있게 해주며, 에이전트 자체를 수정할 필요가 없습니다. Deep Agents Code는 시작 시 MCP 서버에 연결하고, 도구를 발견하고, 기본 내장 도구와 함께 에이전트에 사용 가능하게 만듭니다.

프로젝트 수준 스코프를 위해 프로젝트에 `.mcp.json` 설정 파일을 추가하거나, 모든 프로젝트에 적용되도록 사용자 수준에 추가하여 MCP 서버를 추가합니다.

---

## 📖 목차

1. [Quickstart](#-quickstart)
2. [자동 발견 (Auto-discovery)](#-자동-발견-auto-discovery)
3. [설정 형식 (Configuration format)](#-설정-형식-configuration-format)
4. [다중 서버 (Multiple servers)](#-다중-서버-multiple-servers)
5. [도구 필터링 (Tool filtering)](#-도구-필터링-tool-filtering)
6. [OAuth 로그인](#-oauth-로그인)
7. [서버 상태 (Server status)](#-서버-상태-server-status)
8. [프로젝트 수준 신뢰 (Project-level trust)](#-프로젝트-수준-신뢰-project-level-trust)
9. [시스템 프롬프트 인식](#-시스템-프롬프트-인식)
10. [트러블슈팅 (Troubleshooting)](#-트러블슈팅-troubleshooting)
11. [더 읽기](#-더-읽기)

---

## 🚀 Quickstart

이 빠른 시작에서는 [LangChain documentation MCP server](https://docs.langchain.com/mcp)를 머신의 모든 Deep Agents Code 세션에 추가합니다. 다른 MCP 서버의 URL 또는 stdio 명령으로 동일한 형태에서 교체할 수 있습니다.

### 1단계 — 설정 파일 생성

아직 없다면 머신의 모든 프로젝트에서 서버가 사용 가능하도록 사용자 수준에 `.mcp.json` 파일을 생성하거나 프로젝트 수준에 생성합니다.

**사용자(User)**

```bash
mkdir -p ~/.deepagents
touch ~/.deepagents/.mcp.json
```

이 파일(`~/.deepagents/.mcp.json`)의 서버는 이 머신의 모든 프로젝트에서 사용 가능합니다.

**프로젝트(Project)**

```bash
touch .mcp.json
```

이 파일(`<project>/.mcp.json`)의 서버는 이 프로젝트에서 사용 가능합니다.

**프로젝트(숨김, Project hidden)**

```bash
mkdir -p .deepagents
touch .deepagents/.mcp.json
```

이 파일(`<project>/.deepagents/.mcp.json`)의 서버는 이 프로젝트에서 사용 가능하면서 리포 루트 밖에 보관됩니다.

전체 우선순위 규칙은 [Discovery locations](#discovery-locations)를 참고하세요.

### 2단계 — MCP 서버 추가

```json title="~/.deepagents/.mcp.json"
{
    "mcpServers": {
        "docs-langchain": {
            "type": "http",
            "url": "https://docs.langchain.com/mcp"
        }
    }
}
```

더 많은 서버를 추가하려면 `mcpServers`에 항목을 추가하세요. OAuth, stdio, SSE, HTTP 서버 필드, 환경 변수, 헤더는 [Configuration format](#-설정-형식-configuration-format)을 참고하세요.

### 3단계 — Deep Agents Code 실행

```bash
dcode
```

시작 시 Deep Agents Code는 설정을 자동 발견하고, 각 서버에 연결하고, 도구를 발견하고, 확인 메시지를 출력합니다.

```
✓ Loaded 3 MCP tools
```

대화형 세션에서 `/mcp`를 실행하여 서버별 상태, 전송 방식, 로드된 도구 목록을 확인할 수 있습니다. 에이전트는 세션 동안 해당 도구들을 사용할 수 있습니다 — stdio 서버는 도구 호출 사이에 살아 있는 상태로 유지됩니다.

---

## 🔍 자동 발견 (Auto-discovery)

Deep Agents Code는 표준 위치에서 `.mcp.json` 파일을 자동으로 검색합니다. 플래그가 필요 없습니다 — 설정 파일을 두면 자동으로 인식됩니다.

### Discovery locations

설정은 다음 순서(낮은 우선순위 → 높은 우선순위)로 확인됩니다.

| 우선순위 | 위치 | 스코프 |
| -------- | ---- | ------ |
| 1 (최저) | `~/.deepagents/.mcp.json` | 사용자 수준 — 모든 프로젝트에 적용 |
| 2 | `<project>/.deepagents/.mcp.json` | 프로젝트 수준 — `.deepagents` 서브디렉터리 |
| 3 (최고) | `<project>/.mcp.json` | 프로젝트 수준 — 루트(Claude Code 호환) |

프로젝트 루트는 `.git` 폴더를 포함하는 가장 가까운 부모 디렉터리이며, 없으면 현재 작업 디렉터리로 폴백됩니다.

여러 설정 파일이 존재할 때 `mcpServers` 항목은 머지됩니다. 동일한 서버 이름이 여러 파일에 나타나면 더 높은 우선순위의 설정이 승리합니다. 다른 프로젝트를 방해하지 않고 프로젝트 수준 설정이 사용자 수준 항목을 오버라이드(예: 같은 서버의 다른 버전 고정)할 수 있게 합니다.

### 플래그

| 플래그 | 동작 |
| ------ | ---- |
| `--mcp-config PATH` | 명시적 설정을 최고 우선순위 소스로 추가(자동 발견된 설정 위에 머지) |
| `--no-mcp` | MCP를 완전히 비활성화 — 어떤 서버도 로드되지 않음 |

> ℹ️ `--mcp-config`와 `--no-mcp`는 상호 배타적입니다.

### Claude Code 호환성

Claude Code를 위해 프로젝트 루트에 이미 `.mcp.json`이 있다면 Deep Agents Code가 자동으로 인식합니다 — 추가 설정이 필요하지 않습니다.

---

## ⚙️ 설정 형식 (Configuration format)

`mcpServers` 아래의 각 키는 서버 이름입니다. 서버의 필드가 Deep Agents Code가 연결하는 방식을 결정합니다.

### stdio 서버 (기본값)

stdio 서버는 자식 프로세스로 생성됩니다. Deep Agents Code는 stdin/stdout으로 통신합니다.

```json title="mcp-config.json"
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "your-token" }
    }
  }
}
```

### SSE 및 HTTP 서버

원격 MCP 서버의 경우 `type`을 `"sse"` 또는 `"http"`로 설정하고 `url`을 제공하세요.

```json title="mcp-config.json"
{
  "mcpServers": {
    "remote-api": {
      "type": "sse",
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer your-token" }
    }
  }
}
```

### 필드 레퍼런스

<details>
<summary>stdio (기본값)</summary>

**필수**: `command`. **선택**: `args`, `env`, 그리고 공유되는 [도구 필터링 필드](#-도구-필터링-tool-filtering).

- **`command`** *(string, 필수)*: 실행할 실행 파일.
- **`args`** *(string[])*: 명령에 전달되는 인자.
- **`env`** *(object)*: 서브프로세스에 설정되는 환경 변수. API 키 등 자격 증명을 셸 히스토리에 노출하지 않고 전달하는 데 사용.

</details>

<details>
<summary>sse</summary>

**필수**: `type: "sse"`, `url`. **선택**: `headers`, `auth`, 그리고 공유되는 [도구 필터링 필드](#-도구-필터링-tool-filtering).

- **`type`** *(`"sse"`, 필수)*: 전송 타입. Server-Sent Events는 `"sse"`를 사용.
- **`url`** *(string, 필수)*: 서버 엔드포인트 URL.
- **`headers`** *(object)*: 모든 요청에 전송되는 HTTP 헤더. 주로 인증에 사용. 값은 부모 셸 환경 변수에 대한 `${VAR}` 참조를 지원(서버 활성화 시 해결).
- **`auth`** *(`"oauth"`)*: `Authorization` 헤더 대신 `dcode mcp login`으로 OAuth 로그인 플로를 구동하려면 `"oauth"`로 설정. `Authorization` 헤더와 결합 불가. [OAuth login](#-oauth-로그인) 참고.

</details>

<details>
<summary>http</summary>

**필수**: `type: "http"`, `url`. **선택**: `headers`, `auth`, 그리고 공유되는 [도구 필터링 필드](#-도구-필터링-tool-filtering).

- **`type`** *(`"http"`, 필수)*: 전송 타입. streamable HTTP에는 `"http"`. `streamable_http`와 `streamable-http`도 별칭으로 받음.
- **`url`** *(string, 필수)*: 서버 엔드포인트 URL.
- **`headers`** *(object)*: 모든 요청에 전송되는 HTTP 헤더. 주로 인증에 사용. 값은 부모 셸 환경 변수에 대한 `${VAR}` 참조를 지원(서버 활성화 시 해결).
- **`auth`** *(`"oauth"`)*: `Authorization` 헤더 대신 `dcode mcp login`으로 OAuth 로그인 플로를 구동하려면 `"oauth"`로 설정. `Authorization` 헤더와 결합 불가. [OAuth login](#-oauth-로그인) 참고.

</details>

> ℹ️ `type` 필드는 다른 MCP 클라이언트와의 호환성을 위해 `transport`로도 작성할 수 있습니다.

> ℹ️ 서버 이름은 `[A-Za-z0-9_-]+`와 매칭되어야 합니다. 이름은 OAuth 토큰 파일의 디스크 basename으로 사용되므로 경로 구분자나 다른 셸 메타문자는 설정 로드 시 거부됩니다.

### 헤더 환경 변수

헤더 값은 부모 셸의 `${VAR}` 치환을 지원하며, 설정 로드 시점이 아닌 서버 활성화 시점에 해결됩니다. 설정되지 않은 변수 하나는 해당 변수를 필요로 하는 서버만 실패시키며 — 나머지는 정상적으로 올라옵니다.

```json title=".mcp.json"
{
    "mcpServers": {
        "internal-api": {
            "type": "http",
            "url": "https://api.example.com/mcp",
            "headers": { "Authorization": "Bearer ${INTERNAL_API_TOKEN}" }
        }
    }
}
```

---

## 🧩 다중 서버 (Multiple servers)

원하는 만큼 많은 서버를 설정할 수 있습니다. 모든 서버의 도구는 머지되어 에이전트에서 사용 가능해집니다.

```json title="mcp-config.json"
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "ghp_..." }
    },
    "database": {
      "type": "sse",
      "url": "https://db-mcp.internal:8080/mcp",
      "headers": { "Authorization": "Bearer ..." }
    }
  }
}
```

---

## 🔧 도구 필터링 (Tool filtering)

각 서버는 다음 두 선택 필드 중 하나로 에이전트에 노출하는 도구를 좁힐 수 있습니다.

- `allowedTools`: 나열된 도구만 유지하고 나머지는 모두 드롭.
- `disabledTools`: 나열된 도구를 드롭하고 나머지는 모두 유지.

필터링은 stdio, HTTP, SSE 서버에 동일하게 적용됩니다. 다음 두 경우는 설정 로드 시 거부됩니다.

- 동일 서버에 `allowedTools`와 `disabledTools` 동시 설정.
- 둘 중 하나를 빈 목록으로 설정(모든 도구를 조용히 제거하거나 no-op이 됨). 대신 필드를 생략하세요.

```json title=".mcp.json"
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "allowedTools": ["read_file", "list_directory"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "disabledTools": ["delete_repository", "delete_*_branch"]
    }
  }
}
```

### 매치 규칙

각 항목은 리터럴 도구 이름 또는 [`fnmatch`](https://docs.python.org/3/library/fnmatch.html) 스타일의 glob입니다(`*`, `?`, `[` 중 하나라도 포함하는 항목은 패턴으로 취급). 항목은 베어(bare) MCP 도구 이름과 서버 접두 형식(`{server}_{tool}`) 양쪽에 매칭되므로 어느 형식이든 동작합니다.

```json
{
  "allowedTools": ["read_file", "fs_list_*"]
}
```

> ℹ️ 로드된 도구와 매칭되지 않는 항목은 에러가 아닌 경고로 로그됩니다 — 기반이 되는 MCP 서버는 설정을 깨뜨리지 않고 버전 간 도구 목록을 진화시킬 수 있습니다.

- **`allowedTools`** *(string[])*: 유지할 도구 이름 또는 `fnmatch` glob 패턴. 이 서버의 다른 모든 도구는 드롭됨. `disabledTools`와 상호 배타적.
- **`disabledTools`** *(string[])*: 드롭할 도구 이름 또는 `fnmatch` glob 패턴. 이 서버의 다른 모든 도구는 유지됨. `allowedTools`와 상호 배타적.

---

## 🔐 OAuth 로그인

OAuth가 필요한 원격 MCP 서버(Slack, GitHub, Notion, Linear, 기타 호스팅 MCP 엔드포인트)의 경우, 서버 항목에 `"auth": "oauth"`를 설정하고 로그인 서브커맨드를 한 번 실행하세요. 토큰은 디스크에 영속 저장되고 자동으로 갱신됩니다.

### 서버 설정

```json title=".mcp.json"
{
    "mcpServers": {
        "linear": {
            "type": "http",
            "url": "https://mcp.linear.app/mcp",
            "auth": "oauth"
        }
    }
}
```

`auth: "oauth"`는 동일 항목의 `Authorization` 헤더와 상호 배타적이며 stdio 서버에는 설정할 수 없습니다.

### 로그인 플로 실행

```bash
dcode mcp login linear
```

진행 방식은 서버의 호스트에 따라 다릅니다.

- **스펙 준수 서버**(기본): Deep Agents Code가 Dynamic Client Registration을 수행하고, 브라우저에서 Authorization Code + PKCE 플로를 열고, 리다이렉트된 URL을 터미널에 다시 붙여넣도록 요청합니다.
- **Slack**(`slack.com`, `*.slack.com`): 동일한 paste-back 플로지만 Slack의 공개 클라이언트가 preseed됩니다. 앱이 올바른 워크스페이스에 설치되도록 선택적 팀 ID(예: `T01234567`)를 묻습니다.
- **GitHub**(`api.githubcopilot.com`): RFC 8628 Device Authorization Grant. Deep Agents Code가 검증 URL과 사용자 코드를 출력하고, 브라우저에서 코드를 입력하면 Deep Agents Code가 완료를 폴링합니다.

기본적으로 `dcode mcp login`은 런타임에 Deep Agents Code가 사용하는 자동 발견된 설정을 동일하게 읽습니다(프로젝트 수준 신뢰 게이팅 대상). 특정 파일을 사용하려면 `--config <path>`를 전달하세요.

```bash
dcode mcp login linear --config ./mcp-config.json
```

> ⚠️ 신뢰되지 않은 프로젝트 수준 설정([Project-level trust](#-프로젝트-수준-신뢰-project-level-trust) 참고)은 공격자가 제어하는 `headers` 항목이 `${VAR}` 보간을 통해 로컬 시크릿을 유출하는 것을 방지하기 위해 `mcp login` 중에 건너뛰어집니다. 프로젝트에서 한 번 `dcode`를 실행하여 설정을 승인하거나, `--config <path>`를 명시적으로 전달하세요.

### 토큰 저장

토큰은 다음에 기록됩니다.

```text
~/.deepagents/.state/mcp-tokens/<server>-<sha256-16(url)>.json
```

`<sha256-16(url)>` 세그먼트는 서버 URL의 SHA-256의 처음 16자리 16진수입니다. 디렉터리는 `0700`, 각 토큰 파일은 `0600` 모드로 락됩니다. 파일은 OAuth 액세스 토큰, 리프레시 토큰, 동적으로 등록된 클라이언트 정보를 포함하며, 모두 스키마 버전이 있는 페이로드로 원자적으로 기록됩니다(임시 파일에 쓰고 `rename`).

> ℹ️ 파일명에 URL을 해시한다는 것은 동일한 서버 이름이 서로 다른 URL(예: dev vs prod)을 가리키더라도 독립적인 토큰 파일을 갖고 서로 충돌하지 않는다는 의미입니다.

### 재인증

런타임에 갱신이 실패하면(리프레시 토큰이 만료되었거나 폐기됨), Deep Agents Code는 에이전트를 크래시시키는 대신 서버를 `unauthenticated`로 표시합니다. 환영 배너에 인증되지 않은 서버 수가 표시되고 `/mcp`는 서버별 사유를 보고합니다. 자격 증명을 갱신하려면 `dcode mcp login <server>`를 다시 실행하세요 — 대화는 재시작 없이 계속됩니다.

---

## 📊 서버 상태 (Server status)

설정된 각 서버는 시작 후 세 가지 상태 중 하나에 안착합니다.

| 상태 | 의미 |
| ---- | ---- |
| `ok` | 연결됨; 도구가 로드되어 에이전트에서 사용 가능 |
| `unauthenticated` | OAuth 로그인 필요 또는 갱신 실패 — `dcode mcp login <server>` 실행 |
| `error` | Pre-flight, 디스커버리, 전송 설정 실패; 에러 메시지가 첨부됨 |

서버 하나가 실패해도 더 이상 시작이 중단되지 않습니다. 에이전트는 정상 기동된 서버로 실행되며, 환영 배너에서 도구 개수 옆에 인증되지 않은/오류 서버 수가 표시됩니다. 대화형 세션에서 `/mcp`를 열어 서버별 상태, 전송 방식, 도구 목록, 비 `ok` 항목의 실패 사유를 확인하세요. 뷰어는 서버가 연결되면 라이브 업데이트되고 `tab`/`shift+tab` 탐색을 지원합니다.

---

## 🔒 프로젝트 수준 신뢰 (Project-level trust)

프로젝트 수준 설정에는 로컬 명령을 실행하는 stdio 서버와 `headers`가 환경의 `${VAR}`를 보간할 수 있는 원격 서버가 포함될 수 있습니다. 신뢰할 수 없는 저장소가 CLI 시작 시 임의의 코드를 실행하거나 로컬 시크릿을 유출하지 못하도록, Deep Agents Code는 프로젝트 수준 항목에 **기본 거부(default-deny)** 정책을 강제합니다.

### 작동 방식

- **대화형 모드**: Deep Agents Code는 각 stdio 명령과 원격 URL을 보여주며 프로젝트 서버 활성화 전에 승인을 요청합니다. 승인은 SHA-256 콘텐츠 핑거프린트로 영속 저장됩니다 — 설정이 변경되면 다시 묻습니다.
- **비대화형 모드(`-n`)**: `--trust-project-mcp`가 전달되지 않으면 프로젝트 서버는 조용히 건너뜁니다.
- **신뢰는 stdio와 원격 항목 모두에 적용** — 원격 서버는 pre-flight 프로브 중 localhost나 클라우드 메타데이터 엔드포인트로 SSRF할 수 있고 헤더를 통해 `${VAR}` 값을 유출할 수 있으므로 stdio와 동일하게 게이트됩니다.
- **사용자 수준 설정**(`~/.deepagents/.mcp.json`)은 항상 신뢰됩니다 — `config.toml`이나 `hooks.json`과 동일한 신뢰 모델.
- **`dcode mcp login`**도 프로젝트 신뢰를 존중합니다: 신뢰되지 않은 프로젝트 수준 설정은 로그인 디스커버리 중에 건너뛰어 공격자가 제어하는 원격 항목이 OAuth 핸드셰이크로 시크릿을 끌어들이지 못합니다.

### 플래그

| 플래그 | 동작 |
| ------ | ---- |
| `--trust-project-mcp` | 프롬프트 없이 모든 프로젝트 수준 stdio 서버를 신뢰(CI 및 자동화용) |

```bash
# 승인 프롬프트 건너뛰기
dcode --trust-project-mcp

# 비대화형: 프로젝트 서버를 명시적으로 신뢰
dcode -n "run tests" --trust-project-mcp
```

### 신뢰 저장소 (Trust store)

신뢰 결정은 `~/.deepagents/config.toml`에 저장됩니다.

```toml
[mcp_trust.projects]
"/Users/you/myproject" = "sha256:abc123..."
```

각 키는 절대 프로젝트 루트 경로입니다. 값은 프로젝트 수준 설정 콘텐츠를 연결한 결과의 SHA-256 다이제스트입니다. 신뢰를 취소하려면 항목을 삭제하거나 프로젝트의 `.mcp.json`을 수정하세요(핑거프린트가 자동으로 무효화됨).

> ⚠️ 신뢰된 stdio MCP 서버는 사용자 계정과 동일한 권한을 가집니다. 신뢰하는 저장소의 서버만 승인하세요. 승인 프롬프트에 표시된 명령을 검토한 후 수락하세요.

---

## 🧠 시스템 프롬프트 인식

연결된 MCP 서버와 그 도구는 서버 이름 및 전송 타입별로 그룹화되어 에이전트의 시스템 프롬프트에 자동으로 나열됩니다. 이는 수동 컨텍스트 없이 모델이 도구 출처와 실패 도메인을 추론할 수 있게 돕습니다.

---

## 🔧 트러블슈팅 (Troubleshooting)

<details>
<summary>서버가 시작되지 않음(stdio)</summary>

Deep Agents Code 외부에서 명령이 동작하는지 확인하세요.

```bash
npx -y @modelcontextprotocol/server-filesystem /tmp
```

일반적 원인: 패키지가 설치되지 않음, `npx`가 `PATH`에 없음, 또는 필수 환경 변수 누락.

</details>

<details>
<summary>연결 거부(SSE/HTTP)</summary>

원격 서버가 실행 중이고 URL이 올바른지 확인하세요. 서버가 인증을 요구한다면 `headers`에 올바른 자격 증명이 포함되어 있는지 확인하세요.

</details>

<details>
<summary>도구가 표시되지 않음</summary>

Deep Agents Code는 시작 시 로드된 도구 수를 출력합니다(예: `✓ Loaded 3 MCP tools`). `0`이 표시되면 서버는 정상적으로 시작되었지만 어떤 도구도 광고하지 않은 것입니다 — 서버 자체 로그나 문서를 확인하세요.

</details>

<details>
<summary>/mcp에서 서버가 `unauthenticated`로 표시</summary>

아직 `dcode mcp login <server>`를 실행하지 않았거나, 영속 저장된 리프레시 토큰이 만료되었거나 서버 측에서 폐기되었습니다. 로그인 명령을 다시 실행하세요 — 세션은 계속 실행되며 토큰이 갱신되면 서버가 다시 연결됩니다.

</details>

<details>
<summary>`Invalid MCP config at ...`</summary>

Pre-flight 검증이 `--mcp-config`(또는 자동 발견된 `.mcp.json`)를 거부했습니다. 일반적 원인: 지원되지 않는 서버 이름(`[A-Za-z0-9_-]+`와 매칭되어야 함), stdio 서버의 `auth: oauth`, 동일 항목에 `command`와 `url`이 모두 설정됨, 또는 헤더 값이 문자열이 아님. 강조된 사유를 수정하고 다시 실행하세요 — Deep Agents Code는 더 이상 설정 오류에 대해 여러 페이지 분량의 서브프로세스 트레이스를 덤프하지 않습니다.

</details>

<details>
<summary>`${VAR}` 헤더 참조 실패</summary>

헤더 보간은 활성화 시점에 실행되므로 설정되지 않은 변수는 해당 변수가 필요한 서버만 실패시킵니다. 부모 셸에서 변수를 export하거나 `~/.deepagents/.env`에 추가하세요. 디버깅하려면 `DEEPAGENTS_CODE_DEBUG=1`을 설정하고 셧다운 시 stderr에 출력되는 세션별 로그 경로를 검사하세요.

</details>

---

## 📚 더 읽기

- [LangChain MCP guide](https://docs.langchain.com/oss/python/langchain/mcp): 프로토콜 세부 사항, 커스텀 서버 구축, `langchain-mcp-adapters`를 프로그램적으로 사용하기
- [MCP specification](https://modelcontextprotocol.io/): 공식 프로토콜 스펙과 서버 레지스트리
