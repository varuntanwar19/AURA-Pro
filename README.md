# AURA — Autonomous Unified Resource Abstraction

> An agentic AI platform for autonomous multi-cloud infrastructure management, orchestration, and observability — built for local development with zero cloud costs.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AURA Platform                              │
│                                                                     │
│   ┌──────────────┐        ┌────────────────────────────────────┐    │
│   │   Frontend   │        │           Backend (FastAPI)        │    │
│   │  React/Vite  │◄──────►│  Agents │ RAG │ MCP │ REST │ WS   │    │
│   │  Port: 3000  │        │              Port: 8000            │    │
│   └──────────────┘        └────┬──────┬──────┬─────┬──────────┘    │
│                                │      │      │     │               │
│          ┌─────────────────────┘      │      │     └──────────┐    │
│          ▼                            ▼      ▼                ▼    │
│   ┌─────────────┐           ┌──────────────┐  ┌──────────────────┐ │
│   │  ChromaDB   │           │    Ollama    │  │  Elasticsearch   │ │
│   │ Vector Store│           │  LLM Server  │  │   + Kibana       │ │
│   │  Port: 8001 │           │  Port: 11434 │  │  9200 │ 5601     │ │
│   └─────────────┘           └──────────────┘  └──────────────────┘ │
│                                                                     │
│   ┌─────────────┐           ┌──────────────┐  ┌──────────────────┐ │
│   │ Prometheus  │           │   Grafana    │  │    Minikube      │ │
│   │  Port: 9090 │◄─────────►│  Port: 3001  │  │  (host / K8s)   │ │
│   └─────────────┘           └──────────────┘  └──────────────────┘ │
│                                                                     │
│                    [ aura-network (bridge) ]                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

- 🤖 **Autonomous Agents** — Multi-agent system for infrastructure planning, execution, and validation
- 🧠 **RAG Pipeline** — ChromaDB-backed retrieval-augmented generation for context-aware decisions
- ☁️ **Multi-Cloud** — Azure, AWS, GCP adapters with a unified abstraction layer
- 🔧 **MCP Servers** — Model Context Protocol integrations for GitHub, cloud CLIs, and more
- 📊 **Full Observability** — Prometheus metrics, Grafana dashboards, Elasticsearch + Kibana logs
- 🐳 **Containerized** — Docker Compose for local dev, Kubernetes manifests for staging/prod
- 🔌 **WebSocket Streaming** — Real-time agent output streaming to the frontend
- 🏗️ **IaC Ready** — Terraform modules for Azure (extensible to AWS/GCP)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Containerized services |
| [Ollama](https://ollama.ai/) | Latest | Local LLM inference |
| [Node.js](https://nodejs.org/) | 20+ | Frontend development |
| [Python](https://python.org/) | 3.11+ | Backend development |
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | Latest | Kubernetes management (optional) |
| [Minikube](https://minikube.sigs.k8s.io/) | Latest | Local Kubernetes (optional) |
| [Terraform](https://terraform.io/) | 1.5+ | Cloud IaC (optional) |

---

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your_username/aura.git
cd aura
```

### 2. Configure Environment
```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```
Edit `.env` and fill in any values you need (GitHub token, cloud credentials, etc).  
For a pure local POC, the defaults work out of the box.

### 3. Pull the local Ollama Model
```bash
docker compose up -d ollama
docker compose exec ollama ollama pull llama3.2
```

### 4. Start All Services
```bash
docker compose up -d --build
```

Or use the automated setup script (Windows):
```powershell
.\setup.ps1
```

### 5. Verify Services Are Running
```bash
docker compose ps
```

---

## Azure deployment and local services

The dashboard and its supporting services run locally in Docker. Ollama is expected on the host at `http://localhost:11434` by default; to use bundled Ollama instead, set `OLLAMA_BASE_URL=http://ollama:11434` and start with `docker compose --profile ollama-local up -d --build`. The Azure provider is the only Terraform deployment target in this repository; AWS and GCP remain selectors for the shared IaaS/PaaS/SaaS UI and are not deployable adapters yet. To use the bundled Elasticsearch/Kibana instead of an existing ELK endpoint, start with `docker compose --profile elk-local up -d --build`.

1. Copy `.env.example` to `.env`. Set `AZURE_SUBSCRIPTION_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` for the service principal you want Terraform to use. Keep `.env` private.
2. Run `docker compose up -d --build`, or run `.\setup.ps1` on Windows. The script downloads `llama3.2` into the local Ollama container.
3. Open `http://localhost:3000`, choose **Azure**, then open **Terraform** and select **Run Terraform plan**. The backend runs `terraform init` and `terraform plan` against `terraform/` and displays the plan output.
4. Review the exact plan and Azure costs. Send the plan to **Human Approvals**. To apply that saved plan, enter `APPLY AZURE PLAN` and choose **Approve and apply plan**. The app applies only the saved plan; it never applies from an agent recommendation alone.

The current Terraform creates an Azure resource group, a locally redundant Storage Account, and a one-node AKS cluster. The AKS Free management tier does not make its worker VM, networking, or storage free. This project does not calculate a cost estimate. Terraform state and generated plans are stored locally under `terraform/`; protect those files because state can contain sensitive outputs. No remote state locking is configured.

The RAG page stores submitted text in the local ChromaDB volume. Chat uses local Ollama and cites the indexed text it retrieved. Prometheus range queries feed the IaaS and PaaS charts when the configured Prometheus has Kubernetes CPU/memory/network metrics. Without those series the UI explicitly shows that telemetry is missing; it does not draw sample data. Sustained low AKS utilization can produce a review recommendation, but there is no Azure price lookup, savings estimate, or automatic resize.

The project includes real read-only MCP servers using the official Python MCP SDK and Streamable HTTP transport: AKS/Kubernetes `http://localhost:8101/mcp`, Elasticsearch `:8102/mcp`, Terraform `:8103/mcp`, Microsoft Graph `:8104/mcp`, Prometheus `:8105/mcp`, and GitHub `:8106/mcp`. MCP tools do not expose Terraform apply or Kubernetes mutations; apply remains only in the AURA human-approval UI. To enable Kubernetes API inventory, set `KUBERNETES_CONFIG_PATH` in `.env` to the absolute path of your kubeconfig; otherwise the AKS MCP still reads Prometheus and Terraform metadata. Microsoft Graph tools need `M365_TENANT_ID`, `M365_CLIENT_ID`, and `M365_CLIENT_SECRET`, plus admin consent for their listed read-only permissions. GitHub tools require `GITHUB_TOKEN` and `GITHUB_REPO`. AWS/GCP deployment adapters are still not implemented.

Docker ports are bound to `127.0.0.1`. The dashboard is for local access.

---

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | — |
| **Backend API Docs** | http://localhost:8000/docs | — |
| **Backend Health** | http://localhost:8000/health | — |
| **ChromaDB** | http://localhost:8001 | — |
| **Kibana** | http://localhost:5601 | — |
| **Grafana** | http://localhost:3001 | admin / aura_admin |
| **Prometheus** | http://localhost:9090 | — |
| **Ollama API** | http://localhost:11434 | — |
| **Elasticsearch** | http://localhost:9200 | — |

---

## Agent Workflow

```
User Request
     │
     ▼
┌──────────────────┐
│  Planner Agent   │  Breaks task into steps
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  RAG Retrieval   │────►│  Context Builder  │  Enriches with KB
└──────────────────┘     └────────┬─────────┘
                                  │
         ┌────────────────────────┤
         ▼                        ▼
┌────────────────┐      ┌──────────────────┐
│  Cloud Agent   │      │  K8s Agent       │  Specialized executors
│  (Az/AWS/GCP)  │      │  (Minikube/AKS)  │
└───────┬────────┘      └────────┬─────────┘
        │                        │
        └───────────┬────────────┘
                    ▼
           ┌─────────────────┐
           │ Validator Agent │  Checks results
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │  Result + Logs  │  Streamed to UI via WebSocket
           └─────────────────┘
```

---

## Project Structure

```
aura/
├── backend/                  # FastAPI application
│   ├── agents/               # Autonomous agent modules
│   ├── api/                  # REST & WebSocket routes
│   ├── mcpservers/           # Model Context Protocol servers
│   ├── rag/                  # Retrieval-Augmented Generation
│   ├── main.py               # FastAPI entrypoint
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile
├── frontend/                 # React + Vite application
│   ├── src/
│   ├── nginx.conf
│   ├── Dockerfile
│   └── .env
├── terraform/                # IaC for Azure
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── prometheus/               # Monitoring config
│   └── prometheus.yml
├── .github/workflows/        # CI/CD pipelines
│   └── deploy-azure.yml
├── docker-compose.yml        # Local dev orchestration
├── .env.example              # Environment template
├── setup.ps1                 # Windows setup script
└── README.md
```

---

## Local POC Notes

> **Zero Cloud Cost**: This setup is entirely local. All AI inference runs through Ollama, and all storage uses local Docker volumes.

- **Ollama** replaces OpenAI / Azure OpenAI for zero-cost LLM inference
- **ChromaDB** runs locally in Docker for vector storage
- **Elasticsearch** runs in single-node mode with 512 MB heap to minimize RAM usage
- **Minikube** runs on your host (outside Docker) for Kubernetes emulation
- **Terraform** files are provided for when you're ready to move to real Azure resources

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes with tests
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feat/my-feature`
6. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

MIT © AURA Contributors
