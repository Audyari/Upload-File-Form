# Implementation Plan: File Upload Form Feature

**Reference Issue:** [Issue #923](https://github.com/ProgrammerZamanNow/qna/issues/923)

## Project Context
- **Framework:** Elysia.JS (Bun runtime)
- **ORM:** Drizzle
- **Database:** SQLite
- **Project Structure:** Layered Architecture (Router → Services)

## Problem Statement
Dilemma on file upload method when submitting forms:
1. **Separate Upload:** Good API performance, but risk of "trash files" if form validation fails
2. **Multipart Upload:** Risk of partial data save or long request duration with large files

## Selected Architecture
**Separate Upload API with Housekeeping Mechanism** - Upload files to temporary storage first, then link to form data on submit.

---

## Database Schema

### Table: `temporary_uploads`
```sql
CREATE TABLE temporary_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id VARCHAR(255) NOT NULL UNIQUE,  -- UUID
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending' | 'linked'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `entities` (Example main form table)
```sql
CREATE TABLE entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_id VARCHAR(255),  -- References temporary_uploads.file_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Folder Structure
```
src/
├── router/
│   ├── uploads-route.ts      # Upload file endpoints
│   └── entities-route.ts     # Main form endpoints
├── services/
│   ├── uploads-services.ts   # Upload business logic
│   └── entities-services.ts  # Entity form business logic
├── db/
│   ├── index.ts              # Database connection
│   └── schema.ts             # Drizzle schema definitions
├── utils/
│   └── file-validator.ts     # File validation utilities
└── index.ts                  # Main entry point
uploads/
├── temp/                     # Temporary upload storage
└── permanent/                # Permanent file storage
```

---

## Implementation Tasks

### Task 1: Setup Database Schema
**File:** `src/db/schema.ts`

**Instructions:**
1. Define Drizzle schema for `temporary_uploads` table
2. Define Drizzle schema for `entities` table (or your main form table)
3. Add file_id field to track uploaded files
4. Run migration to create tables in SQLite

---

### Task 2: Create File Validator Utility
**File:** `src/utils/file-validator.ts`

**Instructions:**
1. Create function to validate file extensions (whitelist: `.pdf`, `.jpg`, `.jpeg`, `.png`)
2. Create function to validate file size (max: 10MB recommended)
3. Export validation functions for reuse in services

---

### Task 3: Implement Upload Services
**File:** `src/services/uploads-services.ts`

**Functions to create:**
1. `saveTemporaryFile(file, fileId)` - Save file to temp storage and record metadata
2. `getTemporaryFile(fileId)` - Retrieve temporary upload metadata
3. `markFileAsLinked(fileId)` - Update status from 'pending' to 'linked'
4. `getOrphanFiles(olderThanHours)` - Find files with status 'pending' older than threshold
5. `deleteOrphanFile(fileId)` - Remove file from storage and database

---

### Task 4: Implement Upload Router
**File:** `src/router/uploads-route.ts`

**Endpoint:** `POST /api/uploads`

**Instructions:**
1. Accept `multipart/form-data` with file field
2. Validate file using validator utility
3. Generate UUID as `file_id`
4. Save file to `uploads/temp/` directory
5. Record metadata to `temporary_uploads` table with status 'pending'
6. Return response:
```json
{
    "data": {
        "file_id": "uuid-here"
    }
}
```

**Error Responses:**
- 400: File too large / Invalid extension
- 500: Upload failed

---

### Task 5: Implement Entity Services
**File:** `src/services/entities-services.ts`

**Functions to create:**
1. `createEntity(data, fileId)` - Save entity with linked file
2. `validateFileExists(fileId)` - Check if file_id exists in temporary_uploads

---

### Task 6: Implement Entity Router
**File:** `src/router/entities-route.ts`

**Endpoint:** `POST /api/entities`

**Instructions:**
1. Accept `application/json` with body:
```json
{
    "name": "Entity Name",
    "description": "Description",
    "file_id": "uuid-from-upload"
}
```
2. Validate `file_id` exists in `temporary_uploads`
3. Save entity data to `entities` table
4. Update file status to 'linked' in `temporary_uploads`
5. (Optional) Move file from `uploads/temp/` to `uploads/permanent/`
6. Return response:
```json
{
    "data": "OK"
}
```

---

### Task 7: Create Housekeeping/Cron Job
**File:** `src/services/housekeeping-services.ts`

**Instructions:**
1. Create function `cleanupOrphanFiles()` that:
   - Queries `temporary_uploads` for status='pending' AND `created_at` > 24 hours ago
   - Deletes physical files from `uploads/temp/`
   - Deletes database records
   - Logs number of files cleaned

**File:** `src/jobs/cleanup-job.ts`

**Instructions:**
1. Create script that runs `cleanupOrphanFiles()`
2. Can be executed via cron or scheduled task
3. Example cron expression: `0 2 * * *` (daily at 2:00 AM)

---

### Task 8: Register Routes in Main App
**File:** `src/index.ts`

**Instructions:**
1. Import and register `/api/uploads` route
2. Import and register `/api/entities` route
3. Ensure `uploads/temp/` and `uploads/permanent/` directories exist

---

## API Testing Scenarios

### Upload File Flow
1. **POST /api/uploads** with valid PDF file (< 10MB)
   - Expected: 200 OK with `file_id`
2. **POST /api/uploads** with file > 10MB
   - Expected: 400 Bad Request
3. **POST /api/uploads** with .exe file
   - Expected: 400 Bad Request (invalid extension)

### Submit Form Flow
1. **POST /api/entities** with valid `file_id`
   - Expected: 200 OK, file status changed to 'linked'
2. **POST /api/entities** with invalid `file_id`
   - Expected: 400 Bad Request (file not found)

### Housekeeping Flow
1. Create orphan file record manually
2. Run cleanup job
3. Verify file and record are deleted

---

## Acceptance Criteria
- [ ] User can upload large files (up to 10MB) and get fast response with `file_id`
- [ ] Form submission (`POST /api/entities`) is fast as it only sends JSON with `file_id`
- [ ] No accumulation of trash files - housekeeping job successfully removes orphan files older than 24 hours
- [ ] All endpoints return proper error responses for invalid inputs

---

## Notes for Implementation
- Use `Bun.file()` for handling file uploads in Elysia.JS
- Use `crypto.randomUUID()` for generating file IDs
- Store files with original name prefixed by file_id to avoid collisions
- Consider using `node-cron` or system cron for scheduling cleanup job
- Add proper error handling and logging throughout
