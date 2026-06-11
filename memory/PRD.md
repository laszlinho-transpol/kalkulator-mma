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

## Stage 2 implemented (2026-02)
- [x] **Edycja obszarów (tool E)**: zaznaczanie kliknięciem, drag wierzchołków (białe uchwyty), wstawianie węzła kliknięciem zielonego + na środku segmentu, Shift+klik usuwa węzeł (min 3 area / 2 line), PATCH zapis na pointerup
- [x] **Snap-to-grid (S)**: toggle w pasku narzędzi + hotkey S; Shift wymusza precyzję; zielony dot pokazuje snap; status bar pokazuje WŁ/WYŁ
- [x] **Warstwy (kategorie)**: stała lista SMA / AC W / AC P / Beton / Inne z kolorami; layer picker przy zaznaczonym obszarze; filtry warstw w sidebarze (chipy z licznikami); backend normalizuje uppercase i przypisuje kolor wg LAYER_COLORS
- [x] **Eksport PDF/CSV**: dialog z 2 opcjami; PDF A4 landscape ze snapshotem planszy + tabela obszarów + tabela odcinków (jsPDF + autoTable); CSV z BOM dla Excela, separator `;`
- [x] **Narzędzie Odcinek (L)**: polilinia, live długość, suma długości w sidebarze, auto ID `L-MM/YY/XXXX` per projekt
- [x] 100% backend pytest (28/28) + 100% Playwright E2E (39/39)

## Stage 3 implemented (2026-02)
- [x] **Nowa lista warstw** zgodna z polskimi normami: SMA, AC8S, AC11S, AC11W, AC16W, AC22P, KŁSM (zamiast BETON), INNE — każda z domyślną grubością i gęstością
- [x] **Kalkulator tonażu LIVE** — każdy obszar ma `thickness_cm` (cm), `density_t_m3`, `status` (planned/in_progress/done); tonaż = m² × grubość × gęstość
- [x] **Tab "Tonaż"** w sidebarze: agregacja per-warstwa z paskiem postępu (zielony=wykonane, pomarańczowy=w trakcie); podsumowanie globalne PLAN./WYKON./DOSTAW.
- [x] **Tab "Dostawy" (WZ)** — dodawanie wpisów dostaw (warstwa, tonaż, nr WZ, notatka); porównanie dostarczono vs wykonane (różnica % i ton)
- [x] **Inspector wybranego obszaru** — picker warstwy + status, edytowalne pola grubości/gęstości; live przeliczenie tonażu
- [x] **Podkład planszy (PNG/JPG/PDF)** — upload z konwersją PDF→PNG (pdfjs-dist), opacity slider, skala (m/px), rotacja, widoczność; dane w MongoDB kolekcji `backgrounds` jako data URL
- [x] **Kalibracja 2-punktowa** — kliknij 2 znane punkty + wpisz odległość w metrach → automatyczne dopasowanie skali podkładu
- [x] **Undo/Redo** (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z) — 50 akcji w pamięci sesji dla: tworzenia/usuwania obszarów+odcinków+dostaw, edycji punktów, zmiany warstwy/statusu/grubości/gęstości
- [x] **Eksport PDF/CSV** rozszerzony o tabelę "Tonaż wg warstwy" i sekcję "Dostawy (WZ)"
- [x] **Testy**: 44/44 backend pytest (Stage 1+2+3 razem) — 100% pass

## Prioritized backlog (next stages)

### P0 – Stage 4 candidates
- [ ] Notatki + zdjęcia jako piny na planszy (object storage dla zdjęć)
- [ ] Multi-projekt: kopiowanie obszarów/szablonów między projektami
- [ ] Persystencja undo/redo (po reload też dostępne)
- [ ] Eksport DXF/DWG (CAD)
- [ ] Auth (JWT lub Google) dla kolaboracji

### P1
- [ ] Historia statusów obszaru (kiedy przeszedł z planned → done) — timeline
- [ ] Powiadomienia / progress alerts (np. "AC11S wykonano 90% — gotowy do odbioru")
- [ ] Pomiar kąta i poziomicy
- [ ] Walidacja dostarczono vs wykonano z konfigurowalnym progiem alertu

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
