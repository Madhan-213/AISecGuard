# AISecGuard — Hugging Face Spaces Deployment Guide

> **Project:** AISecGuard — Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
> **Academic Context:** MCA 3rd Semester Final Year Project  
> **Target Environment:** [Hugging Face Spaces](https://huggingface.co/spaces) (Docker SDK · CPU Free Tier: 2 vCPU · 16 GB RAM)  
> **Cost:** 100% Free · No Credit Card Required  

---

## 1. Why Hugging Face Spaces for this Project?

For an MCA final-year cybersecurity and AI project, deploying on Hugging Face Spaces offers major advantages:

1. **Prestigious AI Domain:** Hosting directly on Hugging Face highlights domain expertise in AI/ML model hubs and supply chain security.
2. **Generous Free Hardware:** You get **2 vCPUs and 16 GB of RAM** for free (unlike Render or Heroku which only offer 512 MB).
3. **Zero Sleep Timeouts:** Spaces stay warm much longer than standard free tiers, preventing awkward cold starts during viva demonstrations.
4. **Unified Single-Port Deployment:** Runs both the **React 19 Frontend** and the **FastAPI Backend** inside a single container on port `7860` with zero CORS hurdles.
5. **Standalone Operation:** Works out of the box with **in-memory database** and **client device cache memory** (`localStorage`), requiring no external database or login credentials.

---

## 2. Space Configuration Metadata

Every Hugging Face Docker Space requires a YAML frontmatter block at the very top of its `README.md`.

```yaml
---
title: AISecGuard - AI Supply Chain Defense
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Static scanner for AI models, datasets, and dependencies.
---
```

---

## 3. Deployment Architecture on Hugging Face

```
                          User / College Evaluator
                                     │
                                     ▼
                https://huggingface.co/spaces/<USER>/aisecguard
                                     │
                  ┌──────────────────┴──────────────────┐
                  │   Hugging Face Docker Container     │
                  │   Port 7860 (Single Entrypoint)     │
                  ├─────────────────────────────────────┤
                  │                                     │
                  │  1. React 19 Frontend (Built SPA)   │
                  │     • Modern Dashboard UI           │
                  │     • Client Device Cache Storage   │
                  │                                     │
                  │  2. FastAPI Security Engine         │
                  │     • Pickle Opcode Scanner         │
                  │     • Dataset Anomaly Auditor       │
                  │     • Dependency CVE Checker        │
                  │     • PDF Remediation Exporter      │
                  │     • In-Memory Fast Cache Store    │
                  │                                     │
                  └─────────────────────────────────────┘
```

---

## 4. Step-by-Step Deployment Guide

### Step 1: Create a Free Hugging Face Account
1. Go to [https://huggingface.co/join](https://huggingface.co/join) and sign up for a free account.
2. Verify your email address.

---

### Step 2: Create a New Space
1. Click your profile icon at the top right and select **New Space** (or visit [https://huggingface.co/new-space](https://huggingface.co/new-space)).
2. Fill in the details:
   - **Space Name:** `aisecguard` (or your preferred name)
   - **License:** `MIT`
   - **Select the Space SDK:** Choose **Docker**
   - **Docker template:** Choose **Blank**
   - **Space Hardware:** Select **CPU basic · 2 vCPU · 16 GB · Free**
   - **Visibility:** **Public** (required for free tier sharing)
3. Click **Create Space**.

---

### Step 3: Prepare the Repository Files

Hugging Face Spaces expects the root `Dockerfile` to be the build specification for the Space.

In your local project, copy [`Dockerfile.hf`](file:///d:/MCA%203rd%20SEM/project/AISecGuard/Dockerfile.hf) to `Dockerfile` for the Space:

```bash
# In your project root:
cp Dockerfile.hf Dockerfile
```

Ensure the root files in the Space include:
- `Dockerfile` (copied from `Dockerfile.hf`)
- `README.md` (with the Hugging Face YAML metadata at the top)
- `requirements.txt`
- `backend/` directory (includes `hf_app.py`, `app/`, etc.)
- `frontend/` directory (React application)
- `samples/` directory (for test demonstrations)

---

### Step 4: Push Code to Hugging Face Spaces

You can push your project to Hugging Face Spaces using standard Git.

#### Method A: Push via Git CLI (Recommended)

1. On your Hugging Face Space page, find your Space Git URL (e.g. `https://huggingface.co/spaces/<your-username>/aisecguard`).
2. Add your Hugging Face Access Token:
   - Go to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
   - Generate a **Write** token.
3. In your local terminal:
```bash
# Add Hugging Face Space as a new git remote
git remote add space https://huggingface.co/spaces/<your-username>/aisecguard

# Push to Hugging Face
git push --force space main
```
*(When prompted for password, paste your Hugging Face Access Token)*.

#### Method B: Push from a Clean Deployment Branch
If you want to keep your GitHub repo and Hugging Face repo cleanly decoupled:
```bash
git checkout -b huggingface-deploy
cp Dockerfile.hf Dockerfile
git add Dockerfile
git commit -m "Configure Hugging Face Space Dockerfile"
git push -u space huggingface-deploy:main
git checkout main
```

---

### Step 5: Configure Space Variables (Optional)

1. In your Hugging Face Space, click the **Settings** tab.
2. Scroll down to **Variables and Secrets**.
3. Under **Variables**, add:
   - `DATABASE_URL` = `sqlite:///:memory:`
   - `NO_LOGIN_REQUIRED` = `true`
   - `PORT` = `7860`

---

### Step 6: Monitor Build & Launch

1. Go back to the **App** tab in your Space.
2. You will see the build phase:
   - `Building`: Installing Node.js, compiling React with Vite, installing Python packages.
   - `Running`: FastAPI and Uvicorn initialize on port `7860`.
3. Within 2–3 minutes, your live security dashboard will appear directly inside the Hugging Face Space!

---

## 5. Live Access Links

Your project will have two live URLs:

1. **Embedded Hugging Face Space (Great for portfolio):**  
   `https://huggingface.co/spaces/<your-username>/aisecguard`

2. **Direct Fullscreen URL (Best for college projector & viva):**  
   `https://<your-username>-aisecguard.hf.space`

---

## 6. College Viva / Project Presentation Checklist

When presenting to examiners, follow this sequence:

| Step | Action | What to Explain to Evaluators |
|---|---|---|
| **1. Overview** | Open `https://<your-username>-aisecguard.hf.space` | Explain that the system is hosted live on Hugging Face's cloud infrastructure (16 GB RAM). |
| **2. Zero Login** | Direct dashboard navigation | Explain that the system is deployed in **standalone analyst mode** with zero authentication barriers for seamless security audits. |
| **3. Model Scan** | Go to `/upload`, upload `samples/models/safe_model.pkl` | Highlight the **Zero Code Execution** guarantee: files are disassembled via static opcode inspection and never executed on the host runtime. |
| **4. Findings & Risk** | View `/scans/<id>` gauge and findings | Demonstrate the **0–10 MITRE ATLAS risk scoring** and categorical severity breakdown. |
| **5. PDF Export** | Click **"Export PDF Report"** | Show the generated remediation report with SHA-256 fingerprinting. |
| **6. Device Cache** | Refresh the browser | Show that the audit history remains intact in client-side device cache memory (`localStorage`). |

---

## 7. Troubleshooting Common Hugging Face Space Issues

### Issue 1: Space shows "Container port 7860 is not open"
- **Cause:** Uvicorn is bound to `127.0.0.1` or the wrong port.
- **Fix:** Ensure `backend/hf_app.py` runs with `--host 0.0.0.0 --port 7860`.

### Issue 2: `Permission denied: '/app/uploads'`
- **Cause:** Hugging Face runs Docker containers as user `1000` (non-root).
- **Fix:** Ensure your Dockerfile has:
  ```dockerfile
  RUN mkdir -p /app/uploads && chmod -R 777 /app/uploads
  ```

### Issue 3: "Out of memory" during `npm run build`
- **Cause:** Vite memory limits on alpine containers.
- **Fix:** The provided [`Dockerfile.hf`](file:///d:/MCA%203rd%20SEM/project/AISecGuard/Dockerfile.hf) uses lightweight multi-stage builds (`node:20-alpine`) which compiles cleanly under 600 MB.

### Issue 4: Updating the live Space with new changes
Whenever you make changes to your project, simply run:
```bash
git push space main
```
Hugging Face will automatically rebuild and redeploy the Space in the background.
