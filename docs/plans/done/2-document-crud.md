# Phase 2: Document CRUD

This phase implements the document lifecycle as defined in `docs/tests/3-document-crud.md`.

## Goal

Enable document indexing (Create), retrieval (Get), and removal (Delete).

## Implementation Details

### 1. Store Updates (`src/store.ts`)

The `IndexState` will be updated to handle document operations.

```typescript
class Store {
  // Existing index management...

  indexDocument(indexName: string, id: string | undefined, body: any) {
    const index = this.getIndex(indexName);
    const docId = id || this.generateId();

    // 1. Store in the document map
    index.documents.set(docId, body);

    // 2. Add to FlexSearch index
    index.searchIndex.add({ id: docId, ...body });

    return {
      _index: indexName,
      _id: docId,
      _version: 1,
      result: id && index.documents.has(id) ? 'updated' : 'created',
    };
  }

  getDocument(indexName: string, id: string) {
    const index = this.getIndex(indexName);
    const doc = index.documents.get(id);

    if (!doc) return null;

    return {
      _index: indexName,
      _id: id,
      found: true,
      _source: doc,
    };
  }

  deleteDocument(indexName: string, id: string) {
    const index = this.getIndex(indexName);
    const exists = index.documents.has(id);

    if (exists) {
      index.documents.delete(id);
      index.searchIndex.remove(id);
    }

    return {
      _index: indexName,
      _id: id,
      found: exists,
      result: exists ? 'deleted' : 'not_found',
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}
```

### 2. Interaction Flow

#### **PUT /<index>/\_doc/<id> (Index)**

1. **Validate Index**: Return 404 if the index doesn't exist.
2. **Store**: Add/Update the document in the index's `documents` map.
3. **Index for Search**: Call `index.searchIndex.add()` (or `update()`) to keep FlexSearch in sync.
4. **Respond**: Return `result: "created"` or `result: "updated"`.

#### **GET /<index>/\_doc/<id> (Get)**

1. **Lookup**: Retrieve the document from the `IndexState.documents` map.
2. **Handle Missing**: Return 404 if not found with `found: false`.
3. **Respond**: Return the document wrapped in standard ES metadata.

#### **POST /<index>/\_update/<id> (Partial Update)**

1. **Lookup**: Retrieve the existing document.
2. **Merge**: Merge the `doc` field from the request body with the existing document.
3. **Re-index**: Update the document in both the `documents` map and the FlexSearch index.

#### **DELETE /<index>/\_doc/<id> (Delete)**

1. **Remove**: Delete from the `documents` map and FlexSearch index.
2. **Respond**: Return `result: "deleted"`.

## Tasks

1. **Update `src/store.ts`**: Implement document CRUD methods and ID generation.
2. **Create `src/documents.ts`**: Implement the Document Router.
3. **Update `src/server.ts`**: Register the document router and handle `/:index/_doc` and `/:index/_update` paths.

## Success Criteria

- Documents are indexed and retrieved successfully.
- Correct error codes (404) for missing items.
- FlexSearch index stays in sync with the document store.

## Implementation Result

- **Completed**: March 2026.
- **Store**: `src/store.ts` enhanced with `indexDocument`, `getDocument`, `updateDocument`, and `deleteDocument`.
- **Router**: `src/document.ts` implements `PUT /:index/_doc/:id`, `POST /:index/_doc`, `GET /:index/_doc/:id`, and `DELETE /:index/_doc/:id`.
- **Partial Update**: `POST /:index/_update/:id` implemented with object merging.
- **Validation**: Verified by `test/integration/document.test.ts`.
- **FlexSearch Sync**: Added logic to filter field mappings for `text` and `keyword` types to ensure FlexSearch compatibility with non-string values.
