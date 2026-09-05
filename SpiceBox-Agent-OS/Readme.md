# SpiceBox Agent OS
### AI Growth & Agentic Commerce Engine — Powered by LangGraph & Razorpay

[![Razorpay Buildathon Track 01](https://img.shields.io/badge/Razorpay_Buildathon-Track_01:_AI_Growth_%26_Agentic_Commerce-blue?style=for-the-badge&logo=razorpay)](https://razorpay.com)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-orange?style=for-the-badge)](https://langchain-ai.github.io/langgraph/)
[![Python](https://img.shields.io/badge/Backend-Python_3.11+-yellow?style=for-the-badge&logo=python)](https://python.org)
[![Razorpay API](https://img.shields.io/badge/Payments-Razorpay_Test_Mode-0C2340?style=for-the-badge&logo=razorpay)](https://razorpay.com/docs/api/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> **"Every money action explainable, bounded and gated. Complete audit trail with graceful failure handling."**

---

## Table of Contents
- [Executive Overview](#executive-overview)
- [The Problem vs. Our Solution](#the-problem-vs-our-solution)
- [System Architecture](#system-architecture)
- [The Two-Agent Engine](#the-two-agent-engine)
  - [Agent 1: Knowledge Graph Manager](#1-agent-1-knowledge-graph-manager-store_manager_llm)
  - [Agent 2: Merchant Commerce Agent](#2-agent-2-merchant-commerce-agent-merchant_llm)
- [Mathematical Upsell & Policy Engine](#mathematical-upsell--policy-engine)
- [Safety, Gating & Financial Guardrails](#safety-gating--financial-guardrails)
- [Razorpay Test-Mode Integration](#razorpay-test-mode-integration)
- [Audit Trail & Observability](#audit-trail--observability)
- [Failure Handling & Resilience](#failure-handling--resilience)
- [Repository Structure](#repository-structure)
- [Getting Started & Local Setup](#getting-started--local-setup)
- [API Reference](#api-reference)
- [Verification & Automated Tests](#verification--automated-tests)

---

## Executive Overview

**SpiceBox Agent OS** is a production-grade agentic commerce backend designed for **Razorpay Buildathon Track 01 ("AI Growth & Agentic Commerce")**. 

Traditional chatbots fail in e-commerce because they suffer from **catalog opacity** (hallucinating specs, stock, and prices from ungrounded prompts) and **ungated financial execution** (blindly generating payment links without shipping addresses or cart verification). 

SpiceBox Agent OS solves this through a decoupled **two-agent architecture**:
1. An offline **Knowledge Graph Manager Agent** that structures relational SQL tables and raw reviews into an AI-readable, bi-directionally linked semantic Markdown Wiki.
2. An online **Merchant Commerce Agent** that combines natural language empathy with a 100% deterministic Python policy engine, strictly gating every cart action, address collection, and Razorpay test-mode payment link.

---

## The Problem vs. Our Solution

| Challenge | Traditional Chatbots | SpiceBox Agent OS |
|---|---|---|
| **Catalog Grounding** | Prompts hallucinate prices, specs, and out-of-stock items. | Grounded in a persistent, linted Markdown Wiki with YAML frontmatter. |
| **Sales Decisions** | Random or pushy upselling that alienates budget-conscious buyers. | Deterministic scoring algorithm ($0$ to $100$) with a hard budget firewall (`NO_UPSELL`). |
| **Cart & Pricing** | LLM invents order totals or discounts in text. | Cart line items $\sum (P \times Q)$ computed deterministically in memory. |
| **Payment Safety** | Triggers payment immediately without delivery details. | **Address-First Gating**: Hard block on payment creation until shipping address is validated. |
| **Checkout Experience** | Redirects out of chat to complex web checkouts. | Creates live Razorpay payment links (`plink_...`) with embedded in-chat UPI QR codes. |
| **Auditability** | Ephemeral, opaque prompt completions. | Every ingest, intent score, and payment link ID is persistently logged to `log.md`. |

---

## System Architecture

```
+-----------------------------------------------------------------------------------+
|                                  SPICEBOX AGENT OS                                |
+-----------------------------------------------------------------------------------+
                                          │
     ┌────────────────────────────────────┴────────────────────────────────────┐
     │                                                                         │
     ▼                                                                         ▼
┌────────────────────────────────────┐               ┌─────────────────────────────────────┐
│ AGENT 1: KNOWLEDGE GRAPH MANAGER   │               │ AGENT 2: MERCHANT COMMERCE AGENT    │
│ (knowledge_grap_manager_llm)       │               │ (merchant_llm)                      │
│                                    │               │                                     │
│ 1. collect_data (Medusa / Postgres)│               │ 1. selling_context_node             │
│ 2. extract_entities & reviews      │               │    - Intent Analyzer Subgraph       │
│ 3. knowledge_diff & create_pages   │               │    - RapidFuzz Wiki Retrieval       │
│ 4. resolve_conflict (LLM Analyst)  │               │    - Deterministic policy.py        │
│ 5. cross_reference (Wiki Graph)    │               │ 2. merchant_llm_node                │
│ 6. update_index & append_log       │               │    - Multi-Model Fallback Chain     │
│ 7. validate_wiki (Health Lint)     │               │    - schema.md Constitution         │
└─────────────────┬──────────────────┘               └──────────────────┬──────────────────┘
                  │                                                     │
                  ▼ Writes Markdown                                     ▼ Calls 10 Tools
┌────────────────────────────────────┐               ┌─────────────────────────────────────┐
│ PERSISTENT KNOWLEDGE WIKI          │◄──────────────┤ COMMERCE & CART TOOLS               │
│ ├── wiki/knowledge/products/*.md   │  Reads        │ - get_product_catalog / upsell      │
│ ├── wiki/knowledge/categories/*.md │  Catalog      │ - add_to_cart / remove / clear      │
│ ├── wiki/marketing/popular/*.md    │               │ - set_shipping_address              │
│ └── wiki/log.md (Audit Trail)      │               └──────────────────┬──────────────────┘
└────────────────────────────────────┘                                  │
                                                                        ▼
                                                     ┌─────────────────────────────────────┐
                                                     │ FINANCIAL GATING LAYER (cart.py)    │
                                                     │ [Gate 1: shipping_address present?] │
                                                     │ [Gate 2: amount = cart.total > 0]   │
                                                     └──────────────────┬──────────────────┘
                                                                        │
                                                                        ▼
                                                     ┌─────────────────────────────────────┐
                                                     │ RAZORPAY TEST API INTEGRATION       │
                                                     │ - client.payment_link.create()      │
                                                     │ - In-Memory Base64 UPI QR Generator │
                                                     │ - Output: plink_... & Short URL     │
                                                     └─────────────────────────────────────┘
```

---

## The Two-Agent Engine

### 1. Agent 1: Knowledge Graph Manager (`store_manager_llm`)
- **Core Role**: Autonomous ETL & Knowledge Graph Maintainer.
- **Input**: Database records via Medusa Admin API or direct PostgreSQL connection.
- **LangGraph Pipeline (12 Nodes)**:
  1. `collect_data`: Ingests catalog datasets and customer reviews.
  2. `extract_entities`: Normalizes SKUs, pricing, specifications, and variants.
  3. `extract_reviews`: Synthesizes ratings, top pros, top cons, and sentiment summaries.
  4. `search_existing_wiki`: Scans existing markdown dossiers for incremental diffing.
  5. `knowledge_diff`: Identifies what needs creation vs. updating.
  6. `create_pages` / `update_pages`: Compiles structured markdown with YAML frontmatter via Jinja2 templates.
  7. `resolve_conflict`: Resolves contradictory specifications between sources using LLM reasoning.
  8. `cross_reference`: Generates bidirectional graph links (`BELONGS_TO`, `ALTERNATIVE_TO`, brand accessories).
  9. `update_index`: Compiles master catalog directories.
  10. `append_log`: Writes structured transaction audits to `log.md`.
  11. `validate_wiki`: Runs health linting (checking orphan pages, broken links, conflicting specs, health score %).

### 2. Agent 2: Merchant Commerce Agent (`merchant_llm`)
- **Core Role**: Autonomous Conversational Commerce & Checkout Agent.
- **Multi-Model Fallback Chain**:
  - **Primary**: Local Ollama (`gpt-oss:120b-cloud`, `gpt-oss:20b-cloud`) — Zero TPM/TPD limits.
  - **Secondary**: Groq Cloud (`openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.6-27b`, `qwen/qwen3.8-27b`).
- **Tools Bound (10 Tools)**:
  `get_product_catalog`, `get_better_alternatives`, `get_upsell_products`, `add_to_cart`, `get_cart`, `remove_from_cart`, `clear_cart`, `set_shipping_address`, `generate_payment_qr`, `show_receipt_image`.

---

## Mathematical Upsell & Policy Engine

In `intent_analyzer_llm/policy.py`, **no LLM is permitted to make a sales or pricing decision**. All decisions are governed by transparent, explainable formulas:

### 1. Upsell Opportunity Score (0 – 100)
$$\text{Score} = 100 \times \left( 0.45 \cdot \text{openness} + 0.30 \cdot \text{quality} + 0.25 \cdot (1 - \text{restrictiveness}) \right)$$

### 2. Policy Decision Thresholds
- $\text{Score} < 30$ **OR** Hard Budget Refusal $\longrightarrow$ **`NO_UPSELL`** *(Strict ban on higher-priced items)*
- $30 \le \text{Score} < 60$ $\longrightarrow$ **`SOFT_UPSELL`** *(Gentle upgrade mention)*
- $\text{Score} \ge 60$ $\longrightarrow$ **`ACTIVE_UPSELL`** *(Confident value upgrade)*

### 3. Maximum Acceptable Price Boundary
$$\text{Effective Budget} = \begin{cases} \text{Stated Budget} & \text{if hard budget constraint} \\ \text{Stated Budget} \times (1 + \text{Acceptable Stretch}) & \text{otherwise} \end{cases}$$

Candidate selection (`select_upsell_candidate`) strictly filters out any item exceeding `Effective Budget`.

---

## Safety, Gating & Financial Guardrails

To meet the strictest hackathon criteria, we enforce non-negotiable execution boundaries:

1. **Mandatory Address-First Checkout Gating**:
   ```python
   # tools.py lines 124-130
   cart_data = get_cart_data()
   if not cart_data.get("shipping_address"):
       return "Cannot generate payment QR code yet: Customer's delivery/shipping address is missing. Ask for shipping details FIRST."
   ```
2. **Deterministic Amount Calculation**:
   The LLM cannot invent or alter payment amounts. If `amount_inr <= 0` or arbitrary, `create_payment_qr` forces:
   $$\text{amount} = \sum (\text{item.price} \times \text{item.quantity})$$
3. **Hard Budget Constraint Firewall**:
   Regex detection (`_HARD_BUDGET`) catches phrases like *"not a single rupee more"* or *"strictly under 5000"*, instantly locking `hard_budget_constraint = True`, forcing `NO_UPSELL`, and blocking upsell recommendations.
4. **Question Discipline**:
   Clarification questions across the session are tracked and capped at **3 total** (excluding pure greetings) to prevent customer fatigue.
5. **Cross-Sell Discipline**:
   Complementary accessories are suppressed until the customer explicitly selects or confirms a primary product (`primary_selected == True`).

---

## Razorpay Test-Mode Integration

The payment pipeline runs through Razorpay's official Python SDK:

```python
import razorpay

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
link = client.payment_link.create({
    "amount": int(amount_inr * 100),  # Amount in paise
    "currency": "INR",
    "accept_partial": False,
    "description": description,
    "customer": {
        "name": f"{first_name} {last_name}",
        "contact": phone,
        "email": email
    },
    "notify": {"sms": False, "email": False}
})
```

- **In-Chat UPI QR Code**: The returned `short_url` is converted in-memory to a PNG QR code via Python `qrcode`, encoded as a `data:image/png;base64,...` URL, and rendered directly in chat.
- **Universal Payability**: Customers can scan with Google Pay, PhonePe, Paytm, or click the direct Razorpay payment link.

---

## Audit Trail & Observability

Every action is traceable and reproducible:
1. **Ingest Operations Log (`wiki/log.md`)**:
   Maintains a persistent ledger of all dataset updates, pages created/updated, spec conflicts, and health check scores.
2. **Intent Analysis Logs**:
   Every turn logs structured JSON:
   `intent_analysis={"customer_need": ..., "budget": 5000, "score": 71.25, "decision": "ACTIVE_UPSELL"}`.
3. **Cart & Payment Action Ledger (`last_actions`)**:
   Tracks the exact Razorpay `payment_link_id` (e.g. `plink_TY7mUIeJeGP9Qm`), amount in INR, and delivery address.

---

## Failure Handling & Resilience

The codebase supports end-to-end graceful degradation:
- **Missing Address Attempt**: Gating layer rejects payment generation, displays an itemized bill, and guides the customer to provide shipping details.
- **Razorpay API Outage**: If Razorpay test credentials or network fail, `create_payment_qr` catches the exception and falls back to a standard NPCI UPI deep link (`upi://pay?pa=store@razorpay...`), ensuring the customer is never stranded.
- **LLM Rate Limits / Outages**: LangChain `.with_fallbacks()` automatically routes requests from Ollama to Groq models without dropping the chat session.
- **Data Source Unavailability**: If Medusa Admin HTTP API is unreachable, `collect_data` falls back to direct PostgreSQL queries via `psycopg2`.

---

## Repository Structure

```text
SpiceBox-Agent-OS/
├── backend/
│   ├── server.py                                    # HTTP runner (port 8002) for chat & wiki APIs
│   ├── merchant_knowledge/                          # Persistent AI-Readable Knowledge Wiki
│   │   └── wiki/
│   │       ├── index.md                             # Master catalog directory
│   │       ├── log.md                               # Operational audit trail
│   │       ├── knowledge/products/*.md              # Product dossiers with YAML frontmatter
│   │       ├── knowledge/categories/*.md            # Category dossiers
│   │       └── marketing/popular/*.md               # Marketing intelligence dossiers
│   └── src/agents/
│       ├── knowledge_grap_manager_llm/              # Agent 1: Wiki ETL & Maintenance
│       │   ├── graph.py                             # 12-Node LangGraph definition
│       │   ├── query_pipeline.py                    # RapidFuzz catalog search & retrieval
│       │   └── nodes/                               # collect, extract, diff, conflict, validate
│       ├── intent_analyzer_llm/                     # Intent & Policy Subgraph
│       │   ├── analyzer.py                          # CustomerIntent extraction
│       │   └── policy.py                            # Deterministic upsell scoring & boundaries
│       └── merchant_llm/                            # Agent 2: Conversational Commerce
│           ├── graph.py                             # Merchant LangGraph StateGraph
│           ├── schema.md                            # System constitution & behavioral rules
│           ├── nodes/                               # merchant_llm, selling_context, tools
│           └── utils/
│               ├── cart.py                          # In-memory cart, address & Razorpay QR
│               └── llm.py                           # Multi-model fallback chain (Ollama/Groq)
└── my-shop/                                         # Medusa DTC Monorepo (Backend & Storefront)
```

---

## Getting Started & Local Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 20+ & pnpm (for storefront/Medusa)
- Ollama (optional for local models) or Groq API Key
- Razorpay Test Account Key & Secret

### 2. Backend Installation
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Windows
pip install -r requirement.txt
```

### 3. Environment Configuration (`backend/.env`)
```ini
GROQ_API_KEY=gsk_your_groq_key
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
OLLAMA_BASE_URL=http://localhost:11434
WIKI_SERVER_PORT=8002
MEDUSA_URL=http://localhost:9001
```

### 4. Build Knowledge Wiki (Agent 1)
```bash
# Ingest catalog & marketing data into markdown wiki
python -m src.agents.store_manager_llm --source ./test_data --wiki ./merchant_knowledge --both
```

### 5. Start Merchant Runner Server (Agent 2)
```bash
python server.py
# Server starts at http://0.0.0.0:8002
```

---

## API Reference

### `POST /chat` — Commerce Agent Endpoint
Processes customer conversation, performs intent analysis, and executes cart/checkout actions.

**Request Payload:**
```json
{
  "merchant_id": "default_merchant",
  "user_id": "cust_12345",
  "messages": [
    {"role": "user", "content": "I want a durable sports watch under ₹5000"}
  ],
  "cart": {"items": [], "shipping_address": null}
}
```

**Response Payload:**
```json
{
  "success": true,
  "response": "Here are our top sports watches under ₹5,000...",
  "cart": {
    "items": [],
    "total": 0.0,
    "item_count": 0,
    "shipping_address": null
  },
  "actions": []
}
```

### Additional Endpoints:
- `GET /wiki/tree`: Returns hierarchical tree of all catalog markdown pages.
- `GET /wiki/graph`: Returns Neo4j-compatible graph nodes & links (`BELONGS_TO`, `ALTERNATIVE_TO`).
- `POST /generate`: Triggers background execution of Agent 1 to rebuild/diff the wiki.
- `GET /status`: Live progress tracking of wiki generation.

---

## Verification & Automated Tests

Run the test suite to verify end-to-end commerce flows, intent analysis, and policy gating:

```bash
cd backend

# Verify Intent Analyzer & 10 Edge Cases
python -m pytest src/agents/intent_analyzer_llm/test/test_10_cases.py -v

# Verify Policy Engine
python -m pytest src/agents/intent_analyzer_llm/test/test_policy.py -v

# Run End-to-End Merchant Agent Simulation
python src/agents/merchant_llm/test/test_merchant_agent.py
```

---

## Contributors & Acknowledgements
Built for **Razorpay Buildathon Track 01**.
Special thanks to the **Razorpay Developer Platform**, **LangChain/LangGraph**, and **MedusaJS** communities.
