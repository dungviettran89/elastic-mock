# Task 3: Alias & Mapping Management

Implement index aliases and mapping update capabilities.

## Problem

Currently, the mock server only supports physical indices. Real ES uses aliases extensively. Also, `indices.put_mapping` is required to update existing indices.

## Technical Details (from External Tests)

### 3.1 Index Aliases

Allows multiple names to point to the same index.

**Request:**

```http
PUT /indices_alias_test/_alias/testing_alias
```

**Expected Response:**

- Status: `200 OK`
- Body: `{ "acknowledged": true }`

**Update Request:**

```http
POST /_aliases
{
  "actions": [
    { "add": { "index": "indices_alias_test2", "alias": "testing_alias" } }
  ]
}
```

### 3.2 Mapping Updates

Add new fields to an existing index.

**Request:**

```http
PUT /test_mapping_index/_mapping
{
  "properties": {
    "text1": { "type": "text" }
  }
}
```

**Expected Response:**

- Status: `200 OK`
- Body: `{ "acknowledged": true }`

### 3.3 Index Resolution

Resolving patterns or aliases to actual indices.

**Request:**

```http
GET /_resolve/index/test_resolve*
```

**Expected Response:**

- Status: `200 OK`
- Body: `{ "indices": [ { "name": "test_resolve_index1", "aliases": [...] } ], ... }`

## Plan

1. **Store Update**: Update `IndexState` to include an `aliases: Set<string>` property.
2. **Alias APIs**: Implement `PUT /{index}/_alias/{name}`, `DELETE /{index}/_alias/{name}`, and `POST /_aliases` in `src/indices.ts`.
3. **Mapping Merging**: Update `src/store.ts` to support deep-merging of new properties into existing mappings.
4. **Resolution Logic**: Ensure all index-based routers (document, search, etc.) check for aliases if a physical index name is not found.

## Success Criteria

- `external-tests/tests/indices/alias.yml` passes.
- `external-tests/tests/indices/mapping.yml` passes.
- `indices.get_alias` returns the correct mapping.
- `indices.resolve_index` correctly identifies matches.
