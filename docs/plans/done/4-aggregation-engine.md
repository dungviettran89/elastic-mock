# Phase 4: Aggregation Engine

This phase implements a JavaScript-based aggregation processor for the `_search` API.

## Goal

Implement a manual processor that calculates buckets and metrics from search results.

## Implementation Details

### 1. Aggregation Logic (`src/aggregator.ts`)

The `Aggregator` will be called after the Query/Filter Phase of search.

```typescript
class Aggregator {
  process(hits: any[], aggRequest: any): any {
    const results: any = {};
    for (const [name, query] of Object.entries(aggRequest)) {
      if (query.terms) {
        results[name] = this.termsAggregation(hits, query.terms.field);
      } else if (query.avg || query.max || query.min || query.sum) {
        results[name] = this.metricAggregation(hits, query);
      }
    }
    return results;
  }

  private termsAggregation(hits: any[], field: string) {
    const buckets: Map<string, number> = new Map();
    hits.forEach((hit) => {
      const val = hit._source[field];
      buckets.set(val, (buckets.get(val) || 0) + 1);
    });
    return {
      buckets: Array.from(buckets.entries()).map(([key, doc_count]) => ({ key, doc_count })),
    };
  }
}
```

### 2. Interaction Flow

#### **POST /\_search**

1. **Search Phase**: Perform the Query and Filter as implemented in Phase 3.
2. **Aggregator Call**: Pass the final list of "hits" to the `Aggregator`.
3. **Combine Results**: Append the `aggregations` object to the final ES response.

## Tasks

1. **Aggregator Engine**: Implement `terms` aggregation.
2. **Metric Support**: Add `min`, `max`, `avg`, and `sum` metrics.
3. **Search Integration**: Update `src/search.ts` to call the aggregator when `aggs` is present.

## Success Criteria

- Search responses include an `aggregations` object.
- `terms` aggregations correctly count occurrences of field values in the result set.
- Metric values match calculations based on the documents returned.

## Implementation Result

- **Completed**: March 2026.
- **Aggregator Engine**: Created `src/aggregator.ts` implementing `Aggregator` class.
- **Aggregations**: Supported `terms`, `avg`, `min`, `max`, and `sum`.
- **Search Integration**: `src/store.ts` updated to call `globalAggregator.process` if `aggs` is present in the request body.
- **Validation**: Verified by `test/integration/aggs.test.ts`.
- **Sorting**: `terms` aggregation buckets are automatically sorted by `doc_count` descending.
