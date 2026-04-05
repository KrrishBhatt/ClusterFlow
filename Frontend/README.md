# ClusterFlow

**Together, We Compute**

A distributed dataset processing platform. The host uploads a CSV, it gets split across all room members, each worker processes their chunk, and the host downloads the final result.

---

## Project Structure

```
ClusterFlow/
├── Backend/        Node.js + Express + MongoDB API
└── frontend/       React + Vite frontend
```

---

## Prerequisites

- Node.js v18 or higher
- A free MongoDB Atlas account → https://www.mongodb.com/atlas

---

## Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```
MONGO_URI=mongodb+srv://<your-username>:<your-password>@cluster0.xxxxx.mongodb.net/distributed_system
PORT=3000
JWT_SECRET=any_long_random_string_here
```

Create the uploads folder:

```bash
mkdir uploads
```

Start the backend:

```bash
npm start
# or for development with auto-restart:
npm run dev
```

Backend runs on **http://localhost:3000**

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## How to Use

1. **Register** — create an account on the landing page
2. **Add Friends** — go to Friends, search by User ID (e.g. `CF-482910`), send a request
3. **Create a Room** — go to Rooms, click Create New Room, share the Room ID with friends
4. **Invite Friends** — inside the room, select a friend from the dropdown and send invite
5. **Friends Accept** — friends go to Rooms page, accept the invite, enter the room
6. **Upload Dataset** — host uploads a CSV, it splits into chunks (one per member)
7. **Workers Fetch** — each worker clicks "Fetch My Chunk" to get their assigned rows
8. **Workers Submit** — workers click "Submit Chunk" when done
9. **Download Result** — host clicks "Fetch and Download Result" when all chunks are complete

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios |
| Backend | Node.js, Express 4, MongoDB, Mongoose |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File handling | Multer (upload), csv-parser (read), json2csv (export) |
| Fonts | Space Grotesk, Merriweather, Inter, JetBrains Mono |

---

## Environment Variables (Backend)

| Variable | Description |
|---|---|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `PORT` | Port for the backend server (default: 3000) |
| `JWT_SECRET` | Any random secret string for signing tokens |

---

## Notes

- The `uploads/` folder is git-ignored. Create it manually: `mkdir Backend/uploads`
- Never commit your `.env` file — it contains your database password
- Each person needs their own account but can share the same MongoDB database