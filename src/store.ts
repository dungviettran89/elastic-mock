import { Document } from 'flexsearch';
import { globalAggregator } from './aggregator.js';

export interface IndexState {
  name: string;
  settings: any;
  mappings: any;
  documents: Map<string, any>;
  searchIndex: any; // FlexSearch Document instance
}

export class Store {
  private indices: Map<string, IndexState> = new Map();

  createIndex(name: string, body: any) {
    if (this.indices.has(name)) {
      throw new Error(`Index [${name}] already exists`);
    }

    const mappings = body.mappings || { properties: {} };
    const settings = body.settings || { number_of_shards: 1, number_of_replicas: 0 };

    // Initialize FlexSearch based on mappings
    const searchIndex = new (Document as any)({
      document: {
        id: 'id',
        index: this.extractIndexedFields(mappings),
        store: false, // We already store docs in the Map
      },
      tokenize: 'forward',
    });

    this.indices.set(name, {
      name,
      settings,
      mappings,
      documents: new Map(),
      searchIndex,
    });
  }

  getIndex(name: string): IndexState | undefined {
    return this.indices.get(name);
  }

  hasIndex(name: string): boolean {
    return this.indices.has(name);
  }

  deleteIndex(name: string): boolean {
    return this.indices.delete(name);
  }

  getAllIndices(): IndexState[] {
    return Array.from(this.indices.values());
  }

  indexDocument(indexName: string, id: string | undefined, body: any) {
    let index = this.getIndex(indexName);
    if (!index) {
      this.createIndex(indexName, {});
      index = this.getIndex(indexName)!;
    }

    const docId = id || this.generateId();
    const isUpdate = index.documents.has(docId);

    // 1. Store in the document map
    index.documents.set(docId, body);

    // 2. Add to FlexSearch index
    try {
      index.searchIndex.add({ id: docId, ...body });
    } catch (e) {
      console.error(`FlexSearch error indexing ${docId}:`, e);
    }

    return {
      _index: indexName,
      _id: docId,
      _version: 1,
      result: isUpdate ? 'updated' : 'created',
    };
  }

  getDocument(indexName: string, id: string) {
    const index = this.getIndex(indexName);
    if (!index) return null;

    const doc = index.documents.get(id);
    if (!doc) {
      return {
        _index: indexName,
        _id: id,
        found: false,
      };
    }

    return {
      _index: indexName,
      _id: id,
      found: true,
      _version: 1,
      _seq_no: 0,
      _primary_term: 1,
      _source: doc,
    };
  }

  updateDocument(indexName: string, id: string, body: any) {
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }

    const existingDoc = index.documents.get(id);
    if (!existingDoc) {
      throw new Error(`Document [${id}] not found in index [${indexName}]`);
    }

    const updateDoc = body.doc || {};
    const updatedDoc = { ...existingDoc, ...updateDoc };

    // 1. Store in the document map
    index.documents.set(id, updatedDoc);

    // 2. Update FlexSearch index
    try {
      index.searchIndex.update({ id, ...updatedDoc });
    } catch (e) {
      console.error(`FlexSearch error updating ${id}:`, e);
    }

    return {
      _index: indexName,
      _id: id,
      _version: 2,
      result: 'updated',
    };
  }

  deleteDocument(indexName: string, id: string) {
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }

    const exists = index.documents.has(id);

    if (exists) {
      index.documents.delete(id);
      index.searchIndex.remove(id);
    }

    return {
      _index: indexName,
      _id: id,
      _version: 1,
      found: exists,
      result: exists ? 'deleted' : 'not_found',
    };
  }

  getDocCount(indexName: string): number {
    const index = this.getIndex(indexName);
    return index ? index.documents.size : 0;
  }

  bulk(body: any[]) {
    const results: any[] = [];
    let hasErrors = false;

    for (let i = 0; i < body.length; i++) {
      const actionLine = body[i];
      const opType = Object.keys(actionLine)[0];
      const opMetadata = actionLine[opType];
      const indexName = opMetadata._index;
      const id = opMetadata._id;

      try {
        if (opType === 'index' || opType === 'create') {
          const data = body[++i];
          const res = this.indexDocument(indexName, id, data);
          results.push({ [opType]: res });
        } else if (opType === 'update') {
          const data = body[++i];
          const res = this.updateDocument(indexName, id, data);
          results.push({ update: res });
        } else if (opType === 'delete') {
          const res = this.deleteDocument(indexName, id);
          results.push({ delete: res });
        }
      } catch (e: any) {
        hasErrors = true;
        results.push({
          [opType]: {
            _index: indexName,
            _id: id,
            status: 400,
            error: {
              type: 'bulk_operation_exception',
              reason: e.message,
            },
          },
        });
      }
    }

    return {
      took: 1,
      errors: hasErrors,
      items: results,
    };
  }

  search(indexName: string, body: any) {
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }

    const query = body.query || { match_all: {} };
    const from = body.from || 0;
    const size = body.size !== undefined ? body.size : 10;

    let hits: any[] = [];

    if (query.match_all) {
      hits = Array.from(index.documents.entries()).map(([id, doc]) => ({
        _index: indexName,
        _id: id,
        _score: 1.0,
        _source: doc,
      }));
    } else if (query.match) {
      const [field, term] = Object.entries(query.match)[0];
      const results = index.searchIndex.search(term, { index: [field as string] });

      // FlexSearch returns results in a specific format depending on configuration
      // With our config, it returns an array of { field: string, result: string[] }
      const matchedIds = new Set<string>();
      results.forEach((res: any) => {
        res.result.forEach((id: string) => matchedIds.add(id));
      });

      hits = Array.from(matchedIds).map((id) => ({
        _index: indexName,
        _id: id,
        _score: 1.0, // FlexSearch has scores but we'll simplify for now
        _source: index.documents.get(id),
      }));
    } else if (query.term) {
      const [field, value] = Object.entries(query.term)[0];
      hits = Array.from(index.documents.entries())
        .filter(([_, doc]) => doc[field] === value)
        .map(([id, doc]) => ({
          _index: indexName,
          _id: id,
          _score: 1.0,
          _source: doc,
        }));
    } else if (query.bool) {
      // Basic bool support
      const must = query.bool.must || [];
      const filter = query.bool.filter || [];
      const mustNot = query.bool.must_not || [];
      const should = query.bool.should || [];

      hits = Array.from(index.documents.entries())
        .filter(([id, doc]) => {
          // Must
          for (const q of Array.isArray(must) ? must : [must]) {
            if (q.term) {
              const [f, v] = Object.entries(q.term)[0];
              if (doc[f] !== v) return false;
            }
          }
          // Filter
          for (const q of Array.isArray(filter) ? filter : [filter]) {
            if (q.term) {
              const [f, v] = Object.entries(q.term)[0];
              if (doc[f] !== v) return false;
            }
          }
          // Must Not
          for (const q of Array.isArray(mustNot) ? mustNot : [mustNot]) {
            if (q.term) {
              const [f, v] = Object.entries(q.term)[0];
              if (doc[f] === v) return false;
            }
          }
          // Should
          if (should.length > 0) {
            let matched = false;
            for (const q of Array.isArray(should) ? should : [should]) {
              if (q.term) {
                const [f, v] = Object.entries(q.term)[0];
                if (doc[f] === v) {
                  matched = true;
                  break;
                }
              }
            }
            if (!matched) return false;
          }
          return true;
        })
        .map(([id, doc]) => ({
          _index: indexName,
          _id: id,
          _score: 1.0,
          _source: doc,
        }));
    }

    const totalHits = hits.length;
    const paginatedHits = hits.slice(from, from + size);

    const response: any = {
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: totalHits,
          relation: 'eq',
        },
        max_score: totalHits > 0 ? 1.0 : null,
        hits: paginatedHits,
      },
    };

    if (body.aggs || body.aggregations) {
      response.aggregations = globalAggregator.process(hits, body.aggs || body.aggregations);
    }

    return response;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private extractIndexedFields(mappings: any): string[] {
    if (!mappings?.properties) return [];
    return Object.entries(mappings.properties)
      .filter(([_, value]: [string, any]) => value.type === 'text' || value.type === 'keyword')
      .map(([key, _]) => key);
  }
}

export const globalStore = new Store();
