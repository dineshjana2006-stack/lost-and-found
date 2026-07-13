# ReConnect – Smart Digital Lost & Found Network

> A modern, full-stack Lost & Found platform built with **Python Flask** (backend) and **React + Vite** (frontend, coming next).

---

## 📋 Project Overview

ReConnect helps users report lost and found items and intelligently discovers potential matches using a smart similarity engine. Built as a portfolio-grade, production-quality project.

---

## 🏗️ Project Structure

```
reconnect/
├── backend/            # ✅ Python Flask REST API  [COMPLETE]
│   ├── api/            # Route blueprints
│   ├── services/       # Business logic & matching engine
│   ├── utils/          # Helpers (validation, pagination, responses)
│   ├── storage/        # JSON flat-file persistence
│   ├── uploads/        # Uploaded images
│   ├── tests/          # pytest test suite
│   ├── app.py          # Entry point
│   └── README.md       # Full API docs
│
├── frontend/           # ⏳ React + Vite + Tailwind CSS  [NEXT PHASE]
├── docs/               # ⏳ Project documentation        [FUTURE]
└── assets/             # ⏳ Design assets                [FUTURE]
```

---

## 🚀 Getting Started

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1     # Windows
# source .venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
python app.py
```

API available at: **http://localhost:5000**

Full API documentation: [`backend/README.md`](./backend/README.md)

### Run Tests

```bash
cd backend
pytest tests/ -v
```

---

## ✨ Features

### Backend (Phase 1 – Complete)
- ✅ Full CRUD for Lost & Found items
- ✅ Multipart image upload with auto-resizing
- ✅ 7-factor smart matching engine (confidence scores)
- ✅ Advanced search with 6 filter parameters
- ✅ Live search suggestions
- ✅ Pagination & sorting
- ✅ Platform statistics API
- ✅ Thread-safe JSON persistence
- ✅ Input validation with field-level errors
- ✅ 40+ automated tests

### Frontend (Phase 2 – Planned)
- ⏳ React + Vite + Tailwind CSS
- ⏳ Framer Motion animations
- ⏳ Dark/light mode
- ⏳ Glassmorphism UI

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/lost/` | List / create lost items |
| GET/PUT/DELETE | `/api/lost/<id>` | Get / update / delete |
| GET/POST | `/api/found/` | List / create found items |
| GET/PUT/DELETE | `/api/found/<id>` | Get / update / delete |
| GET | `/api/search/` | Global search |
| GET | `/api/search/suggestions` | Live suggestions |
| GET | `/api/search/categories` | Category counts |
| GET | `/api/match/lost/<id>` | Matches for lost item |
| GET | `/api/match/found/<id>` | Matches for found item |
| GET | `/api/match/preview/<id>` | Top-3 match preview |
| GET | `/api/stats/` | Full statistics |
| GET | `/api/stats/summary` | Dashboard summary |
| GET | `/uploads/images/<file>` | Serve image |

---

## 👨‍💻 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, Flask 3.x |
| CORS | Flask-Cors |
| Images | Pillow |
| Server (prod) | Gunicorn |
| Frontend | React, Vite, Tailwind, Framer Motion *(coming)* |
| Storage | JSON flat-files (demo) |
| Tests | pytest, pytest-flask |

---

## 📄 License

MIT – Free to use for educational and portfolio purposes.
