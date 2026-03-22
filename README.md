# Upload File Form API

A file upload API built with Bun, Elysia.JS, Drizzle ORM, and SQLite. This application implements a **separate upload with housekeeping** architecture for handling file uploads efficiently.

## Architecture

### Folder Structure
```
upload-file-form/
├── src/
│   ├── router/              # Elysia.JS route handlers
│   │   ├── uploads-route.ts    # File upload endpoints
│   │   └── entities-route.ts   # Entity form endpoints
│   ├── services/            # Business logic layer
│   │   ├── uploads-services.ts    # File upload logic
│   │   ├── entities-services.ts   # Entity form logic
│   │   └── housekeeping-services.ts # Cleanup logic
│   ├── db/                  # Database configuration
│   │   ├── index.ts            # Database connection
│   │   └── schema.ts           # Drizzle schema definitions
│   ├── utils/               # Utility functions
│   │   └── file-validator.ts   # File validation
│   └── jobs/                # Background jobs
│       └── cleanup-job.ts      # Orphan file cleanup
├── uploads/
│   ├── temp/                # Temporary file storage
│   └── permanent/           # Permanent file storage
├── drizzle/                 # Database migrations
├── index.ts                 # Application entry point
└── drizzle.config.ts        # Drizzle Kit configuration
```

### File Naming Convention
- **Router files:** `{feature}-route.ts` (e.g., `uploads-route.ts`)
- **Service files:** `{feature}-services.ts` (e.g., `uploads-services.ts`)

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **Bun** | JavaScript runtime |
| **Elysia.JS** | Web framework |
| **Drizzle ORM** | Database ORM |
| **SQLite** | Database (via `bun:sqlite`) |

## Database Schema

### `temporary_uploads` Table
Stores metadata for uploaded files in temporary storage.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| file_id | VARCHAR(255) | Unique file identifier (UUID) |
| file_name | VARCHAR(255) | Original file name |
| file_path | VARCHAR(500) | Path to file in storage |
| file_size | INTEGER | File size in bytes |
| mime_type | VARCHAR(100) | File MIME type |
| status | VARCHAR(50) | 'pending' or 'linked' |
| created_at | TIMESTAMP | Upload timestamp |

### `entities` Table
Main form table with file references.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| name | VARCHAR(255) | Entity name |
| description | TEXT | Entity description |
| file_id | VARCHAR(255) | Reference to temporary_uploads |
| created_at | TIMESTAMP | Creation timestamp |

## API Endpoints

### 1. Upload File
**POST** `/api/uploads`

Uploads a file to temporary storage and returns a `file_id` for later use.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (File field)

**Response (200 OK):**
```json
{
  "data": {
    "file_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid file extension. Allowed extensions: .pdf, .jpg, .jpeg, .png"
}
```

**Constraints:**
- Maximum file size: 10MB
- Allowed extensions: `.pdf`, `.jpg`, `.jpeg`, `.png`

---

### 2. Create Entity
**POST** `/api/entities`

Creates a new entity with an optional file reference.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "name": "My Entity",
  "description": "Optional description",
  "file_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "data": "OK"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "File not found"
}
```

---

## Setup

### Prerequisites
- [Bun](https://bun.com) installed

### Installation

1. Install dependencies:
```bash
bun install
```

2. Generate database migrations:
```bash
bun run db:generate
```

3. Apply migrations:
```bash
bun run db:migrate
```

### Running the Application

Development mode (with hot reload):
```bash
bun run dev
```

Production mode:
```bash
bun run start
```

Server runs on: `http://localhost:3000`

### Running the Cleanup Job

Manually run the housekeeping cleanup job:
```bash
bun run jobs:cleanup
```

To schedule automatic cleanup (daily at 2:00 AM):

**Linux/Mac (crontab):**
```bash
0 2 * * * cd /path/to/project && bun run jobs:cleanup
```

**Windows Task Scheduler:**
- Create a basic task
- Trigger: Daily at 2:00 AM
- Action: Start a program
- Program: `bun`
- Arguments: `run jobs:cleanup`
- Start in: `C:\path\to\project`

## Testing

### Test File Upload
```bash
curl -X POST http://localhost:3000/api/uploads -F "file=@test.pdf"
```

### Test Entity Creation
```bash
curl -X POST http://localhost:3000/api/entities \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Entity","description":"Test","file_id":"<file_id_from_upload>"}'
```

### Test Invalid File ID
```bash
curl -X POST http://localhost:3000/api/entities \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Entity","file_id":"invalid-id"}'
```

## How It Works

### Upload Flow
1. Client uploads file to `/api/uploads`
2. Server validates file (size, extension)
3. File saved to `uploads/temp/` with UUID filename
4. Metadata recorded in `temporary_uploads` table with status='pending'
5. Server returns `file_id` to client

### Submit Form Flow
1. Client submits form data to `/api/entities` with `file_id`
2. Server validates `file_id` exists in `temporary_uploads`
3. Entity data saved to `entities` table
4. File status updated to 'linked'
5. File moved from `uploads/temp/` to `uploads/permanent/`

### Housekeeping Flow
1. Cleanup job runs on schedule (e.g., daily at 2:00 AM)
2. Query finds files with status='pending' older than 24 hours
3. Physical files deleted from `uploads/temp/`
4. Database records removed from `temporary_uploads`

## Acceptance Criteria

- ✅ User can upload large files (up to 10MB) with fast response
- ✅ Form submission is fast (JSON only with `file_id`)
- ✅ No accumulation of trash files (housekeeping job removes orphans)
- ✅ Proper error responses for invalid inputs
