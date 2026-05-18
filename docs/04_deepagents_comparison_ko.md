# Claude Agent SDK와의 비교 (Comparison with Claude Agent SDK)

> 원문: https://docs.langchain.com/oss/python/deepagents/comparison
>
> LangChain Deep Agents와 Claude Agent SDK를 비교하여 사용 사례에 맞는 도구를 선택하세요.

---

이 페이지는 [LangChain Deep Agents](https://docs.langchain.com/oss/python/deepagents/overview)와 [Claude Agent SDK](https://platform.anthropic.com/docs/en/agent-sdk/overview)를 비교합니다. 두 제품 모두 커스텀 에이전트 구축을 위한 하니스(harness)이지만, 실행 환경, 배포, 벤더 종속성과 관련해 서로 다른 절충점(tradeoff)을 가집니다.

> [!NOTE]
> Deep Agents는 [OpenSWE](https://github.com/langchain-ai/open-swe)와 [LangSmith Fleet](https://docs.langchain.com/langsmith/fleet/index)에서 프로덕션 환경에 사용되고 있습니다.

---

## 📖 목차

1. [한눈에 보기](#-한눈에-보기)
2. [주요 차이점](#-주요-차이점)
   - [에이전트와 실행 환경](#에이전트와-실행-환경)
   - [멀티 테넌시(Multi-tenancy)](#멀티-테넌시multi-tenancy)
   - [프로덕션 에이전트 서버](#프로덕션-에이전트-서버)
   - [매니지드 클라우드 vs. 셀프 호스팅](#매니지드-클라우드-vs-셀프-호스팅)
   - [LLM](#llm)
   - [생태계(Ecosystems)](#생태계ecosystems)
3. [요약](#-요약)

---

## 👀 한눈에 보기

|  | **Deep Agents** | **Claude Agent SDK** |
| --- | --- | --- |
| **에이전트 실행 위치** | 샌드박스 내부, 또는 샌드박스 외부에서 원격으로 명령 실행 | 샌드박스 내부 |
| **실행 백엔드** | 플러그형: [로컬, 가상 파일 시스템, 원격 샌드박스, 커스텀](https://docs.langchain.com/oss/python/deepagents/backends) | 에이전트가 실행되는 샌드박스의 로컬 파일 시스템 |
| **모델 프로바이더** | 모든 프로바이더(Anthropic, OpenAI, Google 등 100+) | Claude (Anthropic, Bedrock, Vertex, Azure) |
| **프로바이더/모델별 튜닝** | [하니스 프로파일(harness profiles)](https://docs.langchain.com/oss/python/deepagents/profiles) (베타): 시스템 프롬프트, 도구, 미들웨어, 서브에이전트 조정을 선언적 번들로 묶어 프로바이더 또는 특정 모델별로 등록 | 코드 내 각 모델 호출 지점에서 설정 |
| **배포** | LangSmith의 [Managed Deep Agents](https://docs.langchain.com/langsmith/deploy-managed-deep-agent), 또는 [`langgraph build`](https://docs.langchain.com/langsmith/cli#build)로 [독립 실행형 이미지](https://docs.langchain.com/langsmith/deploy-standalone-server) 셀프 호스팅 | [셀프 호스팅](https://code.claude.com/docs/en/agent-sdk/hosting). 서버, 인증, 스트리밍 계층을 직접 구축. [Claude managed agents](https://platform.claude.com/docs/en/managed-agents/overview)는 별도 제품 |
| **멀티 테넌시** | [기본 내장](https://docs.langchain.com/oss/python/deepagents/going-to-production#multi-tenancy): 스레드 스코프, 사용자별 샌드박스, RBAC | 직접 구축 |
| **라이선스** | MIT | MIT (Claude Code 자체는 독점) |

---

## 🎯 주요 차이점

### 에이전트와 실행 환경

[에이전트를 샌드박스에 연결하는 패턴은 두 가지](https://www.langchain.com/blog/the-two-patterns-by-which-agents-connect-sandboxes)가 있습니다. 에이전트를 샌드박스 *내부* 에서 실행하거나, 에이전트를 외부에서 실행하고 **샌드박스를 도구로 사용** 하는 방식입니다.

Claude Agent SDK는 첫 번째 방식만 지원합니다. 에이전트가 샌드박스 내부에서 실행되며 샌드박스의 로컬 파일 시스템에 대해 도구를 실행합니다. Anthropic의 호스팅 모델인 [Claude managed agents](https://platform.claude.com/docs/en/managed-agents/overview)는 디커플링된 모델을 사용하는데, 이는 프로덕션 에이전트 아키텍처가 향하는 방향을 반영합니다.

Deep Agents는 두 방식을 모두 지원하며, [백엔드(backend)](https://docs.langchain.com/oss/python/deepagents/backends#quickstart)를 선택하여 두 방식을 연결할 수 있게 해줍니다. 실제로 다음과 같이 사용할 수 있습니다.

- 에이전트를 샌드박스 내부에서 실행 (Claude Agent SDK와 동일한 모델)
- 에이전트를 장기 실행되는 컨테이너에서 운영하고 [원격 샌드박스를 도구로 사용](https://www.langchain.com/blog/the-two-patterns-by-which-agents-connect-sandboxes)하여 명령을 네트워크 너머로 실행
- 테스트를 위해 가상 파일 시스템으로 교체하거나, 자체 인프라용 커스텀 백엔드 사용

### 멀티 테넌시(Multi-tenancy)

애플리케이션을 프로덕션 단계로 가져가면, 일반적으로 많은 최종 사용자에게 노출되며 각 사용자별 환경 격리가 반드시 필요합니다.

Claude Agent SDK에서는 SDK가 에이전트를 샌드박스에 묶어두기 때문에, 각 사용자에게 격리된 실행 환경을 제공하려면 사용자별 샌드박스를 띄우고, 어떤 샌드박스가 누구의 것인지 추적하며, 사용 후에 정리하는 API 래퍼를 직접 구축해야 합니다.

Deep Agents는 이를 직접 처리합니다. 하니스 안에서 [사용자별 또는 어시스턴트별](https://docs.langchain.com/oss/python/deepagents/going-to-production#lifecycle)로 샌드박스를 구성할 수 있고, 스레드 스코프, 실행 이력, [RBAC](https://docs.langchain.com/oss/python/deepagents/going-to-production#team-access-control-rbac)가 포함되어 있습니다. [LangSmith Sandbox](https://docs.langchain.com/langsmith/sandbox-auth-proxy)를 사용하면 인증 프록시(auth proxy)도 기본으로 제공되어, 사용자별 자격증명을 별도로 프로비저닝하지 않고도 최종 사용자가 샌드박스에서 서드 파티 API를 호출할 수 있습니다.

### 프로덕션 에이전트 서버

[셀프 호스팅된 Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/hosting) 앱을 최종 사용자에게 노출하려면 에이전트를 호출하고, 토큰을 스트리밍으로 돌려보내고, 대화 스레드를 관리하는 자체 HTTP/WebSocket 또는 SSE 서버를 작성해야 합니다. 그 서버는 직접 구축, 운영, 보안 관리를 해야 합니다.

Deep Agents 배포는 [에이전트 서버](https://docs.langchain.com/langsmith/agent-server)를 기본 제공합니다. 스트리밍 엔드포인트, 스레드 관리, 실행 이력, 웹훅, [인증](https://docs.langchain.com/langsmith/auth)이 포함되어 있습니다.

### 매니지드 클라우드 vs. 셀프 호스팅

Claude Agent SDK 배포는 [셀프 호스팅](https://code.claude.com/docs/en/agent-sdk/hosting)입니다. SDK와 [Claude managed agents](https://platform.claude.com/docs/en/managed-agents/overview)는 별개의 제품입니다. SDK에 맞춰 작성한 코드는 매니지드 오퍼링에 직접 배포되지 않습니다.

Deep Agents는 코드 변경 없이 두 가지 모드로 실행됩니다.

- **매니지드(Managed):** LangSmith의 [Managed Deep Agents](https://docs.langchain.com/langsmith/deploy-managed-deep-agent)로 deep agent를 생성, 실행, 운영합니다.
- **셀프 호스팅:** [`langgraph build`](https://docs.langchain.com/langsmith/cli#build)로 [독립 실행형 Docker 이미지](https://docs.langchain.com/langsmith/deploy-standalone-server)를 만들어 원하는 곳에 배포할 수 있습니다.

> [!TIP]
> 어떤 모델 프로바이더에서도 동작하는 매니지드 에이전트 플랫폼이 필요하다면 [LangSmith Fleet](https://docs.langchain.com/langsmith/fleet/index)을 사용하세요. [Claude managed agents](https://platform.claude.com/docs/en/managed-agents/overview)는 Anthropic 생태계에 한정됩니다.

### LLM

Claude Agent SDK 실행은 모델, 백엔드, 배포를 하나로 묶어서 세 요소 사이의 지원을 최적화합니다.

Deep Agents에서는 모델 프로바이더, 실행 백엔드, 배포 대상을 독립적으로 선택합니다. 이 하니스를 선택하면 모델과 인프라 선택에서 최대한의 유연성을 유지할 수 있습니다.

### 생태계(Ecosystems)

Claude Agent SDK는 Claude와 Anthropic 제품 표면에 맞게 특화 구축되었습니다. Deep Agents는 관측 가능성, 평가, 배포를 위한 LangSmith를 비롯한 더 넓은 LangChain 생태계와 통합되며, 모든 모델 프로바이더에서 동작합니다.

---

## 📝 요약

- **Deep Agents를 선택하세요** — 모델과 인프라의 유연성, 기본 내장된 멀티 테넌트 배포, 코드 변경 없이 매니지드/셀프 호스팅 모두 가능한 옵션이 필요하다면.
- **Claude Agent SDK를 선택하세요** — 이미 Anthropic 생태계에 투자했고, 셀프 호스팅 및 API/인증/멀티 테넌트 계층을 직접 구축하고 싶다면.

> [!NOTE]
> **잘못된 부분을 발견하셨나요?**
>
> 이 비교는 2026년 4월 16일에 작성되었습니다. 이후 제품이 변경되었다면 [이슈를 등록](https://github.com/langchain-ai/docs/issues)해 주세요.
