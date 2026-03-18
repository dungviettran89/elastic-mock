# FlexSearch Specification

FlexSearch is a high-performance, full-text search library for JavaScript. It is designed to be extremely fast and memory-efficient, making it an ideal candidate for an in-memory Elasticsearch mock backend.

## Core Components

### 1. `Index`

Used for simple id-to-content indexing. Best for searching single strings.

```javascript
import { Index } from 'flexsearch';
const index = new Index(options);
```

### 2. `Document`

Used for indexing complex JSON objects with multiple fields.

```javascript
import { Document } from 'flexsearch';
const docs = new Document({
  document: {
    id: 'id',
    index: ['title', 'content'],
    store: ['title'],
  },
});
```

## Key Configuration Options

| Option     | Description                                                  | Recommended for ES Mock           |
| :--------- | :----------------------------------------------------------- | :-------------------------------- |
| `tokenize` | How to split words (`strict`, `forward`, `reverse`, `full`). | `forward` (for partial matching)  |
| `encode`   | Pre-processing (e.g., `icase`, `simple`, `advanced`).        | `icase` (case-insensitive)        |
| `cache`    | Enables internal caching.                                    | `true`                            |
| `async`    | Enables asynchronous operations (returns Promises).          | `true`                            |
| `worker`   | Uses Web Workers for parallel processing.                    | `false` (keep simple for Node.js) |

## API Methods

### `.add(id, content | object)`

Adds an item to the index. If using `Document`, you pass the whole object.

### `.update(id, content | object)`

Updates an existing item.

### `.remove(id)`

Removes an item by ID.

### `.search(query, limit, options)`

Executes a search.

- **Index search**: Returns an array of IDs.
- **Document search**: Returns an array of objects grouped by field: `[{ field: "title", result: [1, 2] }]`.

### `.export()` / `.import()`

Used for persistence. You can export the index state as a string or binary and reload it later.

---

_Source: Based on FlexSearch v0.7.x Documentation._
