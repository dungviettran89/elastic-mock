export class Aggregator {
  process(hits: any[], aggRequest: any): any {
    if (!aggRequest) return undefined;

    const results: any = {};
    for (const [name, query] of Object.entries(aggRequest) as [string, any][]) {
      if (query.terms) {
        results[name] = this.termsAggregation(hits, query.terms.field);
      } else if (query.avg) {
        results[name] = { value: this.metricAggregation(hits, 'avg', query.avg.field) };
      } else if (query.max) {
        results[name] = { value: this.metricAggregation(hits, 'max', query.max.field) };
      } else if (query.min) {
        results[name] = { value: this.metricAggregation(hits, 'min', query.min.field) };
      } else if (query.sum) {
        results[name] = { value: this.metricAggregation(hits, 'sum', query.sum.field) };
      }
    }
    return results;
  }

  private termsAggregation(hits: any[], field: string) {
    const buckets: Map<any, number> = new Map();
    hits.forEach((hit) => {
      const val = hit._source[field];
      if (val !== undefined) {
        buckets.set(val, (buckets.get(val) || 0) + 1);
      }
    });
    return {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: Array.from(buckets.entries())
        .map(([key, doc_count]) => ({ key, doc_count }))
        .sort((a, b) => b.doc_count - a.doc_count),
    };
  }

  private metricAggregation(hits: any[], type: string, field: string) {
    if (hits.length === 0) return null;

    const values = hits.map((hit) => hit._source[field]).filter((val) => typeof val === 'number');

    if (values.length === 0) return null;

    switch (type) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      default:
        return null;
    }
  }
}

export const globalAggregator = new Aggregator();
