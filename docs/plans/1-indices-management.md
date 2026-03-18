# Phase 1: Indices Management

This phase implements the lifecycle of Elasticsearch indices as defined in `docs/tests/2-indices-lifecycle.md`.

## Goal

Manage index metadata, mappings, and settings in-memory and initialize the search engine.

## Implementation Details

### 1. Data Structure (`src/store.ts`)

We will use a central `Store` to manage all state. Each index will be represented by an `IndexState` object.

```typescript
import { Document } from 'flexsearch';

interface IndexState {
  name: string;
  settings: any;
  mappings: any;
  documents: Map<string, any>;
  searchIndex: Document<any>; // FlexSearch instance
}

class Store {
  private indices: Map<string, IndexState> = new Map();

  createIndex(name: string, body: any) {
    // 1. Initialize FlexSearch based on mappings
    const searchIndex = new Document({
      document: {
        id: 'id',
        index: this.extractIndexedFields(body.mappings),
        store: true, // We store the full doc in FlexSearch for simplicity in Phase 1
      },
      tokenize: 'forward',
      context: true,
    });

    // 2. Store Metadata
    this.indices.set(name, {
      name,
      settings: body.settings || { number_of_shards: 1, number_of_replicas: 0 },
      mappings: body.mappings || { properties: {} },
      documents: new Map(),
      searchIndex,
    });
  }

  private extractIndexedFields(mappings: any): string[] {
    if (!mappings?.properties) return [];
    return Object.keys(mappings.properties);
  }
}
```

### 2. Interaction Flow

#### **PUT /{index} (Creation)**

1. **Validate**: Check if the index already exists (return 400 if so).
2. **Initialize Search**: Create a new `FlexSearch.Document` instance. The fields to index are extracted from the `mappings.properties` object.
3. **Persist Metadata**: Save the mappings and settings in the `Store`'s memory map.
4. **Respond**: Return the standard ES success JSON.

#### **GET /{index}/\_mapping (Retrieval)**

1. **Lookup**: Retrieve the `IndexState` from the `Store` using the index name.
2. **Format**: Return the stored `mappings` wrapped in the index name object.

#### **GET /\_cluster/state (Integration)**

- The `_cluster/state` endpoint must now iterate over `Store.indices` to populate the `metadata.indices` section of the response.

#### **DELETE /{index} (Cleanup)**

1. **Remove**: Delete the entry from `Store.indices`.
2. **Memory**: FlexSearch instance will be garbage collected as it's no longer referenced.

## Tasks

0. **Project Setup**:
   - Add `flexsearch` as a dependency to the project (`npm install flexsearch`).
1. **Create `src/store.ts`**: Implement the `Store` class and `IndexState` interface.
2. **Update `src/server.ts`**: Inject `Store` into routers.
3. **Create `src/indices.ts`**: Implement the Indices Router using the `Store`.
4. **Update `src/cluster.ts`**: Make `_cluster/state` dynamic.

## Success Criteria

- Can create an index with a custom mapping.
- `HEAD /products` returns `200 OK` after creation.
- `GET /products/_mapping` returns the exact mapping provided during creation.

## Implementation Result

- **Completed**: March 2026.
- **Store**: `src/store.ts` implemented with `createIndex`, `deleteIndex`, and `getIndex` methods.
- **Router**: `src/indices.ts` implements `PUT /:index`, `HEAD /:index`, `DELETE /:index`, and `GET /:index/_mapping`.
- **Validation**: Verified by `test/integration/indices.test.ts`.
- **Note**: `express.json` was updated to support `application/vnd.elasticsearch+json` content type.
