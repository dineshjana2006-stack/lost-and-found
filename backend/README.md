# ReConnect Backend – API Reference & Developer Guide

> **Python Flask REST API** | Port `5000` | JSON flat-file storage

---

## 📦 Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Flask 3.x |
| CORS | Flask-Cors |
| Image processing | Pillow |
| WSGI (prod) | gunicorn |
| Testing | pytest + pytest-flask |
| Date parsing | python-dateutil |

---

## 🗂️ Project Structure

```
backend/
├── app.py                  # Application factory & entry point
├── config.py               # Centralised configuration
├── requirements.txt        # Python dependencies
│
├── api/                    # Route blueprints
│   ├── __init__.py         # Blueprint registration
│   ├── lost_routes.py      # /api/lost  (CRUD)
│   ├── found_routes.py     # /api/found (CRUD)
│   ├── search_routes.py    # /api/search
│   ├── match_routes.py     # /api/match
│   └── stats_routes.py     # /api/stats
│
├── services/               # Business logic
│   ├── data_service.py     # Thread-safe JSON persistence
│   ├── image_service.py    # Upload, resize, save
│   └── matching_engine.py  # 7-factor similarity scoring
│
├── utils/                  # Shared utilities
│   ├── response_helpers.py # Standard API envelope
│   ├── validators.py       # Input validation
│   └── pagination.py       # List slicing + metadata
│
├── storage/
│   ├── lost_items.json     # Lost item store (seeded with 8 items)
│   └── found_items.json    # Found item store (seeded with 10 items)
│
├── uploads/
│   └── images/             # Uploaded image files
│
└── tests/
    ├── conftest.py          # Fixtures & sample data
    ├── test_lost_routes.py
    ├── test_found_routes.py
    ├── test_matching_engine.py
    └── test_search_routes.py
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Python 3.10+
- pip

### 2. Set up virtual environment

```bash
# Navigate to the backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Activate (macOS / Linux)
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run development server

```bash
python app.py
```

Server starts at: **http://localhost:5000**

### 5. Run tests

```bash
pytest tests/ -v
```

---

## 🔌 REST API Reference

### Base URL
`http://localhost:5000`

### Response Envelope

All responses follow this structure:

```json
// Success
{
  "success": true,
  "message": "...",
  "data": { ... },
  "meta": { ... }   // pagination responses only
}

// Error
{
  "success": false,
  "message": "...",
  "errors": [ { "field": "...", "message": "..." } ]  // validation errors only
}
```

---

### 🔴 Lost Items

#### `GET /api/lost/`
List lost items with filters and pagination.

| Query Param | Type | Description |
|-------------|------|-------------|
| `q` | string | Keyword search (name, desc, location, brand) |
| `category` | string | Filter by category |
| `color` | string | Filter by color (contains) |
| `brand` | string | Filter by brand (contains) |
| `location` | string | Filter by location (contains) |
| `status` | string | `active` \| `resolved` \| `archived` |
| `sort` | string | `newest` (default) \| `oldest` \| `name` |
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (default: 12, max: 50) |

```bash
curl "http://localhost:5000/api/lost/?category=Electronics&page=1&page_size=5"
```

#### `POST /api/lost/`
Report a new lost item. Accepts `application/json` or `multipart/form-data`.

```bash
curl -X POST http://localhost:5000/api/lost/ \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "AirPods Pro",
    "category": "Electronics",
    "color": "White",
    "brand": "Apple",
    "description": "Lost my AirPods Pro near the library entrance.",
    "location": "Main Library, University Campus",
    "date": "2026-07-12",
    "contact_name": "John Doe",
    "contact_email": "john@example.com",
    "contact_phone": "+91-9876543210"
  }'
```

With image upload:
```bash
curl -X POST http://localhost:5000/api/lost/ \
  -F "item_name=AirPods Pro" \
  -F "category=Electronics" \
  -F "color=White" \
  -F "brand=Apple" \
  -F "description=Lost my AirPods Pro near the library." \
  -F "location=Main Library" \
  -F "date=2026-07-12" \
  -F "contact_name=John Doe" \
  -F "contact_email=john@example.com" \
  -F "images=@/path/to/photo.jpg"
```

#### `GET /api/lost/<id>`
Get a single lost item.

```bash
curl http://localhost:5000/api/lost/lost-001
```

#### `PUT /api/lost/<id>`
Partial update (only send fields to change).

```bash
curl -X PUT http://localhost:5000/api/lost/lost-001 \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'
```

#### `DELETE /api/lost/<id>`
Delete a lost item.

```bash
curl -X DELETE http://localhost:5000/api/lost/lost-001
```

---

### 🟢 Found Items

Same CRUD endpoints at `/api/found/` — identical parameters.

---

### 🔍 Search

#### `GET /api/search/`
Search across both lost and found items.

```bash
curl "http://localhost:5000/api/search/?q=wallet&type=all&category=Accessories"
```

Additional `type` param: `"all"` (default), `"lost"`, `"found"`.

#### `GET /api/search/suggestions?q=<term>`
Live search suggestions (min 2 characters).

```bash
curl "http://localhost:5000/api/search/suggestions?q=air"
```

#### `GET /api/search/categories`
All categories with split lost/found counts.

```bash
curl http://localhost:5000/api/search/categories
```

---

### 🤖 Smart Matching

#### `GET /api/match/lost/<lost_id>`
Find found items that match a lost item.

```bash
curl http://localhost:5000/api/match/lost/lost-001
```

Optional: `?min_score=30` to raise the confidence threshold.

#### `GET /api/match/found/<found_id>`
Find lost items that match a found item.

```bash
curl http://localhost:5000/api/match/found/found-001
```

#### `GET /api/match/preview/<lost_id>`
Top-3 lightweight match preview for UI cards.

```bash
curl http://localhost:5000/api/match/preview/lost-001
```

**Match result shape:**
```json
{
  "item": { "id": "found-001", ... },
  "score": 87.5,
  "score_breakdown": {
    "category": 30.0,
    "name": 22.5,
    "color": 9.0,
    "location": 8.0,
    "brand": 8.0,
    "date": 4.0,
    "description": 4.0
  },
  "matched_fields": ["category", "color", "item_name", "location"]
}
```

---

### 📊 Statistics

#### `GET /api/stats/`
Full platform statistics (category breakdown, status counts).

```bash
curl http://localhost:5000/api/stats/
```

#### `GET /api/stats/summary`
Compact 4-metric summary for hero section widgets.

```bash
curl http://localhost:5000/api/stats/summary
```

---

### ❤️ Health Check

#### `GET /api/health`
```bash
curl http://localhost:5000/api/health
```

---

## 📸 Image Upload

- **Max size:** 5 MB per image
- **Max per item:** 5 images
- **Allowed formats:** JPG, PNG, GIF, WebP
- **Auto-resized** to max 900×900 px (preserves aspect ratio)
- **Served at:** `GET /uploads/images/<filename>`

---

## 🧠 Matching Engine – Algorithm Details

| Field | Weight | Method |
|-------|--------|--------|
| Category | 30% | Exact string match |
| Item Name | 25% | Jaccard token overlap |
| Color | 15% | Exact match → colour family grouping |
| Location | 10% | Jaccard token overlap |
| Brand | 10% | Exact → contains → token overlap |
| Date | 5% | Exponential decay (half-life ≈ 7 days) |
| Description | 5% | Token overlap + bigram bonus |

**Colour families** group related colours (e.g., charcoal/graphite/black all map to the same family) so partial colour matches still score 60% of the colour weight.

**Date scoring** uses `e^(-0.1 × days_diff)`:
- 0 days → 100%
- 7 days → ~50%
- 30 days → ~5%

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `development` | `development` \| `production` \| `testing` |
| `FLASK_DEBUG` | `true` | Enable debug mode |
| `FLASK_HOST` | `0.0.0.0` | Bind host |
| `FLASK_PORT` | `5000` | Bind port |
| `SECRET_KEY` | *(dev key)* | Change in production |
| `MAX_IMAGE_SIZE_MB` | `5` | Max upload size |
| `MAX_IMAGES_PER_ITEM` | `5` | Max images per item |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed origins |
| `MATCH_MIN_SCORE` | `15` | Min confidence % to return |
| `MATCH_MAX_RESULTS` | `10` | Max matches returned |

---

## 🚀 Production Deployment

```bash
# Set production environment
export FLASK_ENV=production
export SECRET_KEY="your-strong-secret-key"
export CORS_ORIGINS="https://your-frontend-domain.com"

# Start with gunicorn (4 workers)
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

---

## 📁 Item Data Schema

```json
{
  "id":            "lost-a1b2c3d4",
  "type":          "lost",
  "item_name":     "AirPods Pro",
  "category":      "Electronics",
  "color":         "White",
  "brand":         "Apple",
  "description":   "...",
  "location":      "Main Library, University Campus",
  "date":          "2026-07-12",
  "contact_name":  "John Doe",
  "contact_email": "john@example.com",
  "contact_phone": "+91-9876543210",
  "images":        ["lost_abc123def456.jpg"],
  "status":        "active",
  "created_at":    "2026-07-12T10:30:00Z",
  "updated_at":    "2026-07-12T10:30:00Z"
}
```

**Valid categories:** Electronics, Clothing, Accessories, Documents, Keys, Bags, Pets, Sports, Jewelry, Books, Vehicles, Other

**Valid statuses:** active, resolved, archived
