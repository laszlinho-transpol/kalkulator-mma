# AGENTS.md

## Cursor Cloud specific instructions

### Product
**BitumenOps** — a Polish-language web app for measuring/monitoring bitumen (asphalt) laying on road-construction sites. Stack: FastAPI backend, React (CRA + CRACO) frontend, MongoDB. No auth in the current stage.

### Services (start these manually; they are not auto-started)
| Service | Dir | Start command | Port |
| --- | --- | --- | --- |
| MongoDB | — | `mongod --dbpath "$HOME/.mongodb/data" --bind_ip 127.0.0.1 --port 27017` | 27017 |
| Backend (FastAPI) | `backend/` | `.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001` | 8001 |
| Frontend (CRA/CRACO) | `frontend/` | `yarn start` | 3000 |

All three must run for an end-to-end flow. Start MongoDB first, then the backend, then the frontend.

### Non-obvious caveats
- **Python deps live in a venv at `backend/.venv`** (gitignored, persists in the snapshot). Always invoke backend tools via `backend/.venv/bin/...` (e.g. `.venv/bin/uvicorn`, `.venv/bin/pytest`). The system Python is PEP-668 externally-managed, so do not `pip install` globally.
- **`emergentintegrations` is NOT on PyPI** and is NOT imported by `server.py` (only listed in `requirements.txt`). It installs from the Emergent index: add `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` to any `pip install` against `requirements.txt`, otherwise the install fails.
- **Env files are required and gitignored** (so they persist via the snapshot, never committed):
  - `backend/.env`: `MONGO_URL=mongodb://localhost:27017`, `DB_NAME=bitumenops`, `CORS_ORIGINS=*`
  - `frontend/.env`: `REACT_APP_BACKEND_URL=http://localhost:8001`
  - If missing on a fresh machine, recreate them with the values above — `server.py` raises `KeyError` at import without `MONGO_URL`/`DB_NAME`, and the frontend API base URL breaks without `REACT_APP_BACKEND_URL`.
- **MongoDB data dir** is `$HOME/.mongodb/data` (writable by the agent user; the packaged `/var/lib/mongodb` is owned by the `mongodb` user and fails when `mongod` is run as the agent). systemd is unavailable, so run `mongod` directly (e.g. in a tmux session), not via `systemctl`.
- **`/app` symlink → `/workspace`**: some tests use hardcoded `/app/...` absolute paths. A symlink `/app -> /workspace` exists in the snapshot to make them work.

### Lint / Test / Build / Run
- **Backend tests** (hit the live API, so backend + MongoDB must be running):
  `cd backend && REACT_APP_BACKEND_URL=http://localhost:8001 .venv/bin/pytest tests/ -v`
- **Geometry unit test** (pure JS, needs the `/app` symlink): `node tests/test_geometry_unit.mjs`
- **Frontend lint** is run by the CRA/CRACO build itself (eslint-webpack-plugin); there is no standalone `eslint` config, so `npx eslint` fails — rely on `yarn start` / `yarn build` output instead.
- **Backend lint tools** (`black`, `flake8`, `isort`, `mypy`) are installed but the repo ships no config for them; treat their default-style output as advisory, not a gate.
- Frontend has no `lint` script; scripts are `start` / `build` / `test` (`craco`).
