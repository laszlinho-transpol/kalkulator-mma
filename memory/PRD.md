# BitumenOps – PRD

## Original problem statement
Polish SaaS for monitoring bitumen mass laying on road construction sites.

**Stage 1 (current): "Szkielet, Plansza i Rysowanie" / "Moje Projekty" module**
1. Interactive canvas with helper grid (default 0.5 m, configurable & pannable)
2. Crosshair cursor + hand (drag-pan) tool
3. Top menu zoom 33%–6400%
4. Area measurement tool – click polygon nodes, live m² in top-left measurement panel
5. Auto unique ID per closed Area in `MM/YY/XXXX` format (e.g. `05/26/0001`)
6. Modern UI, modular code

## Architecture
- **Backend** FastAPI + MongoDB (motor). All routes under `/api`. Atomic per-project counter via `find_one_and_update($inc)`. Shoelace area calculation.
- **Frontend** React 19 + react-router + Tailwind + shadcn/ui + sonner. Canvas drawing via HTML5 `<canvas>` with custom viewport hook (`useCanvasViewport`) using world-space meters (50 px/m @ 100%).
- **Persistence**: `projects` and `areas` collections; cascade delete on project removal.

## User personas
- Road-construction supervising engineer (primary user) – uses the canvas on-site / in office to measure paved sections and document them per project.

## Core requirements (static)
- Polish UI throughout
- No auth in Stage 1
- Per-project monotonic counter
- ID format = `MM/YY/XXXX` (current month/year at creation time)

## What's implemented (2026-02)
- [x] Backend API: projects CRUD, areas CRUD, atomic counter, shoelace area + perimeter, cascade delete
- [x] Dashboard "Moje Projekty": list, create dialog (name/location/description), delete with confirm, empty state
- [x] Workspace `/projects/:id`: full canvas with grid (auto-subdivide), crosshair cursor, hand pan tool, scroll-wheel zoom, +/- hotkeys, V/H/A tool hotkeys
- [x] Zoom toolbar: in/out/reset/dropdown presets (33%→6400%)
- [x] Configurable grid step (0.1 / 0.25 / 0.5 / 1 / 2 / 5 / 10 m)
- [x] Area drawing: click to add nodes, live polygon + live m² + live perimeter, finish via button / Enter / double-click / click-on-first-node, cancel via Esc, undo via Backspace
- [x] Auto ID `MM/YY/XXXX` per project
- [x] Sidebar with project info, total area, list of all areas with badge IDs, delete area
- [x] Status bar: live cursor X/Y in meters, grid step, active tool, areas count, zoom %
- [x] Full Polish UI, IBM Plex Sans + Chivo + IBM Plex Mono typography, amber/orange accent palette
- [x] 100% backend pytest + Playwright E2E passing

## Prioritized backlog (next stages)

### P0 – Stage 2 candidates
- [ ] Editing existing areas (move/insert/delete vertices)
- [ ] Snap-to-grid toggle during drawing
- [ ] Layers / categorization (e.g. SMA, AC, primer)
- [ ] PDF/CSV export of project + areas

### P1
- [ ] Tooth/asphalt mass calculator (m² × thickness × density → tonnage)
- [ ] Line/segment measurement tool ("Odcinek")
- [ ] Photo pins on canvas (geo-tag + thumbnails)
- [ ] Project sharing/collab (would require auth)

### P2
- [ ] Auth (JWT or Emergent Google)
- [ ] Background image / blueprint underlay with georeference
- [ ] Mobile/tablet polish (touch gestures)
- [ ] Multi-language (PL/EN)

## Notes for future agents
- Test credentials: not applicable (no auth)
- Backend test suite: `/app/backend/tests/test_bitumen_api.py`
- All Workspace data-testids defined in `/app/frontend/src/constants/testIds.js`
- Zoom scale: `50 * (zoom_percent/100)` px/m (`/app/frontend/src/lib/geometry.js`)
