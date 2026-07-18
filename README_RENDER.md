Deployment to Render (Option B)

Overview

This repository contains two apps:
- Frontend: Vite + React app in `frontend/` (static build)
- Backend: FastAPI app in `backend/` (Docker)

Goal: Deploy both to Render with automatic GitHub-based deploys.

Steps

1. Create a GitHub repository and push this project to `main` branch.

2. Backend (Docker service)
   - In Render dashboard, create a new service -> "Web Service" -> "Docker"
   - Connect your GitHub repo and point "Dockerfile Path" to `backend/Dockerfile`.
   - Set the build command to none (Docker handles it).
   - Set the start command to the default (Docker CMD runs uvicorn).
   - Add environment variables if needed:
     - `PYTHONUNBUFFERED=1`
     - `CORS_ORIGINS` (optional) — set to your frontend URL once available.
   - Deploy.

3. Frontend (Static site)
   - In Render dashboard, create a new service -> "Static Site".
   - Connect your GitHub repo, set the root to `frontend` and publish directory to `frontend/dist`.
   - Build command: `npm ci --prefix frontend && npm run build --prefix frontend`.
   - Deploy.

4. Post-deploy
   - Configure `CORS_ORIGINS` on the backend to include your frontend URL (e.g., `https://your-site.onrender.com`).
   - If you want generated Excel files to persist, configure external storage (S3) and update `backend/app/core/config.py` to set `generated_dir` to a mounted filesystem or S3 integration.

Alternative: Use Render's `render.yaml` manifest in the repo root and import it while creating services.

CI/CD

Render auto-deploys on GitHub push. No additional Actions are necessary unless you want to customize build pipelines.

If you'd like, I can prepare a GitHub Actions workflow to build and test before pushing, or create a `Dockerfile` for frontend and deploy both as containers.
