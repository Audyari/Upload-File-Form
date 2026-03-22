# Test Suite Documentation

Complete unit and integration test suite for the Upload File Form API, implemented according to [Issue #3](https://github.com/Audyari/Upload-File-Form/issues/3).

## Test Structure

```
tests/
├── setup.ts                    # Test setup and teardown utilities
├── health.test.ts              # Health check API tests
├── uploads.test.ts             # Upload API tests
├── entities.test.ts            # Entity API tests
├── workflow.test.ts            # Integration workflow tests
├── README.md                   # This file
├── unit/                       # Unit tests (legacy structure)
│   ├── utils/
│   │   └── file-validator.test.ts
│   └── services/
│       ├── uploads-services.test.ts
│       └── entities-services.test.ts
└── integration/                # Integration tests (legacy structure)
    ├── uploads-route.test.ts
    └── entities-route.test.ts
```

## Running Tests

### Run all tests
```bash
bun test
```

### Run specific test files
```bash
bun test tests/health.test.ts
bun test tests/uploads.test.ts
bun test tests/entities.test.ts
bun test tests/workflow.test.ts
```

### Run unit tests only
```bash
bun run test:unit
```

### Run integration tests only
```bash
bun run test:integration
```

### Run tests with coverage
```bash
bun run test:coverage
```

## Test Coverage

### Primary Tests (Issue #3 Compliant)

#### Health Check API (`tests/health.test.ts`) - 5 tests
- `GET /` - Returns 200 status
- `GET /` - Returns `{ status: 'OK' }`
- `GET /` - Returns JSON content type
- `GET /` - Responds quickly (under 100ms)
- `GET /` - Handles multiple consecutive requests

#### Uploads API (`tests/uploads.test.ts`) - 15 tests
**Valid File Uploads:**
- Upload valid PDF file
- Upload valid JPG file
- Upload valid JPEG file
- Upload valid PNG file
- Upload file with size exactly at limit (10MB)

**Invalid File Uploads:**
- Upload file exceeding size limit (>10MB)
- Upload file with invalid extension (txt)
- Upload file with invalid extension (doc)
- Upload file with invalid extension (exe)
- Upload without file field
- Upload with empty file field

**Response Validation:**
- Return valid UUID format for file_id
- Return 400 error structure for invalid file

**Cleanup Verification:**
- Create database record on successful upload

#### Entities API (`tests/entities.test.ts`) - 15 tests
**Valid Entity Creation:**
- Create entity with only required fields (name only)
- Create entity with all fields (name + description)
- Create entity with valid file_id reference
- Create entity with empty description
- Create entity with very long description

**Invalid Entity Creation:**
- Create entity with empty name
- Create entity with missing name field
- Create entity with invalid/non-existent file_id
- Create entity with file_id from already linked file
- Create entity with name exceeding max length

**Response & Cleanup Validation:**
- Return `{ data: "OK" }` on success
- Return error structure for file not found
- Return error structure for server error
- Create entity record in database
- Update file status to linked when file_id is provided

#### Integration Workflow Tests (`tests/workflow.test.ts`) - 9 tests
- Complete workflow: upload file → create entity with file_id
- Verify file moves to permanent storage after linking
- Create entity successfully without file attachment
- Create multiple entities without files
- Health check before and after operations
- Handle multiple file uploads and entity creations
- Reject entity creation with invalid file_id after failed upload
- Identify orphan files (pending status)
- Not list linked files as orphans

### Unit Tests (Legacy)

#### File Validator Utils (`tests/unit/utils/file-validator.test.ts`) - 20 tests
- `isValidExtension()` - 10 tests
- `isValidFileSize()` - 5 tests
- `getValidationError()` - 5 tests

#### Upload Services (`tests/unit/services/uploads-services.test.ts`) - 4 tests
- `generateFileId()` - UUID generation tests

#### Entity Services (`tests/unit/services/entities-services.test.ts`) - 6 tests
- Input validation logic tests

### Integration Tests (Legacy)

#### Uploads API (`tests/integration/uploads-route.test.ts`) - 24 tests
#### Entities API (`tests/integration/entities-route.test.ts`) - 13 tests

## Test Statistics

| Category | Count |
|----------|-------|
| **Total Tests** | **110** |
| Primary Tests (Issue #3) | 44 |
| Unit Tests | 30 |
| Integration Tests (Legacy) | 37 |
| **Expect Calls** | **223** |

## Test Setup & Cleanup

The `tests/setup.ts` file provides:

- `cleanupDatabase()` - Clears all data from test database
- `cleanupUploadDirectories()` - Removes all files from upload directories
- `fullCleanup()` - Combined database and file cleanup
- `createMockFile()` - Creates mock File objects for testing
- `beforeEach`/`afterEach` hooks for automatic cleanup

Each test automatically cleans up:
1. Database records (entities, temporary_uploads)
2. Physical files (uploads/temp, uploads/permanent)

## Success Criteria (Issue #3)

✅ All test scenarios pass (110 tests)
✅ No data leakage between tests (automatic cleanup)
✅ Tests can run independently and in any order
✅ Uses bun test as the test runner
✅ Test folder at project root
✅ Each test scenario cleans up data before execution

## API Endpoints Tested

| Endpoint | Method | Description | Tests |
|----------|--------|-------------|-------|
| `/` | GET | Health check | 5 |
| `/api/uploads` | POST | File upload | 15 |
| `/api/entities` | POST | Create entity | 15 |
| **Workflows** | - | Integration scenarios | 9 |

## Adding New Tests

When adding new tests:

1. Use `describe` blocks to group related tests
2. Use `beforeEach` and `afterEach` for setup/cleanup
3. Import `fullCleanup` from `./setup` for consistent cleanup
4. Use `createMockFile()` for file upload tests
5. Use descriptive test names explaining expected behavior
6. Clean up all created data (database + files)
