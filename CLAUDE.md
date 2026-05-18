# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 리포지토리 성격

이 저장소는 **LangChain Deep Agents 공식 문서의 한국어 번역본**만 담고 있는 문서 전용(documentation-only) 리포지토리입니다. 빌드 시스템, 테스트 스위트, 실행 가능한 소스 코드가 없으며, 모든 콘텐츠는 루트 디렉터리의 마크다운 파일로 관리됩니다.

파일은 `NN_deepagents_<topic>_ko.md` 형식이며, 번호(`NN`)는 **공식 문서 사이드바 메뉴 순서**(https://docs.langchain.com/oss/python/deepagents/overview 기준)를 따릅니다.

### 사이드바 메뉴 순서

| # | 파일 | 원문 경로 |
|---|------|-----------|
| 01 | `01_deepagents_overview_ko.md` | `/oss/python/deepagents/overview` |
| 02 | `02_deepagents_quickstart_ko.md` | `/oss/python/deepagents/quickstart` |
| 03 | `03_deepagents_customization_ko.md` | `/oss/python/deepagents/customization` |
| 04 | `04_deepagents_comparison_ko.md` | `/oss/python/deepagents/comparison` |
| 05 | `05_deepagents_going_to_production_ko.md` | `/oss/python/deepagents/going-to-production` |
| 06 | `06_deepagents_harness_ko.md` | `/oss/python/deepagents/harness` |
| 07 | `07_deepagents_models_ko.md` | `/oss/python/deepagents/models` |
| 08 | `08_deepagents_context_engineering_ko.md` | `/oss/python/deepagents/context-engineering` |
| 09 | `09_deepagents_backends_ko.md` | `/oss/python/deepagents/backends` |
| 10 | `10_deepagents_subagents_ko.md` | `/oss/python/deepagents/subagents` |
| 11 | `11_deepagents_async_subagents_ko.md` | `/oss/python/deepagents/async-subagents` |
| 12 | `12_deepagents_human_in_the_loop_ko.md` | `/oss/python/deepagents/human-in-the-loop` |
| 13 | `13_deepagents_permissions_ko.md` | `/oss/python/deepagents/permissions` |
| 14 | `14_deepagents_memory_ko.md` | `/oss/python/deepagents/memory` |
| 15 | `15_deepagents_skills_ko.md` | `/oss/python/deepagents/skills` |
| 16 | `16_deepagents_sandboxes_ko.md` | `/oss/python/deepagents/sandboxes` |
| 17 | `17_deepagents_interpreters_ko.md` | `/oss/python/deepagents/interpreters` |
| 18 | `18_deepagents_profiles_ko.md` | `/oss/python/deepagents/profiles` |
| 19 | `19_deepagents_event_streaming_ko.md` | `/oss/python/deepagents/event-streaming` |
| 20 | `20_deepagents_streaming_ko.md` | `/oss/python/deepagents/streaming` |
| 21 | `21_deepagents_frontend_overview_ko.md` | `/oss/python/deepagents/frontend/overview` |
| 22 | `22_deepagents_frontend_subagent_streaming_ko.md` | `/oss/python/deepagents/frontend/subagent-streaming` |
| 23 | `23_deepagents_frontend_todo_list_ko.md` | `/oss/python/deepagents/frontend/todo-list` |
| 24 | `24_deepagents_frontend_sandbox_ko.md` | `/oss/python/deepagents/frontend/sandbox` |
| 25 | `25_deepagents_acp_ko.md` | `/oss/python/deepagents/acp` |
| 26 | `26_deepagents_code_overview_ko.md` | `/oss/python/deepagents/code/overview` |
| 27 | `27_deepagents_code_memory_and_skills_ko.md` | `/oss/python/deepagents/code/memory-and-skills` |
| 28 | `28_deepagents_code_remote_sandboxes_ko.md` | `/oss/python/deepagents/code/remote-sandboxes` |
| 29 | `29_deepagents_code_subagents_ko.md` | `/oss/python/deepagents/code/subagents` |
| 30 | `30_deepagents_code_providers_ko.md` | `/oss/python/deepagents/code/providers` |
| 31 | `31_deepagents_code_configuration_ko.md` | `/oss/python/deepagents/code/configuration` |
| 32 | `32_deepagents_code_mcp_tools_ko.md` | `/oss/python/deepagents/code/mcp-tools` |
| 33 | `33_deepagents_code_data_locations_ko.md` | `/oss/python/deepagents/code/data-locations` |
| 34 | `34_deepagents_data_analysis_ko.md` | `/oss/python/deepagents/data-analysis` |
| 35 | `35_deepagents_deep_research_ko.md` | `/oss/python/deepagents/deep-research` |
| 36 | `36_deepagents_content_builder_ko.md` | `/oss/python/deepagents/content-builder` |
| 37 | `37_deepagents_mcp_ko.md` | `/oss/python/deepagents/mcp` (LangChain 사이드바) |
| 38 | `38_deepagents_a2a_ko.md` | `/oss/python/deepagents/a2a` (Agent Server 사이드바) |
| 39 | `39_deepagents_changelog_ko.md` | `/oss/python/deepagents/changelog-py` (Releases 사이드바) |

> 01~33: Deep Agents 메인 사이드바. 34~36: 별도 "Use cases" 사이드바. 37~39: deepagents URL을 갖지만 다른 섹션 사이드바에 속한 페이지.

각 파일은 상단의 `> 원문: <URL>` 라인으로 대응되는 원문 URL을 명시합니다. 새 문서를 추가하거나 기존 문서를 수정할 때 이 헤더 규약을 유지하세요.

## 작업 시 유의사항

### 번역/편집 원칙
- **원문 URL 우선 확인**: 문서 수정 요청을 받으면 파일 상단의 원문 URL을 먼저 확인하고, 필요 시 원문의 최신 내용과 대조하세요. 원문이 갱신되었을 가능성이 있으면 사용자에게 알린 뒤 진행합니다.
- **코드 예시 내 문자열은 원문 유지**: Python 코드 블록 안의 영문 시스템 프롬프트, 함수 docstring 등은 그대로 둡니다. 단, docstring이 이미 한국어로 번역된 경우는 그 형태를 유지하세요(혼용 금지 — 한 파일 내에서 일관되게).
- **표/목차 동기화**: 섹션 제목을 바꾸면 `📖 목차`(예: 03 customization 파일 상단)와 앵커 링크도 함께 갱신해야 합니다.
- **외부 링크는 원문 그대로**: `https://docs.langchain.com/...` 등 LangChain 도메인 링크는 번역하지 않고 그대로 둡니다.
- **이모지 헤더 규약**: 기존 문서는 `## 📌`, `## 🚀`, `## 🎯`, `## 🧩`, `## 📚`, `## 📝` 등 이모지를 H2 헤더 접두에 사용합니다. 새 섹션을 추가할 때 같은 스타일을 따르세요.

### 파일명 규약
- 번호 접두사(`01_`, `02_`, …)는 **공식 문서 사이드바 메뉴 순서**를 그대로 따르며, `_ko.md` 접미사로 한국어판임을 표시합니다. 위 표를 참고하세요.
- 원문 사이드바에 새 페이지가 추가/순서 변경되면 그에 맞춰 기존 파일 번호를 재정렬해야 합니다.

## 흔히 하는 작업

- **새 문서 번역 추가**: `NN_<topic>_ko.md` 패턴으로 파일을 만들고, 첫 줄에 `# 제목`, 그 다음 `> 원문: <URL>` 인용 블록, 그리고 `---` 구분선으로 시작합니다.
- **기존 문서 일부 갱신**: 해당 섹션만 편집하되, 목차/앵커 일관성을 검증하세요.
- **문서 간 상호 참조**: 같은 저장소 내 다른 번역 문서를 참조할 때는 상대 경로(예: `./03_deepagents_customization_ko.md`)로 링크합니다.
