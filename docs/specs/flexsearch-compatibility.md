# FlexSearch vs. Elasticsearch API Compatibility

This document assesses the feasibility of using **FlexSearch** as the primary search and storage engine for the `elastic-mock` project.

## Comparison Overview

| Feature              | Elasticsearch (ES)       | FlexSearch (FS)        | Compatibility Note                                                |
| :------------------- | :----------------------- | :--------------------- | :---------------------------------------------------------------- |
| **Search Engine**    | Lucene                   | Custom (N-gram/Suffix) | FS is extremely fast but uses different logic.                    |
| **Query DSL**        | Rich JSON Query DSL      | Simple String Queries  | **High Effort**: Needs a mapper from ES JSON to FS strings.       |
| **Full-Text Search** | Analyzers, Tokenizers    | Encoders, Tokenizers   | Both support basic tokenization and case-insensitivity.           |
| **Filtered Search**  | `term`, `range`, `bool`  | Tagging (limited)      | **High Effort**: FS lacks native range/complex boolean filtering. |
| **Aggregations**     | Extensive (stats, terms) | None                   | **High Effort**: Must be implemented manually in JavaScript.      |
| **Sorting**          | Multi-field, custom      | Scoring-based          | **Medium Effort**: FS sorting is primarily relevance-based.       |

## Feature Mapping Strategy

### 1. Simple Search (`match`, `query_string`)

- **ES**: `GET /_search?q=hello` or `{"query": {"match": {"content": "hello"}}}`
- **FS**: `docs.search("hello")`
- **Assessment**: **Feasible**. Direct mapping is straightforward for simple keywords.

### 2. Exact Match (`term`, `terms`)

- **ES**: `{"query": {"term": {"sku": "A-123"}}}`
- **FS**: Requires `tokenize: "strict"` or post-search filtering in JavaScript.
- **Assessment**: **Feasible** via manual filtering on the results returned by FS.

### 3. Boolean Queries (`bool`)

- **ES**: `must`, `should`, `must_not`
- **FS**: Does not natively support complex boolean structures.
- **Assessment**: **Difficult**. Requires executing multiple FS searches and performing set intersections (AND), unions (OR), and subtractions (NOT) manually in JS.

### 4. Pagination (`from`, `size`)

- **ES**: `{"from": 10, "size": 10}`
- **FS**: Supports a `limit` parameter for `size`. `from` must be handled manually by slicing the results array.
- **Assessment**: **Feasible**.

## Feasibility Assessment

### Can FlexSearch mock Elasticsearch?

**Yes, with caveats.**

- **Pros**:
  - Extremely lightweight and fast (perfect for unit/integration tests).
  - Handles full-text relevance scoring better than simple `indexOf` or regex.
  - Low memory footprint compared to a full ES instance.

- **Cons**:
  - **Query DSL Complexity**: You will need to write a robust parser/mapper to convert Elasticsearch's nested JSON Query DSL into FlexSearch calls and manual JS filters.
  - **Missing Features**: No native support for `range` (dates/numbers) or `aggregations`. These must be built on top of the FS results.

### Verdict

FlexSearch is a **strong choice** for the core search engine of `elastic-mock`, provided that the project focuses on **functional mocking** (basic CRUD and search) rather than full behavioral parity with all of Elasticsearch's complex analytic features.

**Implementation Recommendation**: Use FlexSearch for the "Full-Text" component and a standard JavaScript object/map (or a library like `lokijs`) for metadata and exact filtering/range queries.
