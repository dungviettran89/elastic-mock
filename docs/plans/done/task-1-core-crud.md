# Task 1: Core CRUD & Existence Refinements

Fix foundational document and index existence failures discovered in external tests.

## Problem

The external tests use different index names (e.g., `test_serverless_get_10`) and expect the server to handle them correctly. While we have these endpoints, some might be failing due to missing auto-index creation or strict 404s where 200/404 head responses are expected.

## Technical Details (from External Tests)

### 1.1 Auto-Index & Basic Get

**Request:**

```http
PUT /test_serverless_get_10/_doc/1
{ "foo": "bar" }
```

**Expected Response:**

- Status: `201 Created`
- Body: `{ "_index": "test_serverless_get_10", "_id": "1", ... }`

**Follow-up Request:**

```http
GET /test_serverless_get_10/_doc/1
```

**Expected Response:**

- Status: `200 OK`
- Body: `{ "_index": "test_serverless_get_10", "_id": "1", "_source": { "foo": "bar" }, ... }`

### 1.2 Exists APIs (HEAD)

Tests `exists` and `exists_source` methods.

**Request:**

```http
HEAD /exists_index/_doc/{id}
```

**Expected Response:**

- Status: `200 OK` (if found)

**Request:**

```http
HEAD /exists_source_index/_source/{id}
```

**Expected Response:**

- Status: `200 OK` (if found)

## Plan

1. **Auto-Index Creation**: Ensure indexing a document into a non-existent index creates it automatically in `globalStore`.
2. **Exists APIs**: Implement `HEAD /{index}/_doc/{id}` and `HEAD /{index}/_source/{id}` in `src/document.ts`.
3. **ID Handling**: Ensure generated IDs (for POST without ID) are correctly returned and accessible for subsequent GET calls.

## Success Criteria

- `external-tests/tests/get/10_basic.yml` passes.
- `external-tests/tests/index/10_with_id.yml` passes.
- `external-tests/tests/exists/10_basic.yml` passes.
