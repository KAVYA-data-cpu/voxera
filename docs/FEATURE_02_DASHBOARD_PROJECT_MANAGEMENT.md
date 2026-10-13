# Feature 02: Dashboard & Project Management

## 1. Feature Overview

Feature 2 builds on top of the authentication system from Feature 1 to give authenticated users a full project management experience. Users can create, view, rename, duplicate, delete, save, and filter 3D projects — all without any actual 3D model generation yet (that is Feature 3).

---

## 2. Why This Feature Is Needed

A user who logs in needs somewhere to go. The dashboard is the **home base** — it shows:
- Who is logged in and their stats
- Their recent projects at a glance
- A path to create new projects

Without a project management system, there is nothing for the AI features to operate on. Every future feature (AI generation, printability analysis, community sharing) depends on projects existing and belonging to users.

---

## 3. Architecture Overview

```
React UI (TypeScript)
    │
    ├── pages/  (DashboardPage, ProjectsPage, ProjectDetailPage, SavedPage)
    ├── components/  (ProjectCard, CreateProjectModal, ConfirmDialog)
    └── services/projectService.ts
            │
            ▼  HTTP (Axios + JWT Bearer token)
FastAPI (Python)
    │
    ├── routers/projects.py  (all project endpoints)
    ├── auth/dependencies.py  (get_current_user — JWT verification)
    └── schemas.py  (ProjectCreate, ProjectUpdate, ProjectResponse)
            │
            ▼  SQLAlchemy ORM
PostgreSQL
    └── projects table
    └── saved_projects table
```

---

## 4. Frontend Architecture

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| `DashboardPage` | `/dashboard` | Welcome + recent projects + stats |
| `ProjectsPage` | `/projects` | Full CRUD list with search/filter/sort |
| `ProjectDetailPage` | `/projects/:id` | Single project workspace (placeholder) |
| `SavedPage` | `/saved` | Bookmarked projects |

### Components

| Component | Purpose |
|-----------|---------|
| `ProjectCard` | Displays one project with context menu (rename/delete/duplicate/save) |
| `CreateProjectModal` | Form modal to create a new project |
| `ConfirmDialog` | Reusable confirmation dialog (used for delete) |

### Services

| File | Purpose |
|------|---------|
| `src/services/projectService.ts` | All project API calls centralized here |

---

## 5. Backend Architecture

### Router: `routers/projects.py`

All endpoints live under the `/projects` prefix. Every endpoint uses `Depends(get_current_user)` which:
1. Reads the `Authorization: Bearer <token>` header
2. Decodes the JWT
3. Looks up the user in the database
4. Returns the `User` object (or raises 401)

This means **no project endpoint can be called without a valid login**.

### Helper: `get_project_or_404`

```python
def get_project_or_404(project_id, user_id, db):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404)
    if project.user_id != user_id:   # OWNERSHIP CHECK
        raise HTTPException(404)     # 404, not 403, to avoid leaking existence
    return project
```

This helper is used by `GET /projects/:id`, `PATCH`, `DELETE`, and `POST /duplicate`. It centralises the security check.

### Helper: `enrich_project`

The `is_saved` field is **not stored** in the `projects` table. It depends on which user is asking. So for every project response, we query `saved_projects` to check if this user bookmarked it, then add `is_saved: bool` to the dict.

---

## 6. Database Architecture

### Projects Table

```sql
CREATE TABLE projects (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  thumbnail_url VARCHAR(500),
  status       VARCHAR(20) NOT NULL DEFAULT 'draft',
  model_file   VARCHAR(500),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ix_projects_user_id ON projects(user_id);
```

**Why `status` is `VARCHAR` not `ENUM`:** PostgreSQL ENUMs require a `ALTER TYPE` migration to add new values. Using a string lets us add `generating`, `completed` etc. without touching the DB. Validation happens in Pydantic.

### Saved Projects Table

```sql
CREATE TABLE saved_projects (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  project_id INTEGER NOT NULL REFERENCES projects(id),
  saved_at   TIMESTAMPTZ DEFAULT NOW()
);
```

This is a **join table** — it links users to projects they have bookmarked. One user can bookmark many projects; one project can be bookmarked by many users (many-to-many).

### Relationships Diagram

```
users ─────────────── projects
  │  (one-to-many)       │
  │                      │
  └── saved_projects ────┘
      (many-to-many join)
```

---

## 7. API Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/projects` | ✅ JWT | List own projects (search/filter/sort via query params) |
| `POST` | `/projects` | ✅ JWT | Create a new project |
| `GET` | `/projects/saved` | ✅ JWT | Get bookmarked projects |
| `GET` | `/projects/{id}` | ✅ JWT | Get one project (must be owner) |
| `PATCH` | `/projects/{id}` | ✅ JWT | Rename / update (must be owner) |
| `DELETE` | `/projects/{id}` | ✅ JWT | Delete (must be owner) |
| `POST` | `/projects/{id}/duplicate` | ✅ JWT | Copy project (must be owner) |
| `POST` | `/projects/{id}/save` | ✅ JWT | Bookmark project |
| `DELETE` | `/projects/{id}/save` | ✅ JWT | Remove bookmark |

### Query Parameters for `GET /projects`

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `search` | string | `drone` | Case-insensitive name search |
| `status` | string | `ready` | Filter by status |
| `sort` | string | `name_asc` | Sort order (see values below) |

**Sort values:** `updated_desc`, `updated_asc`, `created_desc`, `created_asc`, `name_asc`, `name_desc`

---

## 8. Project CRUD Explained

### Create
```
React: POST /projects { name, description }
   ↓
FastAPI: Pydantic validates → creates Project row with user_id = current_user.id
   ↓
PostgreSQL: INSERT INTO projects ...
   ↓
FastAPI: returns ProjectResponse (with is_saved=False)
   ↓
React: prepends new project to local state (no full re-fetch)
   ↓
React Router: navigates to /projects/{id}
```

### Delete
```
React: user clicks Delete → ConfirmDialog shown
   ↓
User clicks "Delete" in dialog
   ↓
React: DELETE /projects/{id}
   ↓
FastAPI: get_project_or_404 verifies ownership
   ↓
SQLAlchemy: db.delete(project) + cascade deletes saved_projects rows
   ↓
PostgreSQL: DELETE FROM projects WHERE id=? AND user_id=?
   ↓
FastAPI: 204 No Content
   ↓
React: filters project out of local state list
```

### Duplicate
```
React: POST /projects/{id}/duplicate
   ↓
FastAPI: verifies ownership → creates new Project with "Copy of {name}"
   ↓
Returns new ProjectResponse
   ↓
React: prepends copy to project list
```

---

## 9. Authentication Flow (reminder from Feature 1)

```
User logs in → receives JWT token
Every subsequent request includes:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

FastAPI reads token → decodes → extracts user_id
→ fetches User from DB → passes to route handler
```

---

## 10. Authorization Flow (Feature 2 addition)

Authentication = "who are you?" (JWT verification)
Authorization = "are you allowed to do this?" (ownership check)

```python
# Example: DELETE /projects/{id}
def delete_project(project_id, current_user, db):
    project = get_project_or_404(project_id, current_user.id, db)
    # ↑ This raises 404 if project doesn't belong to current_user
    db.delete(project)
    db.commit()
```

**Why 404 instead of 403 Forbidden?**
If we return 403, the attacker knows the project EXISTS (just not accessible). If we return 404, they can't distinguish "doesn't exist" from "belongs to someone else" — this prevents **IDOR (Insecure Direct Object Reference)** attacks.

---

## 11. Search / Filter / Sort

**Decision: Backend-side filtering**

The backend applies `WHERE` clauses and `ORDER BY` directly in SQL. Reasons:
- Database indexes make filtering fast even with millions of rows
- Frontend filtering would require loading ALL projects first
- Search is case-insensitive using `func.lower()` in SQLAlchemy

**Debouncing on frontend:**
The search input waits 300ms after the user stops typing before sending the API request. This prevents sending a request on every single keypress (e.g., typing "drone" would send 5 requests without debouncing).

```typescript
const timer = setTimeout(() => {
  fetchProjects();
}, search ? 300 : 0);
return () => clearTimeout(timer); // cancel if user types again
```

---

## 12. UI States

Every data-driven section implements four states:

| State | What user sees | When |
|-------|---------------|------|
| **Loading** | Animated skeleton boxes | While API request is in-flight |
| **Empty** | Icon + message + CTA button | When no projects exist or no matches |
| **Error** | Red message + retry button | When API request fails |
| **Success** | Actual project cards | When data loads successfully |

---

## 13. Component Structure

```
ProjectsPage
├── CreateProjectModal (modal, shown on button click)
├── ConfirmDialog (modal, shown on delete request)
└── ProjectCard (×N, one per project)
    ├── Thumbnail area (clickable → navigate to /projects/:id)
    ├── Inline rename input (shown when isRenaming=true)
    ├── Status badge
    └── MoreVertical button → dropdown menu
        ├── Open
        ├── Rename
        ├── Duplicate
        ├── Save / Unsave
        └── Delete (red, shows ConfirmDialog)
```

---

## 14. Data Flow (Full Example: User creates a project)

```
1. User clicks "New Project" button in ProjectsPage
2. showCreateModal state → true → <CreateProjectModal /> renders

3. User types name "My Drone v1", clicks "Create Project"
4. handleSubmit() fires
5. createProject({ name: "My Drone v1" }) called from projectService.ts
6. api.post('/projects', { name: "My Drone v1" }) sends HTTP POST
   with Authorization: Bearer <token> header

7. FastAPI receives request
8. oauth2_scheme extracts token from header
9. get_current_user() decodes JWT → user_id=5
10. ProjectCreate Pydantic schema validates { name: "My Drone v1" }
11. New Project row created: { id:42, user_id:5, name:"My Drone v1", status:"draft" }
12. 201 Created response: ProjectResponse JSON

13. React receives response: newProject = { id:42, name:"My Drone v1", ... }
14. onCreate(newProject) called in parent (ProjectsPage)
15. projects state updated: [newProject, ...existingProjects]
16. Modal closes
17. React re-renders ProjectsPage → new card appears at top
```

---

## 15. File-by-File Explanation

### Backend

| File | What changed | Why |
|------|-------------|-----|
| `models.py` | Status changed to `String(20)`, `model_file` column added | Avoid ENUM migration issues; prepare for future 3D file storage |
| `schemas.py` | Added `ProjectCreate`, `ProjectUpdate`, expanded `ProjectResponse` with `is_saved` and `model_file` | Full CRUD requires input validation schemas; `is_saved` is a computed field |
| `routers/projects.py` | Completely rewritten with 9 endpoints | Feature 1 only had GET list + GET saved; Feature 2 adds full CRUD |

### Frontend

| File | What changed | Why |
|------|-------------|-----|
| `types/index.ts` | `Project` expanded with `is_saved`, `model_file`, all 6 statuses; new `CreateProjectData`, `UpdateProjectData`, `ProjectFilters` types | TypeScript types must match the backend schemas |
| `services/projectService.ts` | **New file** | Centralises all project API calls (DRY principle) |
| `components/ProjectCard.tsx` | Rewritten with context menu, inline rename, 6 status configs | Feature 1 card was display-only; Feature 2 needs full interaction |
| `components/CreateProjectModal.tsx` | **New file** | Feature 2 create flow |
| `components/ConfirmDialog.tsx` | **New file** | Reusable confirmation dialog for destructive actions |
| `pages/ProjectsPage.tsx` | Rewritten — real API, CRUD, search/filter/sort, all states | Feature 1 was placeholder-only |
| `pages/ProjectDetailPage.tsx` | **New file** | `/projects/:id` workspace (placeholder for Feature 3) |
| `pages/DashboardPage.tsx` | Updated — active "New Project" button, real project data | Feature 1 had a disabled button and placeholder data |
| `pages/SavedPage.tsx` | Updated — real API + unsave action | Feature 1 was placeholder-only |
| `App.tsx` | Added `/projects/:id` route | New dynamic route needed |
| `index.css` | Added `.menu-item` class | ProjectCard context menu needs consistent item styling |

---

## 16. Libraries Used

| Library | Purpose | New in F2? |
|---------|---------|-----------|
| React | UI rendering | No |
| TypeScript | Type safety | No |
| Tailwind CSS | Styling | No |
| React Router | Routing + `useParams` for `/projects/:id` | `useParams` is new |
| Axios (`api.ts`) | HTTP requests | No |
| lucide-react | Icons | No (new icons used) |
| FastAPI | API framework | No |
| SQLAlchemy | ORM | No (new query patterns) |
| Pydantic | Validation | No (new schemas) |
| python-jose | JWT | No |
| passlib/bcrypt | Password hashing | No |

**No new libraries were installed for Feature 2.**

---

## 17. Testing Checklist

### API Tests (use FastAPI docs at http://localhost:8000/docs)

- [ ] `POST /projects` — create project → 201
- [ ] `POST /projects` — empty name → 422
- [ ] `GET /projects` — returns only current user's projects
- [ ] `GET /projects?search=drone` — filters correctly
- [ ] `GET /projects?status=ready` — filters correctly
- [ ] `GET /projects?sort=name_asc` — sorts A→Z
- [ ] `GET /projects/{id}` — own project → 200
- [ ] `GET /projects/{id}` — other user's project → 404
- [ ] `PATCH /projects/{id}` — rename → updated name returned
- [ ] `DELETE /projects/{id}` → 204
- [ ] `POST /projects/{id}/duplicate` — creates "Copy of ..." project
- [ ] `POST /projects/{id}/save` — bookmark created
- [ ] `DELETE /projects/{id}/save` — bookmark removed
- [ ] All endpoints without token → 401

### Frontend Tests (manual in browser)

- [ ] Dashboard loads with real project count
- [ ] "New Project" button opens modal
- [ ] Create project — appears in list
- [ ] Create project with empty name — validation error shown
- [ ] Project card 3-dot menu appears on hover
- [ ] Rename inline — Enter saves, Escape cancels
- [ ] Delete — confirmation dialog appears; confirm → card removed
- [ ] Duplicate — "Copy of ..." appears at top
- [ ] Save project — bookmark icon fills
- [ ] Unsave project — bookmark icon empties
- [ ] Navigate to /projects/:id — workspace page loads
- [ ] /projects/:id for non-existent ID — error state shown
- [ ] Search filters project list
- [ ] Status filter pills work
- [ ] Sort dropdown changes order
- [ ] Clear filters button in empty state works
- [ ] Logout and try /projects → redirected to /login
- [ ] Refresh page on /projects/:id — project still loads (token persists)

---

## 18. Security Concepts

### IDOR (Insecure Direct Object Reference)
If `/projects/{id}` only used the `id` from the URL without checking ownership, any logged-in user could access any project by guessing IDs (1, 2, 3...). The `get_project_or_404` helper prevents this by checking `project.user_id == current_user.id`.

### Why backend security, not just frontend?
The frontend can hide buttons, but it cannot prevent raw HTTP requests. A user can open DevTools → Network → copy a fetch request → change the `id` parameter → send it. Only the backend can enforce ownership.

### Input Validation
- Pydantic validates all inputs before the route handler runs
- Name: 2–200 characters, cannot be empty
- Description: max 2000 characters
- Status: must be one of the six allowed values

### SQL Injection Prevention
SQLAlchemy uses **parameterized queries** — values are never concatenated into SQL strings. Even if a user sends `'; DROP TABLE projects; --` as a project name, SQLAlchemy passes it as a safe parameter.

---

## 19. Common Bugs & Debugging

### Bug: "Project not found" on own project
**Cause:** JWT expired or token not sent in header.
**Debug:** Check browser Network tab → request headers → `Authorization` present?
**Fix:** Log out and log back in to get a fresh token.

### Bug: `/projects/saved` returns 404 before `/projects/:id`
**Cause:** FastAPI matched "saved" as a project ID (string, not int).
**Fix:** The `/projects/saved` route MUST be defined BEFORE `/projects/{project_id}` in the router. Already fixed in the code.

### Bug: `model_file` column missing from DB
**Cause:** The table was created by Feature 1 without the `model_file` column.
**Fix:** Drop and recreate the `projects` table, or run:
```sql
ALTER TABLE projects ADD COLUMN model_file VARCHAR(500);
```

### Bug: Old `project_status_enum` PostgreSQL type conflict
**Cause:** Feature 1 created a PostgreSQL ENUM type named `project_status_enum`. Feature 2 uses a plain `String` column but the ENUM type still exists.
**Fix:** The table column is now `VARCHAR(20)` — the ENUM type in the DB is unused but harmless. If you see errors, run:
```sql
DROP TYPE IF EXISTS project_status_enum;
```

### Bug: 422 Unprocessable Entity on create
**Cause:** Request body is missing required field `name` or fails validation.
**Debug:** Look at the `detail` array in the 422 response — it lists exactly which field failed and why.

### Bug: `is_saved` always `false`
**Cause:** The `enrich_project` helper queries `saved_projects` but the project ID doesn't match.
**Debug:** Check the `saved_projects` table directly in psql:
```sql
SELECT * FROM saved_projects WHERE user_id = 1;
```

---

## 20. Debugging Methods

1. **FastAPI Swagger UI:** `http://localhost:8000/docs` — test every endpoint directly with built-in auth.
2. **Browser DevTools → Network:** Inspect every HTTP request, response headers, and body.
3. **Browser DevTools → Console:** JavaScript errors appear here.
4. **`console.log` in React:** Add temporary `console.log(projects)` in useEffect to see raw API data.
5. **psql / pgAdmin:** Query tables directly to verify DB state.
6. **FastAPI logs:** Uvicorn prints every request in the terminal — check for 4xx/5xx status codes.

---

## 21. Interview Questions

**Q: What is CRUD?**
A: Create, Read, Update, Delete — the four basic operations on data. Feature 2 implements full CRUD for projects.

**Q: What is the difference between PATCH and PUT?**
A: PUT replaces the entire resource; PATCH updates only the fields you send. We use PATCH so renaming a project doesn't accidentally erase its description.

**Q: What is IDOR and how do you prevent it?**
A: Insecure Direct Object Reference — when a user accesses another user's data by guessing a URL parameter. Prevent it by checking ownership on the backend: `project.user_id == current_user.id`.

**Q: Why is filtering done on the backend instead of the frontend?**
A: Database indexes make SQL filtering efficient. Frontend filtering requires loading all data first, which wastes bandwidth and is slow for large datasets.

**Q: What is debouncing and why is it used for search?**
A: Debouncing delays a function call until the user stops triggering it. Without it, typing "drone" would fire 5 API requests (one per letter). With 300ms debounce, only one request fires after the user finishes typing.

**Q: What is an optimistic update?**
A: Updating the UI immediately before the API call completes, giving instant feedback. If the API fails, roll back to the previous state. Used in the save/unsave toggle.

**Q: What is a service layer?**
A: A layer between UI components and API calls. `projectService.ts` centralises all HTTP calls so components don't need to know the URL structure, making the code easier to maintain.

**Q: What is a dynamic route?**
A: A URL pattern with a variable segment: `/projects/:id`. React Router captures `:id` from the URL and makes it available via `useParams()`.

**Q: How does React know which component to re-render when data changes?**
A: React tracks state with `useState`. When you call `setProjects(newList)`, React compares old and new state and re-renders only the affected components.

**Q: What is the N+1 query problem?**
A: Fetching a list of N items with 1 query, then making N more queries to fetch related data for each item. Solution: `joinedload` in SQLAlchemy fetches all related data in one SQL JOIN.

---

## 22. Viva Questions

**Q: Walk me through what happens when a user clicks "New Project".**
A: (See Section 14 — full data flow walkthrough)

**Q: How does the backend know which user's projects to return?**
A: The JWT token in the Authorization header encodes the user ID. `get_current_user()` decodes it, looks up the user, and the route filters `WHERE user_id = current_user.id`.

**Q: What prevents User A from deleting User B's project?**
A: The `get_project_or_404` helper checks `project.user_id == current_user.id`. If they don't match, it raises 404 — same as if the project didn't exist.

**Q: Why does your ProjectCard use callback props instead of making API calls itself?**
A: Lifting state up — the page (parent) owns the list of projects, so it should handle updates. If the card made the API call itself, the parent wouldn't know the list changed. Callbacks let the parent update its state after the action completes.

**Q: What is `exclude_unset=True` in Pydantic?**
A: It returns only fields that were explicitly provided in the request body, ignoring fields that were left at their default (None). This implements true PATCH semantics.

---

## 23. Revision Checklist Before Feature 3

### React
- [ ] `useState` — storing component data
- [ ] `useEffect` — side effects (fetching, event listeners)
- [ ] `useCallback` — memoizing functions to avoid infinite loops
- [ ] `useParams` — reading URL parameters
- [ ] Controlled inputs — `value` + `onChange`
- [ ] Lifting state up — parent manages shared data
- [ ] Conditional rendering — `{condition && <Component />}`
- [ ] Lists and keys — `{items.map(item => <Card key={item.id} />)}`

### TypeScript
- [ ] `interface` — object shape definitions
- [ ] `type` — union types (`'draft' | 'ready' | ...`)
- [ ] Generic types — `useState<Project[]>([])`
- [ ] Optional properties — `description?: string`

### Backend
- [ ] `Depends()` — FastAPI dependency injection
- [ ] Path vs query parameters
- [ ] `model_dump(exclude_unset=True)` — PATCH semantics
- [ ] HTTP status codes: 200, 201, 204, 400, 401, 403, 404, 422

### Database
- [ ] Foreign keys and relationships
- [ ] `cascade="all, delete-orphan"` — automatic cleanup
- [ ] `joinedload` — preventing N+1 queries
- [ ] `func.lower()` — case-insensitive search

### Security
- [ ] IDOR — Insecure Direct Object Reference
- [ ] Ownership checks on every write/read endpoint
- [ ] 404 vs 403 — when to use which

---

## 24. What Feature 3 Should Build On Top Of This

Feature 3 will be **AI 3D Model Generation**. It will need:

1. **Backend additions:**
   - `POST /projects/{id}/generate` — trigger AI generation
   - Update `status` to `generating` → poll for completion
   - Background task (FastAPI `BackgroundTasks`) to run AI generation
   - Update `model_file` and `thumbnail_url` when generation completes
   - New `Notification` when generation finishes

2. **Frontend additions:**
   - The placeholder workspace in `ProjectDetailPage` becomes a real 3D viewer
   - Generation form: prompt input, style options
   - Status polling: `useEffect` with interval to check generation progress
   - Progress indicator while status is `generating` or `processing`

3. **New dependencies (likely):**
   - Three.js or React Three Fiber — 3D rendering in browser
   - AI API (OpenAI, Meshy, or similar) — actual 3D generation
   - Background task queue (Celery/Redis) — for long-running generation
