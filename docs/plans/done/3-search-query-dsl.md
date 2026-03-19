# Phase 3: Search & Query DSL

This phase integrates FlexSearch and implements the basic `_search` API functionality.

## Goal

Enable full-text search (`match`) and exact filtering (`term`, `bool`) using FlexSearch.

## Implementation Details

### 1. Search Logic (`src/search.ts`)

The `_search` endpoint will handle:

1. **Query Phase**: Use FlexSearch for text-based `match` queries.
2. **Filter Phase**: Manually filter results from the `Store` for `term`, `range`, and `bool` logic.

### 2. Interaction Flow

#### **POST /\_search**

1. **Parse Body**: Extract `query`, `size`, and `from`.
2. **FlexSearch Search**: If `query.match` is provided, call `flexsearch.search(query.match.field)`.
3. **Boolean Filtering**:
   - For `must`: Perform intersection of ID arrays.
   - For `should`: Perform union of ID arrays.
   - For `must_not`: Subtract IDs from the set.
4. **Pagination**: Apply `size` and `from` to the final list of hits.
5. **Respond**: Return a standard ES `hits` object.

## Tasks

1. **FlexSearch Sync**: Sync document additions and deletions from `Store` to FlexSearch.
2. **Query Mapper**: Implement a basic parser for `match`, `term`, and `bool`.
3. **Search Router**: Implement the global and index-specific search endpoints.

## Success Criteria

- Searching for a keyword returns the correct document IDs with scores.
- `bool` filters correctly include or exclude documents.

## Implementation Result

- **Completed**: March 2026.
- **Search Engine**: Integrated `flexsearch` into `src/store.ts`.
- **Query DSL**: Implemented `match_all`, `match`, `term`, and `bool` (must, filter, must_not, should) in `src/store.ts`.
- **Router**: `src/search.ts` implements index-specific and global `_search` endpoints (GET/POST).
- **Pagination**: Added support for `from` and `size` parameters.
- **Validation**: Verified by `test/integration/search.test.ts`.
- **Global Search**: Search now correctly iterates over all available indices when using `/_search`.
