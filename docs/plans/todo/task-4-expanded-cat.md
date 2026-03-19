# Task 4: Expanded CAT API Coverage

Implement additional CAT endpoints for system observability.

## Problem

Only a few CAT endpoints were implemented in Phase 5. Many more are required for full client test compatibility.

## Technical Details (from External Tests)

### 4.1 CAT Aliases

**Request:**

```http
GET /_cat/aliases?format=json
```

**Expected Response:**

- Status: `200 OK`
- Body: `[ { "alias": "my_alias", "index": "test_cat_aliases", ... } ]`

### 4.2 CAT Shards

**Request:**

```http
GET /_cat/shards?format=json
```

**Expected Response:**

- Status: `200 OK`
- Body: `[ { "index": "products", "shard": "0", "prirep": "p", "state": "STARTED", ... } ]`

### 4.3 CAT Allocation

**Request:**

```http
GET /_cat/allocation?format=json
```

**Expected Response:**

- Status: `200 OK`
- Body: `[ { "shards": "1", "disk.indices": "1kb", "node": "elastic-mock", ... } ]`

## Plan

1. **Templates Mock**: Implement `GET /_cat/templates`. Can return `[]` if no templates are supported yet.
2. **Allocation Mock**: Implement `GET /_cat/allocation`. Return static/calculated values for the mock node.
3. **Aliases Integration**: Implement `GET /_cat/aliases`. Connect it to the `IndexState.aliases` from Task 3.
4. **Shards Mock**: Implement `GET /_cat/shards`. List one primary shard per index.
5. **Plugins Mock**: Implement `GET /_cat/plugins`. Return `[]` or a static mock list.

## Success Criteria

- `external-tests/tests/cat/aliases.yml` passes.
- `external-tests/tests/cat/allocation.yml` passes.
- `external-tests/tests/cat/shards.yml` returns at least one shard per index.
