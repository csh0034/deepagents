# Deep Agents Code: 원격 샌드박스 사용 (Use remote sandboxes)

> 원문: https://docs.langchain.com/oss/python/deepagents/code/remote-sandboxes
>
> LangSmith, Daytona, Modal, Runloop, AgentCore 샌드박스에서 Deep Agents Code 도구를 실행합니다. 프로바이더 extras 설치, 자격 증명 설정, 플래그와 셋업 스크립트 사용법.

---

Deep Agents Code는 [sandbox as tool](https://docs.langchain.com/oss/python/deepagents/sandboxes#sandbox-as-tool-pattern) 패턴을 사용합니다: `dcode` 프로세스(LLM 루프, 메모리, 도구 디스패치)는 사용자 머신에서 실행되지만, 에이전트의 도구 호출(`read_file`, `write_file`, `execute` 등)은 로컬 파일 시스템이 아닌 원격 샌드박스를 대상으로 합니다. 샌드박스로 파일을 가져오려면 [셋업 스크립트](#-셋업-스크립트-setup-scripts) 또는 프로바이더의 파일 전송 API를 사용하세요([Working with files](https://docs.langchain.com/oss/python/deepagents/sandboxes#working-with-files) 참조).

샌드박스 아키텍처, 통합 패턴, 보안 모범 사례에 대한 심층 내용은 [Sandboxes](https://docs.langchain.com/oss/python/deepagents/sandboxes)를 참고하세요.

---

## 📖 목차

1. [프로바이더 의존성 설치](#-1-프로바이더-의존성-설치)
2. [프로바이더 자격 증명 설정](#-2-프로바이더-자격-증명-설정)
3. [샌드박스와 함께 Deep Agents Code 실행](#-3-샌드박스와-함께-deep-agents-code-실행)
4. [샌드박스 플래그와 예시](#-샌드박스-플래그와-예시)
5. [셋업 스크립트 (Setup scripts)](#-셋업-스크립트-setup-scripts)

---

## 📦 1. 프로바이더 의존성 설치

**LangSmith** — `deepagents-code` 설치 시 기본 포함됨. 추가 설치 불필요.

**Daytona**

```bash
uv tool install deepagents-code --with langchain-daytona
```

**Modal**

```bash
uv tool install deepagents-code --with langchain-modal
```

**Runloop**

```bash
uv tool install deepagents-code --with langchain-runloop
```

**AgentCore**

```bash
uv tool install deepagents-code --with langchain-agentcore-codeinterpreter
```

---

## 🔑 2. 프로바이더 자격 증명 설정

**LangSmith**

```bash
export LANGSMITH_API_KEY="your-key"
```

**Daytona**

```bash
export DAYTONA_API_KEY="your-key"
```

**Modal**

```bash
modal setup
```

**Runloop**

```bash
export RUNLOOP_API_KEY="your-key"
```

**AgentCore**

```bash
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_SESSION_TOKEN="session-token"
export AWS_REGION="us-west-2"
```

---

## 🚀 3. 샌드박스와 함께 Deep Agents Code 실행

**LangSmith**

```bash
dcode --sandbox langsmith
```

**Daytona**

```bash
dcode --sandbox daytona
```

**Modal**

```bash
dcode --sandbox modal
```

**Runloop**

```bash
dcode --sandbox runloop
```

**AgentCore**

```bash
dcode --sandbox agentcore
```

---

## 🚩 샌드박스 플래그와 예시

| 플래그 | 설명 |
| ------ | ---- |
| `--sandbox TYPE` | 사용할 샌드박스 프로바이더: `langsmith`, `agentcore`, `modal`, `daytona`, `runloop`(기본값: `none`) |
| `--sandbox-id ID` | 새로 만드는 대신 ID로 기존 샌드박스를 재사용. 생성과 정리(cleanup)를 건너뜀. 자세한 내용은 사용 중인 샌드박스 문서를 참고 |
| `--sandbox-setup PATH` | 샌드박스 생성 시 내부에서 실행할 셋업 스크립트 경로 |

예시:

```bash
# 새 Daytona 샌드박스 생성
dcode --sandbox daytona

# 기존 샌드박스 재사용(생성과 정리 건너뜀)
dcode --sandbox runloop --sandbox-id dbx_abc123

# 샌드박스 생성 후 셋업 스크립트 실행
dcode --sandbox modal --sandbox-setup ./setup.sh
```

---

## 🛠️ 셋업 스크립트 (Setup scripts)

`--sandbox-setup`을 사용하면 샌드박스 생성 후 그 안에서 셸 스크립트를 실행합니다. 저장소 클론, 의존성 설치, 환경 변수 구성에 유용합니다.

```bash title="setup.sh"
#!/bin/bash
set -e

# GitHub 토큰을 사용해 저장소 클론
git clone https://x-access-token:${GITHUB_TOKEN}@github.com/username/repo.git $HOME/workspace
cd $HOME/workspace

# 환경 변수를 지속적으로 설정
cat >> ~/.bashrc <<'EOF'
export GITHUB_TOKEN="${GITHUB_TOKEN}"
export OPENAI_API_KEY="${OPENAI_API_KEY}"
cd $HOME/workspace
EOF
source ~/.bashrc
```

Deep Agents Code는 셋업 스크립트의 `${VAR}` 참조를 로컬 환경 변수로 확장합니다. 셋업 스크립트가 접근할 시크릿은 로컬 `.env` 파일에 저장하세요.

> ⚠️ 샌드박스는 코드 실행을 격리하지만, 신뢰할 수 없는 입력이 있을 때 에이전트는 여전히 프롬프트 인젝션에 취약합니다. Human-in-the-loop 승인, 짧은 수명의 시크릿, 신뢰할 수 있는 셋업 스크립트만 사용하세요. 자세한 내용은 [Security considerations](https://docs.langchain.com/oss/python/deepagents/sandboxes#security-considerations)를 참고하세요.
