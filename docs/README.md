# elastic-mock: Design & Implementation

This document provides a detailed overview of the design, architecture, and implementation of the `elastic-mock` tool.

## Architecture Overview

`elastic-mock` is structured into multiple layers to ensure separation of concerns and maintainability.

### 1. REST API Layer (Express.js)

The top layer provides the HTTP interface for clients. It parses incoming JSON and NDJSON requests and routes them to the appropriate logic handlers.

- **Route Handling**: Individual routers for `_cluster`, `indices`, `_doc`, `_search`, and `_cat`.
- **JSON Serialization**: Standardizes responses to match Elasticsearch's expected JSON format.
- **Middleware**: Includes Winston-based logging for request/response visibility.

### 2. The Store (`src/store.ts`)

The central state manager for the application. All metadata and documents are stored in-memory using JavaScript `Map` objects.

- **IndexState**: Each index has its own state containing:
  - **Mappings**: Field type definitions.
  - **Settings**: Shard and replica configurations.
  - **Documents**: A map of document IDs to their source JSON.
  - **SearchIndex**: A dedicated instance of FlexSearch for that index.

### 3. Search Engine (FlexSearch)

Full-text search is powered by **FlexSearch**. Each index initializes a `FlexSearch.Document` instance based on its field mappings (filtering for `text` and `keyword` types). This allows for high-performance indexing and querying without the overhead of a full Lucene implementation.

### 4. Query DSL Mapper

Since FlexSearch uses a different query syntax, a manual mapper in `src/store.ts` translates Elasticsearch Query DSL (`match`, `term`, `bool`) into appropriate FlexSearch queries and manual filters.

### 5. Aggregation Engine

A custom JavaScript-based processor (`src/aggregator.ts`) computes statistics (`min`, `max`, `avg`, `sum`) and buckets (`terms`) from the result set of a search.

## Implementation Roadmap

Implementation was divided into 6 focused phases, all of which are now **Completed**:

1. **Phase 1: Indices Management** [COMPLETED]
   - In-memory metadata storage and index lifecycle (Create, Delete, Exists).
2. **Phase 2: Document CRUD** [COMPLETED]
   - Basic indexing, retrieval, and removal of single documents.
3. **Phase 3: Search & Query DSL** [COMPLETED]
   - Full-text `match` via FlexSearch and boolean filter implementation.
4. **Phase 4: Aggregation Engine** [COMPLETED]
   - Calculation of metrics and buckets from hits.
5. **Phase 5: Bulk & CAT APIs** [COMPLETED]
   - High-volume ingestion and operational visibility (human-readable tables).
6. **Phase 6: Finalization & Teardown** [COMPLETED]
   - Comprehensive validation, cluster settings, and clean state assurance.

## Specifications and Tests

- **API Specs**: Found in `docs/specs/`.
- **Test Strategy**: Found in `docs/tests/`.
- **Phased Plans**: Found in `docs/plans/`.
- **Integration Tests**: 30 tests covering all aspects of the API in `test/integration/`.
