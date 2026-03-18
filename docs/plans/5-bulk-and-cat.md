# Phase 4: Bulk Operations & CAT APIs

This phase implements high-volume operations and human-readable stats as defined in `docs/tests/4-bulk-and-cat.md`.

## Goal

Implement the `_bulk` API and `_cat` endpoints for operational visibility.

## Tasks

1. **Bulk Implementation (`src/bulk.ts`)**:
   - Implement `POST /_bulk`.
   - Parse **ndjson** format.
   - Batch execute index, delete, and create operations on the `Store` and FlexSearch index.

2. **CAT Router (`src/cat.ts`)**:
   - Implement `GET /_cat/health`.
   - Implement `GET /_cat/indices`.
   - Implement `GET /_cat/nodes`.
   - Implement universal `?v` and `?format=json` support.

3. **Validation**:
   - Run `docs/tests/4-bulk-and-cat.md`.
   - Verify document counts match after a bulk operation.

## Success Criteria

- Can load 1,000 documents in a single `_bulk` call.
- `GET /_cat/indices?v` correctly reports the number of docs in `products`.

## Implementation Result

- **Completed**: March 2026.
- **Bulk API**: Implemented `POST /_bulk` in `src/document.ts` with support for `index`, `create`, `update`, and `delete` operations.
- **NDJSON Parser**: `src/server.ts` updated with `express.text` parser for `application/x-ndjson` and `application/vnd.elasticsearch+x-ndjson`.
- **CAT Router**: Created `src/cat.ts` implementing `_cat/health`, `_cat/indices`, `_cat/nodes`, and `_cat/count`.
- **Formatting**: Supported both text/tabular (`?v`) and JSON (`?format=json`) formats for all CAT endpoints.
- **Validation**: Verified by `test/integration/bulk_cat.test.ts`.
- **Reliability**: Reordered Express routers to ensure bulk and document endpoints take precedence over generic search paths.
