# 데이터 분석 에이전트 만들기 (Build a data analysis agent)

> 원문: https://docs.langchain.com/oss/python/deepagents/data-analysis
>
> 데이터 파일을 분석하고, 시각화를 생성하며, 결과를 공유하는 에이전트를 구축합니다.

---

## 📖 목차

1. [개요 (Overview)](#-개요-overview)
2. [셋업 (Setup)](#-셋업-setup)
3. [백엔드 설정 (Set up the backend)](#-백엔드-설정-set-up-the-backend)
4. [커스텀 도구 구현 (Implement custom tools)](#-커스텀-도구-구현-implement-custom-tools)
5. [에이전트 실행 (Run the agent)](#-에이전트-실행-run-the-agent)
6. [결과 (Results)](#-결과-results)
7. [다음 단계 (Next steps)](#-다음-단계-next-steps)

---

## 📌 개요 (Overview)

이 가이드는 [deep agent](https://docs.langchain.com/oss/python/deepagents)를 사용해 데이터 분석 에이전트를 구축하는 방법을 보여줍니다. 데이터 분석 작업은 일반적으로 계획 수립, 코드 실행, 그리고 스크립트, 리포트, 플롯 같은 결과물(artifacts) 처리 능력을 필요로 하며, 이는 deep agent가 처리하도록 설계된 기능입니다.

이번에 구축할 에이전트는 다음을 수행합니다.

1. 분석할 CSV 파일을 받음
2. 탐색적 데이터 분석(EDA)을 수행하고 시각화를 생성
3. Slack 채널로 결과 공유

> 💡 Slack 통합은 선택 사항입니다. 결과물을 로컬에 저장하거나 다른 채널로 공유하도록 에이전트를 수정할 수 있습니다.

### 핵심 개념

이 튜토리얼이 다루는 내용:

- 샌드박스화된 코드 실행을 위한 [백엔드 (Backends)](https://docs.langchain.com/oss/python/deepagents/backends)
- 외부 통합을 위한 커스텀 [도구 (tools)](https://docs.langchain.com/oss/python/langchain/tools)

---

## 🚀 셋업 (Setup)

### 설치 (Installation)

핵심 의존성을 설치합니다.

```bash
pip install deepagents
```

### 선택 의존성 (Optional dependencies)

이 튜토리얼에서 사용할 것:

- 결과 공유를 위한 [Slack Python SDK](https://docs.slack.dev/tools/python-slack-sdk/) ([토큰 셋업](https://docs.slack.dev/authentication/tokens/))
- 코드 실행을 위한 [샌드박스](https://docs.langchain.com/oss/python/deepagents/sandboxes) 환경. 셋업 세부 사항은 [available providers](https://docs.langchain.com/oss/python/deepagents/sandboxes#available-providers) 참고

```bash
pip install slack-sdk
```

> ℹ️ 이러한 서비스는 선택 사항이지만, 프로덕션 사용에는 샌드박스 환경이 강력히 권장됩니다. 대안으로 local shell 백엔드(중요한 [보안 고려 사항](https://docs.langchain.com/oss/python/deepagents/backends#localshellbackend-local-shell) 포함)를 사용하거나 백엔드에서 결과물을 직접 다운로드할 수도 있습니다.

### LangSmith

LangChain으로 구축하는 많은 애플리케이션은 LLM 호출을 여러 번 포함한 여러 단계를 가집니다. 애플리케이션이 복잡해질수록 체인이나 에이전트 내부에서 무슨 일이 일어나고 있는지 정확히 들여다볼 수 있어야 합니다. 가장 좋은 방법은 [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-deepagents-data-analysis)입니다.

위 링크에서 가입한 후, 트레이스 로깅을 시작하려면 환경 변수를 설정하세요.

```shell
export LANGSMITH_TRACING="true"
export LANGSMITH_API_KEY="..."
```

또는 Python에서 직접 설정:

```python
import getpass
import os

os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = getpass.getpass()
```

---

## 🛠️ 백엔드 설정 (Set up the backend)

Deep Agents는 샌드박스화된 환경에서 코드를 실행하기 위해 [backends](https://docs.langchain.com/oss/python/deepagents/backends)를 사용합니다.

셋업 세부 사항은 [available providers](https://docs.langchain.com/oss/python/deepagents/sandboxes#available-providers)를 참고하세요.

**Daytona**:

```bash
pip install langchain-daytona
# 또는
uv add langchain-daytona
```

```python
from daytona import Daytona

from langchain_daytona import DaytonaSandbox

sandbox = Daytona().create()
backend = DaytonaSandbox(sandbox=sandbox)
```

샌드박스 준비 상태 확인:

```python
result = backend.execute("echo ready")
print(result)
# ExecuteResponse(output='ready', exit_code=0, ...)
```

**Modal**:

```python
import modal

from langchain_modal import ModalSandbox

app = modal.App.lookup("your-app")
modal_sandbox = modal.Sandbox.create(app=app)
backend = ModalSandbox(sandbox=modal_sandbox)
```

**Runloop**:

```bash
pip install langchain-runloop
# 또는
uv add langchain-runloop
```

```python
from runloop_api_client import RunloopSDK

from langchain_runloop import RunloopSandbox

api_key = "..."
client = RunloopSDK(bearer_token=api_key)

devbox = client.devbox.create()
backend = RunloopSandbox(devbox=devbox)
```

**AgentCore**:

```bash
pip install langchain-agentcore-codeinterpreter
# 또는
uv add langchain-agentcore-codeinterpreter
```

```python
from bedrock_agentcore.tools.code_interpreter_client import CodeInterpreter
from langchain_agentcore_codeinterpreter import AgentCoreSandbox

interpreter = CodeInterpreter(region="us-west-2")
interpreter.start()
backend = AgentCoreSandbox(interpreter=interpreter)
```

**Local shell**:

> ⚠️ 이 백엔드는 제한 없는 파일 시스템과 셸 접근을 제공합니다. 개발 및 테스트용 통제된 환경에서만 사용하세요. 자세한 내용은 [보안 고려 사항](https://docs.langchain.com/oss/python/deepagents/backends#localshellbackend-local-shell)을 참고하세요.

```python
from deepagents.backends import LocalShellBackend

backend = LocalShellBackend(root_dir=".", env={"PATH": "/usr/bin:/bin"})
```

### 샘플 데이터 업로드 (Upload sample data)

샘플 매출 데이터를 만들고 백엔드에 업로드합니다.

```python
import csv
import io

# 샘플 매출 데이터 생성
data = [
    ["Date", "Product", "Units Sold", "Revenue"],
    ["2025-08-01", "Widget A", 10, 250],
    ["2025-08-02", "Widget B", 5, 125],
    ["2025-08-03", "Widget A", 7, 175],
    ["2025-08-04", "Widget C", 3, 90],
    ["2025-08-05", "Widget B", 8, 200],
]

# CSV 바이트로 변환
text_buf = io.StringIO()
writer = csv.writer(text_buf)
writer.writerows(data)
csv_bytes = text_buf.getvalue().encode("utf-8")
text_buf.close()

# 백엔드에 업로드
backend.upload_files([("/home/daytona/data/sales_data.csv", csv_bytes)])
```

---

## 🔧 커스텀 도구 구현 (Implement custom tools)

데이터 분석 작업은 리포트나 플롯 같은 결과물(artifacts)을 생성할 수 있습니다. 다음 간단한 [도구](https://docs.langchain.com/oss/python/langchain/tools)는 `backend.download_files`로 결과물을 다운로드한 다음 Slack SDK를 사용하여 업로드합니다. 또는 결과물을 업로드하는 대신 에이전트에게 관련 파일 경로를 나열하도록 요청하여 관심 있는 측이 별도로 가져갈 수 있도록 할 수도 있습니다.

```python
from langchain.tools import tool
from slack_sdk import WebClient


slack_token = os.environ["SLACK_USER_TOKEN"]
slack_client = WebClient(token=slack_token)


@tool(parse_docstring=True)
def slack_send_message(text: str, file_path: str | None = None) -> str:
    """Send message, optionally including attachments such as images.

    Args:
        text: (str) text content of the message
        file_path: (str) file path of attachment in the filesystem.
    """
    if not file_path:
        slack_client.chat_postMessage(channel=channel, text=text)
    else:
        fp = backend.download_files([file_path])
        slack_client.files_upload_v2(
            channel="C0123456ABC",  # 자신의 채널을 지정하세요
            content=fp[0].content,
            initial_comment=text,
        )

    return "Message sent."
```

> ℹ️ 자격 증명과 기타 시크릿을 샌드박스에 추가하지 않는 것이 일반적으로 좋은 관행입니다. 여기서는 Slack 토큰을 샌드박스 외부의 도구에서 관리합니다.

---

## 🚢 에이전트 실행 (Run the agent)

에이전트를 인스턴스화합니다.

```python
from langchain_core.utils.uuid import uuid7

from langgraph.checkpoint.memory import InMemorySaver
from deepagents import create_deep_agent


checkpointer = InMemorySaver()

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    tools=[slack_send_message],
    backend=backend,
    checkpointer=checkpointer,
)

thread_id = str(uuid7())
config={"configurable": {"thread_id": thread_id}}
```

다음을 포함합니다.

- [모델](https://docs.langchain.com/oss/python/deepagents/customization#model) 선택
- 커스텀 [도구](https://docs.langchain.com/oss/python/deepagents/customization#tools)
- [백엔드](https://docs.langchain.com/oss/python/deepagents/backends)
- 멀티턴 대화를 지원하기 위한 [checkpointer](https://docs.langchain.com/oss/python/langchain/short-term-memory)

이제 에이전트를 호출합니다.

```python
input_message = {
    "role": "user",
    "content": (
        "Analyze ./data/sales_data.csv in the current dir and generate a beautiful plot. "
        "When finished, send your analysis and the plot to Slack using the tool."
    ),
}
for step in agent.stream(
    {"messages": [input_message]},
    config,
    stream_mode="updates",
):
    for _, update in step.items():
        if update and (messages := update.get("messages")) and isinstance(messages, list):
            for message in messages:
                message.pretty_print()
```

<details>
<summary>실행 결과 (예시)</summary>

```
================================== Ai Message ==================================

[{'text': "I'll help you analyze the sales data and create a beautiful plot, then send the results to Slack. Let me start by exploring the data.", 'type': 'text'}, {'id': 'toolu_01LRot5h6WkhdpDQ1SG6EQGQ', 'input': {'file_path': './data/sales_data.csv'}, 'name': 'read_file', 'type': 'tool_use'}]
Tool Calls:
  read_file (toolu_01LRot5h6WkhdpDQ1SG6EQGQ)
 Call ID: toolu_01LRot5h6WkhdpDQ1SG6EQGQ
  Args:
    file_path: ./data/sales_data.csv
================================= Tool Message =================================
Name: read_file

Error: File '/data/sales_data.csv' not found
================================== Ai Message ==================================

[{'text': 'Let me check the current directory structure first:', 'type': 'text'}, ...]
Tool Calls:
  execute (toolu_018DSeF8Dx714Dh2M5vJ1JuK)
  Args:
    command: pwd
  ls (toolu_01As782aRsVB3mJpKPKNwg9c)
  Args:
    path: /
================================= Tool Message =================================
Name: execute

/home/daytona
[Command succeeded with exit code 0]
================================= Tool Message =================================
Name: ls

['/home/daytona/data/sales_data.csv']
================================== Ai Message ==================================

[{'text': 'Perfect! Now let me read the sales data:', ...}]
================================= Tool Message =================================
Name: read_file

     1	Date,Product,Units Sold,Revenue
     2	2025-08-01,Widget A,10,250
     3	2025-08-02,Widget B,5,125
     4	2025-08-03,Widget A,7,175
     5	2025-08-04,Widget C,3,90
     6	2025-08-05,Widget B,8,200
================================== Ai Message ==================================

(분석 스크립트 작성 — pandas, matplotlib, seaborn 사용)

write_file → /home/daytona/analyze_sales.py
execute → python analyze_sales.py

============================================================
SALES DATA ANALYSIS REPORT
============================================================

1. DATA OVERVIEW
------------------------------------------------------------
Date Range: 2025-08-01 to 2025-08-05
Total Records: 5
Products: Widget A, Widget B, Widget C

2. SUMMARY STATISTICS
------------------------------------------------------------
Total Revenue: $840.00
Total Units Sold: 33
Average Daily Revenue: $168.00
Average Units per Sale: 6.60

3. PRODUCT PERFORMANCE
------------------------------------------------------------
         Revenue        Units Sold
             sum   mean        sum mean
Product
Widget A     425  212.5         17  8.5
Widget B     325  162.5         13  6.5
Widget C      90   90.0          3  3.0

4. BEST PERFORMING DAY
------------------------------------------------------------
Date: 2025-08-01
Product: Widget A
Revenue: $250.00
Units Sold: 10

Plot saved as: sales_analysis_plot.png

================================== Ai Message ==================================

(slack_send_message 호출 — 분석 요약과 플롯 첨부)

================================= Tool Message =================================
Name: slack_send_message

Message sent.

================================== Ai Message ==================================

Excellent! I've successfully completed the analysis and sent everything to Slack.
```

</details>

전체 분석 스크립트는 다음과 같이 작성될 수 있습니다(에이전트가 생성한 코드 예시).

```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# Set style for beautiful plots
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (14, 10)
plt.rcParams['font.size'] = 11

# Read the data
df = pd.read_csv('/home/daytona/data/sales_data.csv')
df['Date'] = pd.to_datetime(df['Date'])

# Analysis
print("=" * 60)
print("SALES DATA ANALYSIS REPORT")
print("=" * 60)
print("\n1. DATA OVERVIEW")
print("-" * 60)
print(f"Date Range: {df['Date'].min().strftime('%Y-%m-%d')} to {df['Date'].max().strftime('%Y-%m-%d')}")
print(f"Total Records: {len(df)}")
print(f"Products: {', '.join(df['Product'].unique())}")

print("\n2. SUMMARY STATISTICS")
print("-" * 60)
print(f"Total Revenue: ${df['Revenue'].sum():,.2f}")
print(f"Total Units Sold: {df['Units Sold'].sum()}")
print(f"Average Daily Revenue: ${df['Revenue'].mean():.2f}")
print(f"Average Units per Sale: {df['Units Sold'].mean():.2f}")

print("\n3. PRODUCT PERFORMANCE")
print("-" * 60)
product_stats = df.groupby('Product').agg({
    'Revenue': ['sum', 'mean'],
    'Units Sold': ['sum', 'mean']
}).round(2)
print(product_stats)

print("\n4. BEST PERFORMING DAY")
print("-" * 60)
best_day = df.loc[df['Revenue'].idxmax()]
print(f"Date: {best_day['Date'].strftime('%Y-%m-%d')}")
print(f"Product: {best_day['Product']}")
print(f"Revenue: ${best_day['Revenue']:.2f}")
print(f"Units Sold: {best_day['Units Sold']}")

# Create visualizations
fig = plt.figure(figsize=(16, 12))
fig.suptitle('Sales Data Analysis Dashboard', fontsize=20, fontweight='bold', y=0.995)

# 1. Revenue by Date
ax1 = plt.subplot(2, 3, 1)
colors = sns.color_palette("husl", len(df))
bars = ax1.bar(df['Date'].dt.strftime('%m-%d'), df['Revenue'], color=colors, edgecolor='black', linewidth=1.5)
ax1.set_title('Daily Revenue', fontsize=14, fontweight='bold', pad=10)
ax1.set_xlabel('Date', fontsize=12, fontweight='bold')
ax1.set_ylabel('Revenue ($)', fontsize=12, fontweight='bold')
ax1.grid(axis='y', alpha=0.3)

# 2. Units Sold by Date
ax2 = plt.subplot(2, 3, 2)
bars = ax2.bar(df['Date'].dt.strftime('%m-%d'), df['Units Sold'], color=colors, edgecolor='black', linewidth=1.5)
ax2.set_title('Daily Units Sold', fontsize=14, fontweight='bold', pad=10)

# 3. Revenue by Product (Pie Chart)
ax3 = plt.subplot(2, 3, 3)
product_revenue = df.groupby('Product')['Revenue'].sum()
ax3.pie(product_revenue, labels=product_revenue.index, autopct='%1.1f%%', startangle=90)
ax3.set_title('Revenue Distribution by Product', fontsize=14, fontweight='bold', pad=10)

# 4. Total Revenue by Product (Bar Chart)
ax4 = plt.subplot(2, 3, 4)
product_revenue_sorted = product_revenue.sort_values(ascending=False)
ax4.barh(product_revenue_sorted.index, product_revenue_sorted.values)
ax4.set_title('Total Revenue by Product', fontsize=14, fontweight='bold', pad=10)

# 5. Total Units Sold by Product
ax5 = plt.subplot(2, 3, 5)
product_units = df.groupby('Product')['Units Sold'].sum().sort_values(ascending=False)
ax5.barh(product_units.index, product_units.values)
ax5.set_title('Total Units Sold by Product', fontsize=14, fontweight='bold', pad=10)

# 6. Product Distribution
ax6 = plt.subplot(2, 3, 6)
product_counts = df['Product'].value_counts()
ax6.pie(product_counts, labels=product_counts.index, autopct='%1.1f%%', startangle=45)
ax6.set_title('Sales Transactions by Product', fontsize=14, fontweight='bold', pad=10)

plt.tight_layout()
plt.savefig('/home/daytona/sales_analysis_plot.png', dpi=300, bbox_inches='tight', facecolor='white')
print("\nPlot saved as: sales_analysis_plot.png")
```

이 실행에 대한 전체 [LangSmith 트레이스](https://smith.langchain.com/public/ac2443a8-16ad-4e00-8f02-afde6a737534/r)를 확인하세요.

---

## 📊 결과 (Results)

에이전트는 성공적으로 데이터를 분석하고 시각화가 포함된 종합 리포트를 Slack에 공유합니다.

![Slack의 매출 분석 결과](https://mintcdn.com/langchain-5e9cc07a/7KAsBk-8tguhrRJ6/images/data_analysis_slack_response.png?fit=max&auto=format&n=7KAsBk-8tguhrRJ6&q=85&s=b0a89738510117d55b35fc7a10265053)

> 💡 외부 도구를 사용하지 않고도 백엔드에서 결과물을 직접 다운로드할 수 있습니다.
>
> ```python
> backend.download_files(list_of_filepaths)
> ```

> ℹ️ 작업 완료 후 샌드박스 정리 방법은 [provider 가이드](https://docs.langchain.com/oss/python/deepagents/sandboxes#available-providers)를 참고하세요.

---

## 🎯 다음 단계 (Next steps)

데이터 분석 에이전트를 구축했으니, 다음 리소스를 통해 기능을 확장해 보세요.

- [Backends](https://docs.langchain.com/oss/python/deepagents/backends): Deep Agents 백엔드 시스템에 대해 학습
- [Sandboxes](https://docs.langchain.com/oss/python/deepagents/sandboxes): 보안 고려 사항과 고급 설정을 포함한 샌드박스 코드 실행용 백엔드 검토
- [Customization](https://docs.langchain.com/oss/python/deepagents/customization): 다양한 모델, 도구, 프롬프트, 계획 전략으로 에이전트를 커스터마이징하는 방법
- [Code](https://docs.langchain.com/oss/python/deepagents/code/overview): 로컬에서 데이터 분석 등의 작업을 지원하는 터미널 코딩 에이전트로 Deep Agents Code 사용해 보기
- [Skills](https://docs.langchain.com/oss/python/deepagents/skills): 일반적인 워크플로를 위한 재사용 가능한 스킬로 에이전트 강화
- [Human-in-the-loop](https://docs.langchain.com/oss/python/deepagents/human-in-the-loop): 데이터 분석 워크플로의 핵심 작업에 대화형 승인 단계 추가

---

> 📝 이 문서를 Claude, VSCode 등에 MCP를 통해 실시간 답변용으로 [연결](https://docs.langchain.com/use-these-docs)할 수 있습니다. [GitHub에서 페이지 편집](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/data-analysis.mdx) 또는 [이슈 등록](https://github.com/langchain-ai/docs/issues/new/choose)도 가능합니다.
