# Unit Test Implementation Plan

## Overview
Implement unit tests for all available APIs using `bun test`.

## Test Setup Requirements
- Create `test` folder at project root
- Use `bun test` as the test runner
- Each test scenario must clean up data before execution to ensure consistency
- Use in-memory SQLite database or reset database state between tests

## Available APIs to Test

### 1. GET / (Health Check)

**Test Scenarios:**
- Verify health check returns 200 status
- Verify response contains `{ status: 'OK' }`

---

### 2. POST /api/uploads (File Upload)

**Test Scenarios:**
- Upload valid PDF file
- Upload valid image (jpg, jpeg, png)
- Upload file with size exactly at limit (5MB)
- Upload file exceeding size limit (>5MB)
- Upload file with invalid extension (txt, doc, exe)
- Upload file without file field
- Upload file with empty file field

**Cleanup:** Delete temporary upload record and file from disk

---

### 3. POST /api/entities (Create Entity)

**Test Scenarios:**
- Create entity with only required fields (name only)
- Create entity with all fields (name + description)
- Create entity with valid file_id reference
- Create entity with invalid/non-existent file_id
- Create entity with file_id from already linked file
- Create entity with empty name
- Create entity with name exceeding max length
- Create entity with very long description

**Cleanup:** Delete entity record, file record, and physical file

---

### 4. Integration Test Scenarios

**Test Scenarios:**
- Complete workflow: upload file → create entity with file_id → verify file moved to permanent
- Complete workflow: create entity without file → verify entity created successfully
- Upload file → let it expire (orphan) → verify cleanup works

**Cleanup:** Remove all created entities, file records, and physical files

---

## Test File Structure

```
test/
├── setup.ts          # Test setup and teardown
├── health.test.ts    # Health check tests
├── uploads.test.ts   # Upload API tests
└── entities.test.ts  # Entity API tests
```

## Implementation Notes

- Use `beforeEach` or `beforeAll` hooks for data cleanup
- Mock or reset database state between tests
- Clean up physical files after each test
- Use unique identifiers for test data to avoid conflicts
- Consider using a test-specific database or in-memory SQLite

## Success Criteria

- All test scenarios pass
- No data leakage between tests
- Tests can run independently and in any order
