# Agent Client Protocol (ACP)

> 원문: https://docs.langchain.com/oss/python/deepagents/acp
>
> ACP(Agent Client Protocol)를 통해 Deep Agent를 노출하여 코드 에디터 및 IDE와 통합합니다.

---

## 📌 ACP란?

[Agent Client Protocol(ACP)](https://agentclientprotocol.com/get-started/introduction)는 코딩 에이전트와 코드 에디터/IDE 사이의 통신을 표준화한 프로토콜입니다.
ACP를 사용하면 ACP 호환 클라이언트(코드 에디터 등) 어디에서나 커스텀 Deep Agent를 활용할 수 있으며, 에디터는 프로젝트 컨텍스트를 제공하고 풍부한 업데이트를 수신할 수 있습니다.

> ℹ️ ACP는 에이전트-에디터 통합을 위한 것입니다. 외부 서버가 호스팅하는 도구를 에이전트가 호출하도록 하려면 [Model Context Protocol(MCP)](https://docs.langchain.com/oss/python/langchain/mcp/)를 참고하세요.

---

## 🚀 빠른 시작 (Quickstart)

ACP 통합 패키지를 설치합니다.

```bash
# pip
pip install deepagents-acp
```

```bash
# uv
uv add deepagents-acp
```

그런 다음 Deep Agent를 ACP로 노출합니다.

다음 코드는 stdio 모드로 ACP 서버를 시작합니다(stdin에서 요청을 읽고 stdout으로 응답을 씁니다). 실제로는 보통 ACP 클라이언트(예: 에디터)가 실행하는 명령으로 사용하며, 클라이언트는 stdio를 통해 서버와 통신합니다.

```python
import asyncio

from acp import run_agent
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver

from deepagents_acp.server import AgentServerACP


async def main() -> None:
    agent = create_deep_agent(
        model="google_genai:gemini-3.1-pro-preview",
        # You can customize your deep agent here: set a custom prompt,
        # add your own tools, attach middleware, or compose subagents.
        system_prompt="You are a helpful coding assistant",
        checkpointer=MemorySaver(),
    )

    server = AgentServerACP(agent)
    await run_agent(server)


if __name__ == "__main__":
    asyncio.run(main())
```

> 💡 **예시 코딩 에이전트**: [`deepagents-acp` 패키지의 예제 코딩 에이전트](https://github.com/langchain-ai/deepagents/blob/main/libs/acp/examples/demo_agent.py)에는 파일 시스템과 셸 기능을 갖춘 즉시 실행 가능한 에이전트가 포함되어 있습니다.

---

## 🧩 클라이언트 (Clients)

ACP 에이전트 서버를 실행할 수 있는 어떤 환경에서도 Deep Agent를 사용할 수 있습니다. 주요 ACP 클라이언트는 다음과 같습니다.

- [Zed](https://zed.dev/docs/ai/external-agents)
- [JetBrains IDEs](https://www.jetbrains.com/help/ai-assistant/acp.html)
- Visual Studio Code ([vscode-acp](https://github.com/formulahendry/vscode-acp)을 통해)
- Neovim (ACP 호환 플러그인을 통해)

### Zed

`deepagents` 리포지토리에는 [Zed](https://zed.dev/docs/ai/external-agents)에 등록할 수 있는 [데모 ACP 엔트리포인트](https://github.com/langchain-ai/deepagents/blob/main/libs/acp/run_demo_agent.sh)가 포함되어 있습니다.

1. `deepagents` 리포를 클론하고 의존성을 설치합니다.

```bash
git clone https://github.com/langchain-ai/deepagents.git
cd deepagents/libs/acp
uv sync --all-groups
chmod +x run_demo_agent.sh
```

2. 데모 에이전트용 자격 증명을 설정합니다.

```bash
cp .env.example .env
```

그런 다음 `.env`에서 `ANTHROPIC_API_KEY`를 설정합니다.

3. Zed의 `settings.json`에 ACP 에이전트 서버 명령을 구성합니다.

```json
{
  "agent_servers": {
    "DeepAgents": {
      "type": "custom",
      "command": "/your/absolute/path/to/deepagents/libs/acp/run_demo_agent.sh"
    }
  }
}
```

4. Zed의 Agents 패널을 열고 Deep Agents 스레드를 시작합니다.

### Toad

로컬 개발 도구로 ACP 에이전트 서버를 실행하고 싶다면, 프로세스 관리를 위해 [Toad](https://github.com/batrachianai/toad)를 사용할 수 있습니다.

```bash
uv tool install -U batrachian-toad

toad acp "python path/to/your_server.py" .
# 또는
toad acp "uv run python path/to/your_server.py" .
```

> ℹ️ 프로토콜 세부 정보 및 에디터 지원은 상위 ACP 문서를 참고하세요.
>
> - 소개: [https://agentclientprotocol.com/get-started/introduction](https://agentclientprotocol.com/get-started/introduction)
> - 클라이언트/에디터: [https://agentclientprotocol.com/get-started/clients](https://agentclientprotocol.com/get-started/clients)
