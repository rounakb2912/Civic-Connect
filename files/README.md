# CivicConnect backend (starter)

Node.js + Express. Works out of the box with an in-memory store so the frontend runs immediately.
Replace `db.js` with your real database when ready.

## Run
```
cd backend
npm install
cp .env.example .env      # then edit JWT_SECRET and ADMIN_KEY
npm run dev
```
Open `index.html` with VS Code Live Server (https://civic-connect-3t8c.onrender.com/). Set `CLIENT_ORIGIN` in `.env` to that address.
If you change the API address, edit `js/config.js`.

## Endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/health | – | Health check |
| POST | /api/auth/register | – | `{name,email,password}` → `{token,user}` |
| POST | /api/auth/login | – | `{email,password}` → `{token,user}` |
| GET | /api/auth/me | Bearer | Current user |
| GET | /api/initiatives | – | Problems and solutions per initiative |
| POST | /api/complaints | optional | Save complaint record, returns reference number |
| GET | /api/complaints/mine | Bearer | Logged-in user's complaints |
| GET | /api/complaints/track/:reference | – | Public status and timeline |
| PATCH | /api/complaints/:reference/status | `x-admin-key` | Set status: Submitted / In progress / Resolved |
| POST | /api/feedback | – | `{initiativeKey,helpful,comment}` |
| GET | /api/stats | – | Counts for the stats strip |

## Your to-do list
1. Replace `db.js` with a real database (users, complaints, feedback, initiatives).
2. Build an admin screen that calls the PATCH status endpoint.
3. Add email or SMS notifications when status changes.
4. Add HTTPS, a strong `JWT_SECRET`, and a locked-down `CLIENT_ORIGIN` before deploying.
5. Complaint details contain personal text, so decide retention and privacy rules before going live.
