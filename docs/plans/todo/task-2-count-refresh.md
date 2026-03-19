# Task 2: Count & Refresh APIs

Implement the `_count` and `_refresh` endpoints which are frequently used in setup/teardown of external tests.

## Problem

Many tests rely on `GET /_count` or `POST /_refresh` during their `setup` blocks. Since these endpoints are missing, the setup fails, leading to subsequent test failures.

## Technical Details (from External Tests)

### 2.1 Count API

Used to verify document ingestion.

**Request:**

```http
GET /bulk_test/_count
```

**Expected Response:**

- Status: `200 OK`
- Body: `{ "count": 2, "_shards": { ... } }`

**Global Request:**

```http
GET /_count
```

**Expected Response:**

- Status: `200 OK`
- Body: `{ "count": 10, ... }` (sum across all indices)

### 2.2 Refresh API

Used to ensure data is searchable. In our in-memory mock, this can be a no-op that always returns success.

**Request:**

```http
POST /graph_explore_test/_refresh
```

**Expected Response:**

- Status: `200 OK`
- Body: `{ "_shards": { "total": 1, "successful": 1, "failed": 0 } }`

**Global Request:**

```http
POST /_refresh
```

**Expected Response:**

- Status: `200 OK`

## Plan

1. **Count API**: Implement `GET /{index}/_count` and `GET /_count` in `src/document.ts`. It should return the size of the `documents` map for the targeted index(es).
2. **Refresh API**: Implement `POST /{index}/_refresh` and `POST /_refresh` in `src/indices.ts`. Return a standard success response.
3. **Consistency**: Ensure `globalStore` has a method to aggregate counts across all indices.

## Success Criteria

- `external-tests/tests/count/10_basic.yml` passes.
- `external-tests/tests/bulk/10_basic.yml` setup successfully completes.
- `GET /_count` returns accurate totals.
