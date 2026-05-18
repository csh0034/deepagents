# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 리포지토리 성격

이 저장소는 **LangChain Deep Agents 공식 문서의 한국어 번역본**만 담고 있는 문서 전용(documentation-only) 리포지토리입니다. 빌드 시스템, 테스트 스위트, 실행 가능한 소스 코드가 없으며, 모든 콘텐츠는 루트 디렉터리의 마크다운 파일로 관리됩니다.

- `01_deepagents_overview_ko.md` — [Deep Agents Overview](https://docs.langchain.com/oss/python/deepagents/overview)의 한국어 번역
- `02_deepagents_customization_ko.md` — [Deep Agents Customization](https://docs.langchain.com/oss/python/deepagents/customization)의 한국어 번역

각 파일은 상단의 `> 원문: <URL>` 라인으로 대응되는 원문 URL을 명시합니다. 새 문서를 추가하거나 기존 문서를 수정할 때 이 헤더 규약을 유지하세요.

## 작업 시 유의사항

### 번역/편집 원칙
- **원문 URL 우선 확인**: 문서 수정 요청을 받으면 파일 상단의 원문 URL을 먼저 확인하고, 필요 시 원문의 최신 내용과 대조하세요. 원문이 갱신되었을 가능성이 있으면 사용자에게 알린 뒤 진행합니다.
- **코드 예시 내 문자열은 원문 유지**: Python 코드 블록 안의 영문 시스템 프롬프트, 함수 docstring 등은 그대로 둡니다. 단, docstring이 이미 한국어로 번역된 경우는 그 형태를 유지하세요(혼용 금지 — 한 파일 내에서 일관되게).
- **표/목차 동기화**: 섹션 제목을 바꾸면 `📖 목차`(02 파일 상단)와 앵커 링크도 함께 갱신해야 합니다.
- **외부 링크는 원문 그대로**: `https://docs.langchain.com/...` 등 LangChain 도메인 링크는 번역하지 않고 그대로 둡니다.
- **이모지 헤더 규약**: 기존 문서는 `## 📌`, `## 🚀`, `## 🎯`, `## 🧩`, `## 📚`, `## 📝` 등 이모지를 H2 헤더 접두에 사용합니다. 새 섹션을 추가할 때 같은 스타일을 따르세요.

### 파일명 규약
- 번호 접두사(`01_`, `02_`, …)로 문서 순서를 표현하고, `_ko.md` 접미사로 한국어판임을 표시합니다. 새 번역 문서를 추가할 때 동일한 패턴을 유지하세요.

## 흔히 하는 작업

- **새 문서 번역 추가**: `NN_<topic>_ko.md` 패턴으로 파일을 만들고, 첫 줄에 `# 제목`, 그 다음 `> 원문: <URL>` 인용 블록, 그리고 `---` 구분선으로 시작합니다.
- **기존 문서 일부 갱신**: 해당 섹션만 편집하되, 목차/앵커 일관성을 검증하세요.
- **문서 간 상호 참조**: 같은 저장소 내 다른 번역 문서를 참조할 때는 상대 경로(`./02_deepagents_customization_ko.md`)로 링크합니다.
