# Legal Document Automation Platform

A specialized legal document ingestion and automatic case-matching platform designed for advocates, lawyers, clerks, chambers, and small law firms.

---

## 🎯 Core Product Hypothesis & Wedge

> **Primary Hypothesis:** A user can upload a legal document without selecting a case first, and the system can reliably identify the correct case, ask for human confirmation when uncertain, and file the document safely.

### The Golden Path

```
Create Case / Ingest Case
       │
       ▼
Upload PDF Document (Upload First UX)
       │
       ▼
Secure Private Storage & SHA-256 Hashing
       │
       ▼
Text Extraction / OCR Fallback
       │
       ▼
Metadata & Case Identifier Extraction
       │
       ▼
Candidate Generation & Deterministic/AI Case Matching
       │
       ▼
Auto-Filing OR User Confirmation Flow
       │
       ▼
Indexing, Search & Document Retrieval
```

---

## 📁 Repository Structure

```
.
├── Backend/              # Dedicated Express + TypeScript API backend service
├── Frontend/             # Next.js web application interface
├── docs/                 # Product Requirement Documents (PRD) & UI specs
├── AGENTS.md             # Core engineering rules, security rules & AI boundaries
├── BUILD-LOG.md          # Chronological engineering log
├── CURRENT-STATE.md      # Current product and technical status
├── TODO.md               # Backlog and milestone execution plan
├── .env.example          # Baseline environment variable configuration
└── README.md             # Project overview and setup guide
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or later
- **npm**: v9.x or later
- **Git**

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd 36-legal-saas
   ```

2. **Configure Environment Variables:**
   Copy the environment templates:
   ```bash
   cp .env.example .env
   cp Backend/.env.example Backend/.env
   cp Frontend/.env.example Frontend/.env.local
   ```

3. **Backend Service Setup:**
   ```bash
   cd Backend
   npm install
   npm run dev       # Starts Express backend on http://localhost:5000
   npm test          # Runs backend health unit tests
   ```

4. **Frontend Service Setup:**
   ```bash
   cd Frontend
   npm install
   npm run dev       # Starts Next.js app on http://localhost:3000
   ```

5. **Running Tests & Quality Checks:**
   ```bash
   # Run all workspace test suites (Backend + Frontend)
   npm test

   # Run typechecks and linting across the workspace
   npm run typecheck
   npm run lint

   # Service-specific testing
   npm --prefix Backend test     # Express unit & supertest integration tests
   npm --prefix Frontend test    # Vitest component & utility tests
   ```

---

## 🧪 Testing Infrastructure & CI/CD Commands

| Command | Scope | Description |
| :--- | :--- | :--- |
| `npm test` | Workspace Root | Executes unit & integration tests across `Backend` and `Frontend` |
| `npm run typecheck` | Workspace Root | Verifies TypeScript static types across both projects |
| `npm run lint` | Workspace Root | Runs ESLint analysis across both projects |
| `npm --prefix Backend test` | Backend Service | Runs `tsx --test` unit tests and `supertest` HTTP assertions |
| `npm --prefix Frontend test` | Frontend Service | Runs `vitest` unit test suite |

---

## 📋 Engineering Governance & Guidelines

All development on this codebase follows strict engineering, security, and scope-control guidelines detailed in [`AGENTS.md`](./AGENTS.md).

### Core Rules:
1. **Precision before Automation**: A wrong automatic filing is worse than asking one extra question.
2. **Original Documents are Sacred**: Never overwrite or mutate the original uploaded file.
3. **Tenant Isolation**: Every resource is organization-scoped.
4. **Deterministic before LLM**: Use exact identifiers and rules before falling back to AI models.
5. **No Scope Creep**: Keep changes focused on the MVP execution backlog in [`TODO.md`](./TODO.md).

---

## 📜 License

Private & Proprietary. All rights reserved.
