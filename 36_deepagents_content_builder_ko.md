# 콘텐츠 빌더 에이전트 만들기 (Build a content builder agent)

> 원문: https://docs.langchain.com/oss/python/deepagents/content-builder
>
> 브랜드 메모리, 스킬, 서브에이전트, 이미지 생성 기능을 갖춘 콘텐츠 작성 에이전트를 구축합니다.

---

## 📖 목차

1. [개요 (Overview)](#-개요-overview)
2. [사전 준비 (Prerequisites)](#-사전-준비-prerequisites)
3. [셋업 (Setup)](#-셋업-setup)
4. [설정 파일 추가하기 (Add configuration files)](#-설정-파일-추가하기-add-configuration-files)
5. [스크립트 작성하기 (Build the script)](#-스크립트-작성하기-build-the-script)
6. [에이전트 실행 (Run the agent)](#-에이전트-실행-run-the-agent)
7. [출력 (Output)](#-출력-output)
8. [전체 코드 (Full code)](#-전체-코드-full-code)
9. [다음 단계 (Next steps)](#-다음-단계-next-steps)

---

## 📌 개요 (Overview)

이 가이드는 [Deep Agents](https://docs.langchain.com/oss/python/deepagents)를 사용해 콘텐츠 작성 에이전트를 처음부터 구축하는 방법을 보여줍니다.

이 가이드에서 구축할 에이전트는 다음을 수행합니다.

1. `AGENTS.md`와 스킬 폴더에서 보이스(voice)와 워크플로 규칙을 로드
2. `web_search`를 갖춘 전문 서브에이전트(researcher)에게 웹 리서치를 위임
3. 로드된 스킬을 따라 블로그 또는 소셜 콘텐츠 초안 작성
4. Gemini로 커버 이미지 또는 소셜 이미지를 생성하고 프로젝트 디렉터리 아래에 파일 저장

이 튜토리얼의 코드는 이미지 생성 도구와 파일 시스템 백엔드를 연결하여 에이전트가 프로젝트 디렉터리 아래의 포스트, 리서치 노트, 이미지를 읽고 쓸 수 있도록 합니다. 전체 실행 가능한 프로젝트는 [content-builder-agent 예제](https://github.com/langchain-ai/deepagents/tree/main/examples/content-builder-agent)를 참고하세요.

### 핵심 개념

이 튜토리얼이 다루는 내용:

- 정보 누적을 위한 [장기 메모리 (Long-term memory)](https://docs.langchain.com/oss/python/deepagents/long-term-memory)
- 워크플로 모듈화를 위한 [스킬 (Skills)](https://docs.langchain.com/oss/python/deepagents/skills)
- 작업 위임을 위한 [서브에이전트 (Subagents)](https://docs.langchain.com/oss/python/deepagents/subagents)
- 파일 읽기/쓰기를 위한 [파일 시스템 백엔드 (Filesystem backends)](https://docs.langchain.com/oss/python/deepagents/backends)
- 검색과 이미지 생성을 위한 커스텀 [도구 (tools)](https://docs.langchain.com/oss/python/langchain/tools)

---

## 🔧 사전 준비 (Prerequisites)

API 키:

- Anthropic (Claude) 또는 다른 프로바이더 API 키
- Google (Gemini) — `gemini-2.5-flash-image`로 이미지 생성에 필요
- [Tavily](https://www.tavily.com/) — 웹 검색용 (무료 티어 가능)
- [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-deepagents-content-builder) — 트레이싱용 (선택)

Python 3.11 이상.

---

## 🚀 셋업 (Setup)

### 1단계: 프로젝트 디렉터리 생성

```bash
mkdir content-builder-agent
cd content-builder-agent
```

### 2단계: 의존성 설치

```bash
# pip 사용
pip install deepagents google-genai pillow pyyaml rich tavily-python langchain
```

```bash
# uv 사용
uv init
uv add deepagents google-genai pillow pyyaml rich tavily-python langchain
uv sync
```

업스트림 예제와 호환되도록 자체 프로젝트에서는 `deepagents`를 지원되는 범위(예: `>=0.3.5,<0.4.0`)로 고정하세요.

### 3단계: API 키 설정

```bash
export ANTHROPIC_API_KEY="your_anthropic_api_key"
export GOOGLE_API_KEY="your_google_api_key"
export TAVILY_API_KEY="your_tavily_api_key"           # 선택
export LANGSMITH_API_KEY="your_langsmith_api_key"     # 선택
```

---

## 📁 설정 파일 추가하기 (Add configuration files)

예제는 메모리(memory), 스킬(skills), 서브에이전트(subagent) 정의의 세 가지 파일에 동작을 유지합니다.

### 1단계: `AGENTS.md` 추가

프로젝트 루트에 `AGENTS.md`를 생성합니다. 나중에 에이전트를 만들 때 [memory](https://docs.langchain.com/oss/python/deepagents/long-term-memory) 파라미터의 일부로 이 파일을 지정하면, 시스템 프롬프트로 로드되어 브랜드 보이스와 리서치 요구 사항이 모든 실행에 적용됩니다.

````markdown
# Content Writer Agent

You are a content writer for a technology company. Your job is to create engaging, informative content that educates readers about AI, software development, and emerging technologies.

## Brand Voice

- **Professional but approachable**: Write like a knowledgeable colleague, not a textbook
- **Clear and direct**: Avoid jargon unless necessary; explain technical concepts simply
- **Confident but not arrogant**: Share expertise without being condescending
- **Engaging**: Use concrete examples, analogies, and stories to illustrate points

## Writing Standards

1. **Use active voice**: "The agent processes requests" not "Requests are processed by the agent"
2. **Lead with value**: Start with what matters to the reader, not background
3. **One idea per paragraph**: Keep paragraphs focused and scannable
4. **Concrete over abstract**: Use specific examples, numbers, and case studies
5. **End with action**: Every piece should leave the reader knowing what to do next

## Content Pillars

Our content focuses on:
- AI agents and automation
- Developer tools and productivity
- Software architecture and best practices
- Emerging technologies and trends

## Formatting Guidelines

- Use headers (H2, H3) to break up long content
- Include code examples where relevant (with syntax highlighting)
- Add bullet points for lists of 3+ items
- Keep sentences under 25 words when possible
- Include a clear call-to-action at the end

## Research Requirements

Before writing on any topic:
1. Use the `researcher` subagent for in-depth topic research
2. Gather at least 3 credible sources
3. Identify the key points readers need to understand
4. Find concrete examples or case studies to illustrate concepts
````

자신만의 톤, 콘텐츠 기둥(pillars), 포맷 규칙에 에이전트를 맞추려면 `AGENTS.md`의 텍스트를 업데이트하세요.

### 2단계: `subagents.yaml` 추가

`subagents.yaml` 파일을 생성합니다. 그런 다음 Tavily 기반 `web_search` 도구를 가진 `researcher` 서브에이전트, Haiku 모델 ID, 그리고 메인 에이전트에서 위임할 때 지정하는 경로에 결과를 저장하라는 지시 사항을 담은 아래 텍스트를 추가합니다.

```yaml
# Subagent definitions
# These are loaded by content_writer.py and wired up with tools

researcher:
  description: >
    ALWAYS use this first to research any topic before writing content.
    Searches the web for current information, statistics, and sources.
    When delegating, tell it the topic AND the file path to save results
    (e.g., 'Research renewable energy and save to research/renewable-energy.md').
  model: anthropic:claude-haiku-4-5-20251001
  system_prompt: |
    You are a research assistant. You have access to web_search and write_file tools.

    ## Your Tools
    - web_search(query, max_results=5, topic="general") - Search the web
    - write_file(file_path, content) - Save your findings

    ## Your Process
    1. Use web_search to find information on the topic
    2. Make 2-3 targeted searches with specific queries
    3. Gather key statistics, quotes, and examples
    4. Save findings to the file path specified in your task

    ## Important
    - The user will tell you WHERE to save the file - use that exact path
    - Always include source URLs in your findings
    - Keep findings concise but informative
  tools:
    - web_search
```

나중에 deep agent를 생성할 때 이 파일이 인자로 전달됩니다.

### 3단계: 스킬 추가

`skills/` 디렉터리를 생성합니다. 각 스킬은 YAML frontmatter(`name`, `description`)와 스킬에 대한 지시 사항이 담긴 `SKILL.md` 파일을 포함하는 폴더입니다.

`skills/blog-post/SKILL.md`를 생성하고, 장문 포스트 작성, SEO 최적화, 커버 이미지 생성에 대한 정보가 포함된 아래 텍스트를 복사하세요.

````markdown
---
name: blog-post
description: Writes and structures long-form blog posts, creates tutorial outlines, and optimizes content for SEO with cover image generation. Use when the user asks to write a blog post, article, how-to guide, tutorial, technical writeup, thought leadership piece, or long-form content.
---

# Blog Post Writing Skill

## Research First (Required)

**Before writing any blog post, you MUST delegate research:**

1. Use the `task` tool with `subagent_type: "researcher"`
2. In the description, specify BOTH the topic AND where to save:

```
task(
    subagent_type="researcher",
    description="Research [TOPIC]. Save findings to research/[slug].md"
)
```

Example:
```
task(
    subagent_type="researcher",
    description="Research the current state of AI agents in 2025. Save findings to research/ai-agents-2025.md"
)
```

3. After research completes, read the findings file before writing

## Output Structure (Required)

**Every blog post MUST have both a post AND a cover image:**

```
blogs/
└── <slug>/
    ├── post.md        # The blog post content
    └── hero.png       # REQUIRED: Generated cover image
```

Example: A post about "AI Agents in 2025" → `blogs/ai-agents-2025/`

**You MUST complete both steps:**
1. Write the post to `blogs/<slug>/post.md`
2. Generate a cover image using `generate_image` and save to `blogs/<slug>/hero.png`

**A blog post is NOT complete without its cover image.**

## Blog Post Structure

Every blog post should follow this structure:

### 1. Hook (Opening)
- Start with a compelling question, statistic, or statement
- Make the reader want to continue
- Keep it to 2-3 sentences

### 2. Context (The Problem)
- Explain why this topic matters
- Describe the problem or opportunity
- Connect to the reader's experience

### 3. Main Content (The Solution)
- Break into 3-5 main sections with H2 headers
- Each section covers one key point
- Include code examples, diagrams, or screenshots where helpful
- Use bullet points for lists

### 4. Practical Application
- Show how to apply the concepts
- Include step-by-step instructions if applicable
- Provide code snippets or templates

### 5. Conclusion & CTA
- Summarize key takeaways (3 bullets max)
- End with a clear call-to-action
- Link to related resources

## Cover Image Generation

After writing the post, generate a cover image using the `generate_cover` tool:

```
generate_cover(prompt="A detailed description of the image...", slug="your-blog-slug")
```

The tool saves the image to `blogs/<slug>/hero.png`.

### Writing Effective Image Prompts

Structure your prompt with these elements:

1. **Subject**: What is the main focus? Be specific and concrete.
2. **Style**: Art direction (minimalist, isometric, flat design, 3D render, watercolor, etc.)
3. **Composition**: How elements are arranged (centered, rule of thirds, symmetrical)
4. **Color palette**: Specific colors or mood (warm earth tones, cool blues and purples, high contrast)
5. **Lighting/Atmosphere**: Soft diffused light, dramatic shadows, golden hour, neon glow
6. **Technical details**: Aspect ratio considerations, negative space for text overlay

### Example Prompts

**For a technical blog post:**
```
Isometric 3D illustration of interconnected glowing cubes representing AI agents, each cube has subtle circuit patterns. Cubes connected by luminous data streams. Deep navy background (#0a192f) with electric blue (#64ffda) and soft purple (#c792ea) accents. Clean minimal style, lots of negative space at top for title. Professional tech aesthetic.
```

**For a tutorial/how-to:**
```
Clean flat illustration of hands typing on a keyboard with abstract code symbols floating upward, transforming into lightbulbs and gears. Warm gradient background from soft coral to light peach. Friendly, approachable style. Centered composition with space for text overlay.
```

**For thought leadership:**
```
Abstract visualization of a human silhouette profile merging with geometric neural network patterns. Split composition - organic watercolor texture on left transitioning to clean vector lines on right. Muted sage green and warm terracotta color scheme. Contemplative, forward-thinking mood.
```

## SEO Considerations

- Include the main keyword in the title and first paragraph
- Use the keyword naturally 3-5 times throughout
- Keep the title under 60 characters
- Write a meta description (150-160 characters)

## Quality Checklist

Before finishing:
- [ ] Post saved to `blogs/<slug>/post.md`
- [ ] Hero image generated at `blogs/<slug>/hero.png`
- [ ] Hook grabs attention in first 2 sentences
- [ ] Each section has a clear purpose
- [ ] Conclusion summarizes key points
- [ ] CTA tells reader what to do next
````

다음으로, `skills/social-media/SKILL.md`를 생성하고, 소셜 미디어 포스트 초안 작성 및 동반 이미지 생성에 대한 정보가 포함된 아래 텍스트를 복사하세요.

````markdown
---
name: social-media
description: Drafts engaging social media posts, writes hooks, suggests hashtags, creates thread structures, and generates companion images. Use when the user asks to write a LinkedIn post, tweet, Twitter/X thread, social media caption, social post, or repurpose content for social platforms.
---

# Social Media Content Skill

## Research First (Required)

**Before writing any social media content, you MUST delegate research:**

1. Use the `task` tool with `subagent_type: "researcher"`
2. In the description, specify BOTH the topic AND where to save:

```
task(
    subagent_type="researcher",
    description="Research [TOPIC]. Save findings to research/[slug].md"
)
```

Example:
```
task(
    subagent_type="researcher",
    description="Research renewable energy trends in 2025. Save findings to research/renewable-energy.md"
)
```

3. After research completes, read the findings file before writing

## Output Structure (Required)

**Every social media post MUST have both content AND an image:**

**LinkedIn posts:**
```
linkedin/
└── <slug>/
    ├── post.md        # The post content
    └── image.png      # REQUIRED: Generated visual
```

**Twitter/X threads:**
```
tweets/
└── <slug>/
    ├── thread.md      # The thread content
    └── image.png      # REQUIRED: Generated visual
```

Example: A LinkedIn post about "prompt engineering" → `linkedin/prompt-engineering/`

**You MUST complete both steps:**
1. Write the content to the appropriate path
2. Generate an image using `generate_image` and save alongside the post

**A social media post is NOT complete without its image.**

## Platform Guidelines

### LinkedIn

**Format:**
- 1,300 character limit (show more after ~210 chars)
- First line is crucial - make it hook
- Use line breaks for readability
- 3-5 hashtags at the end

**Tone:**
- Professional but personal
- Share insights and learnings
- Ask questions to drive engagement
- Use "I" and share experiences

**Structure:**
```
[Hook - 1 compelling line]

[Empty line]

[Context - why this matters]

[Empty line]

[Main insight - 2-3 short paragraphs]

[Empty line]

[Call to action or question]

#hashtag1 #hashtag2 #hashtag3
```

### Twitter/X

**Format:**
- 280 character limit per tweet
- Threads for longer content (use 1/🧵 format)
- No more than 2 hashtags per tweet

**Thread Structure:**
```
1/🧵 [Hook - the main insight]

2/ [Supporting point 1]

3/ [Supporting point 2]

4/ [Example or evidence]

5/ [Conclusion + CTA]
```

## Image Generation

Every social media post needs an eye-catching image. Use the `generate_social_image` tool:

```
generate_social_image(prompt="A detailed description...", platform="linkedin", slug="your-post-slug")
```

The tool saves the image to `<platform>/<slug>/image.png`.

### Social Image Best Practices

Social images need to work at small sizes in crowded feeds:
- **Bold, simple compositions** - one clear focal point
- **High contrast** - stands out when scrolling
- **No text in image** - too small to read, platforms add their own
- **Square or 4:5 ratio** - works across platforms

### Writing Effective Prompts

Include these elements:

1. **Single focal point**: One clear subject, not a busy scene
2. **Bold style**: Vibrant colors, strong shapes, high contrast
3. **Simple background**: Solid color, gradient, or subtle texture
4. **Mood/energy**: Match the post tone (inspiring, urgent, thoughtful)

### Example Prompts

**For an insight/tip post:**
```
Single glowing lightbulb floating against a deep purple gradient background, lightbulb made of interconnected golden geometric lines, rays of soft light emanating outward. Minimal, striking, high contrast. Square composition.
```

**For announcements/news:**
```
Abstract rocket ship made of colorful geometric shapes launching upward with a trail of particles. Bright coral and teal color scheme against clean white background. Energetic, celebratory mood. Bold flat illustration style.
```

**For thought-provoking content:**
```
Two overlapping translucent circles, one blue one orange, creating a glowing intersection in the center. Represents collaboration or intersection of ideas. Dark charcoal background, soft ethereal glow. Minimalist and contemplative.
```

## Content Types

### Announcement Posts
- Lead with the news
- Explain the impact
- Include link or next step

### Insight Posts
- Share one specific learning
- Explain the context briefly
- Make it actionable

### Question Posts
- Ask a genuine question
- Provide your take first
- Keep it focused on one topic

## Quality Checklist

Before finishing:
- [ ] Post saved to `linkedin/<slug>/post.md` or `tweets/<slug>/thread.md`
- [ ] Image generated alongside the post
- [ ] First line hooks attention
- [ ] Content fits platform limits
- [ ] Tone matches platform norms
- [ ] Has clear CTA or question
- [ ] Hashtags are relevant (not generic)
````

이 스킬들은 에이전트에게 먼저 `researcher` 서브에이전트를 호출하고, `blogs/`, `linkedin/`, `tweets/` 아래에 마크다운을 쓰고, 이미지를 위해 `generate_cover` 또는 `generate_social_image`를 호출하라고 지시합니다.

나중에 에이전트를 만들고 스킬 폴더(들)를 지정하면, 해당 스킬 폴더의 `SKILLS.md` 파일 frontmatter가 시스템 프롬프트로 로드되어, 작업이 스킬 설명과 일치할 때 에이전트가 그 스킬을 사용할 수 있습니다.

---

## 🛠️ 스크립트 작성하기 (Build the script)

프로젝트 루트에 `content_writer.py`를 생성합니다. 아래 섹션들은 모두 하나의 파일에 순서대로 들어갑니다.

### 1단계: 도구 추가

리서처 서브에이전트는 Tavily 검색을 사용합니다. 블로그와 소셜 워크플로는 Gemini 이미지 생성을 사용합니다. 나중에 에이전트를 만들 때, `load_subagents` 함수가 `subagents.yaml`을 읽고 도구 이름을 이 데코레이션된 함수들로 해석합니다.

```python
import os
from pathlib import Path
from typing import Literal

import yaml
from langchain.tools import tool

EXAMPLE_DIR = Path(__file__).parent


@tool
def web_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news"] = "general",
) -> dict:
    """Search the web for current information.

    Args:
        query: The search query (be specific and detailed)
        max_results: Number of results to return (default: 5)
        topic: "general" for most queries, "news" for current events

    Returns:
        Search results with titles, URLs, and content excerpts.
    """
    try:
        from tavily import TavilyClient

        api_key = os.environ.get("TAVILY_API_KEY")
        if not api_key:
            return {"error": "TAVILY_API_KEY not set"}

        client = TavilyClient(api_key=api_key)
        return client.search(query, max_results=max_results, topic=topic)
    except Exception as e:
        return {"error": f"Search failed: {e}"}


@tool
def generate_cover(prompt: str, slug: str) -> str:
    """Generate a cover image for a blog post.

    Args:
        prompt: Detailed description of the image to generate.
        slug: Blog post slug. Image saves to blogs/<slug>/hero.png
    """
    try:
        from google import genai

        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
        )

        for part in response.parts:
            if part.inline_data is not None:
                image = part.as_image()
                output_path = EXAMPLE_DIR / "blogs" / slug / "hero.png"
                output_path.parent.mkdir(parents=True, exist_ok=True)
                image.save(str(output_path))
                return f"Image saved to {output_path}"

        return "No image generated"
    except Exception as e:
        return f"Error: {e}"


@tool
def generate_social_image(prompt: str, platform: str, slug: str) -> str:
    """Generate an image for a social media post.

    Args:
        prompt: Detailed description of the image to generate.
        platform: Either "linkedin" or "tweets"
        slug: Post slug. Image saves to <platform>/<slug>/image.png
    """
    try:
        from google import genai

        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
        )

        for part in response.parts:
            if part.inline_data is not None:
                image = part.as_image()
                output_path = EXAMPLE_DIR / platform / slug / "image.png"
                output_path.parent.mkdir(parents=True, exist_ok=True)
                image.save(str(output_path))
                return f"Image saved to {output_path}"

        return "No image generated"
    except Exception as e:
        return f"Error: {e}"


def load_subagents(config_path: Path) -> list:
    """Load subagent definitions from YAML and wire up tools.

    Unlike `memory` and `skills`, deep agents do not load subagents from files by default.
    This helper externalizes configuration so you can edit YAML without changing Python code.
    """
    available_tools = {
        "web_search": web_search,
    }

    with open(config_path) as f:
        config = yaml.safe_load(f)

    subagents = []
    for name, spec in config.items():
        subagent = {
            "name": name,
            "description": spec["description"],
            "system_prompt": spec["system_prompt"],
        }
        if "model" in spec:
            subagent["model"] = spec["model"]
        if "tools" in spec:
            subagent["tools"] = [available_tools[t] for t in spec["tools"]]
        subagents.append(subagent)

    return subagents
```

### 2단계: 에이전트 생성

[`create_deep_agent`](https://reference.langchain.com/python/deepagents/graph/create_deep_agent)으로 deep agent를 만들 때, 메모리 경로, 스킬 디렉터리, 이미지 도구, YAML에서 로드한 서브에이전트, 그리고 예제 디렉터리를 루트로 하는 [FilesystemBackend](https://docs.langchain.com/oss/python/deepagents/backends)를 전달하여 `./AGENTS.md`와 `./skills/` 같은 경로가 올바르게 해석되도록 합니다.

**Google**:

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend


def create_content_writer():
    """Create a content writer agent configured by filesystem files."""
    return create_deep_agent(
        model="google_genai:gemini-3.1-pro-preview",
        memory=["./AGENTS.md"],
        skills=["./skills/"],
        tools=[generate_cover, generate_social_image],
        subagents=load_subagents(EXAMPLE_DIR / "subagents.yaml"),
        backend=FilesystemBackend(root_dir=EXAMPLE_DIR),
    )
```

**OpenAI**:

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend


def create_content_writer():
    """Create a content writer agent configured by filesystem files."""
    return create_deep_agent(
        model="openai:gpt-5.4",
        memory=["./AGENTS.md"],
        skills=["./skills/"],
        tools=[generate_cover, generate_social_image],
        subagents=load_subagents(EXAMPLE_DIR / "subagents.yaml"),
        backend=FilesystemBackend(root_dir=EXAMPLE_DIR),
    )
```

**Anthropic**:

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend


def create_content_writer():
    """Create a content writer agent configured by filesystem files."""
    return create_deep_agent(
        model="anthropic:claude-sonnet-4-6",
        memory=["./AGENTS.md"],
        skills=["./skills/"],
        tools=[generate_cover, generate_social_image],
        subagents=load_subagents(EXAMPLE_DIR / "subagents.yaml"),
        backend=FilesystemBackend(root_dir=EXAMPLE_DIR),
    )
```

**OpenRouter**:

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend


def create_content_writer():
    """Create a content writer agent configured by filesystem files."""
    return create_deep_agent(
        model="openrouter:anthropic/claude-sonnet-4-6",
        memory=["./AGENTS.md"],
        skills=["./skills/"],
        tools=[generate_cover, generate_social_image],
        subagents=load_subagents(EXAMPLE_DIR / "subagents.yaml"),
        backend=FilesystemBackend(root_dir=EXAMPLE_DIR),
    )
```

**Fireworks**:

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend


def create_content_writer():
    """Create a content writer agent configured by filesystem files."""
    return create_deep_agent(
        model="fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
        memory=["./AGENTS.md"],
        skills=["./skills/"],
        tools=[generate_cover, generate_social_image],
        subagents=load_subagents(EXAMPLE_DIR / "subagents.yaml"),
        backend=FilesystemBackend(root_dir=EXAMPLE_DIR),
    )
```

**Baseten**:

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend


def create_content_writer():
    """Create a content writer agent configured by filesystem files."""
    return create_deep_agent(
        model="baseten:zai-org/GLM-5",
        memory=["./AGENTS.md"],
        skills=["./skills/"],
        tools=[generate_cover, generate_social_image],
        subagents=load_subagents(EXAMPLE_DIR / "subagents.yaml"),
        backend=FilesystemBackend(root_dir=EXAMPLE_DIR),
    )
```

**Ollama**:

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend


def create_content_writer():
    """Create a content writer agent configured by filesystem files."""
    return create_deep_agent(
        model="ollama:devstral-2",
        memory=["./AGENTS.md"],
        skills=["./skills/"],
        tools=[generate_cover, generate_social_image],
        subagents=load_subagents(EXAMPLE_DIR / "subagents.yaml"),
        backend=FilesystemBackend(root_dir=EXAMPLE_DIR),
    )
```

### 3단계: 엔트리 포인트 추가

에이전트가 동작하는지 확인하기 위해 사용자 메시지로 에이전트를 호출합니다.

```python
import sys

from langchain.messages import HumanMessage

if __name__ == "__main__":
    task = (
        " ".join(sys.argv[1:])
        if len(sys.argv) > 1
        else "Write a blog post about how AI agents are transforming software development"
    )

    agent = create_content_writer()
    result = agent.invoke(
        {"messages": [HumanMessage(content=task)]},
        config={"configurable": {"thread_id": "content-builder-demo"}},
    )

    for msg in result.get("messages", []):
        if hasattr(msg, "content") and msg.content:
            print(msg.content)
```

---

## 🚢 에이전트 실행 (Run the agent)

> ⚠️ 파일 시스템 백엔드는 `root_dir` 아래의 파일을 읽고, 쓰고, 삭제할 수 있습니다. 전용 디렉터리에서만 실행하고, 게시 전에 생성된 콘텐츠를 검토하세요.

프로젝트 디렉터리에서 인자 없이 에이전트를 호출하거나 프롬프트를 인자로 전달하여 호출할 수 있습니다.

```bash
# 기본
python content_writer.py
```

```bash
# 프롬프트 지정
python content_writer.py Write a blog post about prompt engineering
```

`LANGSMITH_API_KEY`를 설정했다면, [LangSmith](https://docs.langchain.com/langsmith/home)에서 실행을 검사할 수 있습니다.

---

## 📚 출력 (Output)

성공 시, 생성된 결과물은 시스템 임시 디렉터리(macOS와 Linux에서는 일반적으로 `/tmp/` 아래) 아래에 작성되며, 프로젝트 파일 옆에 작성되는 것은 아닙니다.

```text
blogs/
└── prompt-engineering/
    ├── post.md
    └── hero.png
research/
└── prompt-engineering.md
```

경로는 `SKILL.md`의 스킬 지시 사항을 따릅니다.

---

## 📝 전체 코드 (Full code)

Rich 기반 스트리밍 UI를 포함한 전체 [content-builder-agent 예제](https://github.com/langchain-ai/deepagents/tree/main/examples/content-builder-agent)를 GitHub에서 살펴볼 수 있습니다.

---

## 🎯 다음 단계 (Next steps)

- 브랜드 보이스와 리서치 요구 사항을 변경하려면 `AGENTS.md`를 편집
- 새로운 콘텐츠 타입을 위해 `skills/<name>/SKILL.md` 아래에 스킬 추가
- `subagents.yaml`에 서브에이전트를 추가하고 `load_subagents`에 도구를 등록
- 더 깊이 있는 설정은 [Subagents](https://docs.langchain.com/oss/python/deepagents/subagents), [Skills](https://docs.langchain.com/oss/python/deepagents/skills), [Customization](https://docs.langchain.com/oss/python/deepagents/customization)을 참고

---

> 📝 이 문서를 Claude, VSCode 등에 MCP를 통해 실시간 답변용으로 [연결](https://docs.langchain.com/use-these-docs)할 수 있습니다. [GitHub에서 페이지 편집](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/content-builder.mdx) 또는 [이슈 등록](https://github.com/langchain-ai/docs/issues/new/choose)도 가능합니다.
