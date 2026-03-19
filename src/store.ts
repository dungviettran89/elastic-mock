import { Document } from 'flexsearch';
import { globalAggregator } from './aggregator.js';
import { logger } from './logger.js';

export interface IndexState {
  name: string;
  settings: any;
  mappings: any;
  aliases: Set<string>;
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
    const aliases = new Set<string>();

    if (body.aliases) {
      Object.keys(body.aliases).forEach((alias) => aliases.add(alias));
    }

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
      aliases,
      documents: new Map(),
      searchIndex,
    });
  }

  getIndex(name: string): IndexState | undefined {
    // 1. Direct match
    if (this.indices.has(name)) {
      return this.indices.get(name);
    }

    // 2. Alias match
    for (const index of this.indices.values()) {
      if (index.aliases.has(name)) {
        return index;
      }
    }

    return undefined;
  }

  hasIndex(name: string): boolean {
    return !!this.getIndex(name);
  }

  addAlias(indexName: string, aliasName: string) {
    const index = this.indices.get(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }
    index.aliases.add(aliasName);
  }

  removeAlias(indexName: string, aliasName: string) {
    const index = this.indices.get(indexName);
    if (index) {
      index.aliases.delete(aliasName);
    }
  }

  getAliases(indexName: string): string[] {
    const index = this.indices.get(indexName);
    return index ? Array.from(index.aliases) : [];
  }

  deleteIndex(name: string): boolean {
    return this.indices.delete(name);
  }

  updateMapping(indexName: string, mapping: any) {
    const index = this.indices.get(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }

    if (mapping.properties) {
      index.mappings.properties = {
        ...index.mappings.properties,
        ...mapping.properties,
      };

      // Re-initialize search index with updated fields
      index.searchIndex = new (Document as any)({
        document: {
          id: 'id',
          index: this.extractIndexedFields(index.mappings),
          store: false,
        },
        tokenize: 'forward',
      });

      // Re-index existing documents
      for (const [id, doc] of index.documents.entries()) {
        index.searchIndex.add({ id, ...doc });
      }
    }
  }

  getAllIndices(): IndexState[] {
    return Array.from(this.indices.values());
  }

  indexDocument(indexName: string, id: string | undefined, body: any) {
    let index = this.getIndex(indexName);
    if (!index) {
      logger.info(`Documents: Auto-indexing in [${indexName}]`);
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
      _index: index.name,
      _id: docId,
      _version: isUpdate ? 2 : 1,
      result: isUpdate ? 'updated' : 'created',
      _shards: { total: 1, successful: 1, failed: 0 },
      _seq_no: 0,
      _primary_term: 1,
    };
  }

  mget(body: any) {
    const docs = body.docs || [];
    const results = docs.map((doc: any) => {
      const index = this.getIndex(doc._index);
      if (index) {
        const source = index.documents.get(doc._id);
        if (source) {
          return {
            _index: index.name,
            _id: doc._id,
            _version: 1,
            _seq_no: 0,
            _primary_term: 1,
            found: true,
            _source: source,
          };
        }
      }
      return {
        _index: doc._index,
        _id: doc._id,
        found: false,
      };
    });
    return { docs: results };
  }

  msearch(body: any[], fallbackIndex?: string) {
    const responses: any[] = [];
    // body is an array of [header, query, header, query, ...]
    for (let i = 0; i < body.length; i += 2) {
      const header = body[i];
      const query = body[i + 1];
      const indexName = header.index || fallbackIndex;

      try {
        if (!indexName) {
          throw new Error('No index provided in header or URL');
        }
        const result = this.search(indexName, query);
        responses.push(result);
      } catch (error: any) {
        responses.push({
          error: {
            root_cause: [{ type: 'search_phase_execution_exception', reason: error.message }],
            type: 'search_phase_execution_exception',
            reason: error.message,
          },
          status: 400,
        });
      }
    }
    return { responses };
  }

  updateByQuery(indexName: string, body: any) {
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }

    const count = index.documents.size;
    return {
      took: 1,
      timed_out: false,
      total: count,
      updated: count,
      deleted: 0,
      batches: 1,
      version_conflicts: 0,
      noops: 0,
      retries: { bulk: 0, search: 0 },
      throttled_millis: 0,
      requests_per_second: -1.0,
      throttled_until_millis: 0,
      failures: [],
    };
  }

  deleteByQuery(indexName: string, body: any) {
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }

    const count = index.documents.size;
    // We'll simulate deleting only 1 document if many exist
    const deletedCount = count > 0 ? 1 : 0;

    if (deletedCount > 0) {
      // Actually delete the first document found just to be somewhat real
      const firstId = index.documents.keys().next().value;
      if (firstId) {
        index.documents.delete(firstId);
        index.searchIndex.remove(firstId);
      }
    }

    return {
      took: 1,
      timed_out: false,
      total: count,
      deleted: deletedCount,
      batches: 1,
      version_conflicts: 0,
      noops: 0,
      retries: { bulk: 0, search: 0 },
      throttled_millis: 0,
      requests_per_second: -1.0,
      throttled_until_millis: 0,
      failures: [],
    };
  }

  search(indexName: string, body: any) {
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }

    let query = body.query;
    if (!query) {
      if (body.q) {
        // Handle ?q=term
        query = {
          multi_match: {
            query: body.q,
            fields: ['*'],
          },
        };
      } else {
        query = { match_all: {} };
      }
    }

    const from = body.from || 0;
    const size = body.size !== undefined ? body.size : 10;

    let hits: any[] = [];

    if (query.match_all) {
      hits = Array.from(index.documents.entries()).map(([id, doc]) => ({
        _index: index.name,
        _id: id,
        _score: 1.0,
        _source: doc,
      }));
    } else if (query.match || query.multi_match) {
      let term: string;
      let searchFields: string[] = [];

      if (query.match) {
        const [field, t] = Object.entries(query.match)[0];
        term = t as string;
        searchFields = [field];
      } else {
        term = query.multi_match.query;
        searchFields = query.multi_match.fields || [];
      }

      const searchOptions: any = {};
      if (searchFields.length > 0 && !searchFields.includes('*')) {
        searchOptions.index = searchFields;
      }

      const results = index.searchIndex.search(term, searchOptions);

      const matchedIds = new Set<string>();
      if (Array.isArray(results)) {
        results.forEach((res: any) => {
          if (res.result) {
            res.result.forEach((id: string) => matchedIds.add(id));
          } else if (typeof res === 'string') {
            matchedIds.add(res);
          }
        });
      }

      hits = Array.from(matchedIds).map((id) => ({
        _index: index.name,
        _id: id,
        _score: 1.0,
        _source: index.documents.get(id),
      }));
    } else if (query.term) {
      const [field, value] = Object.entries(query.term)[0];
      hits = Array.from(index.documents.entries())
        .filter(([_, doc]) => doc[field] === value)
        .map(([id, doc]) => ({
          _index: index.name,
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
          if (Array.isArray(should) && should.length > 0) {
            let matched = false;
            for (const q of should) {
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
          _index: index.name,
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

  getDocument(indexName: string, id: string) {
    const index = this.getIndex(indexName);
    if (!index) return null;

    const doc = index.documents.get(id);
    if (!doc) {
      return {
        _index: index.name,
        _id: id,
        found: false,
      };
    }

    return {
      _index: index.name,
      _id: id,
      found: true,
      _version: 1,
      _seq_no: 0,
      _primary_term: 1,
      _source: doc,
    };
  }

  private deepMerge(target: any, source: any) {
    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object && key in target) {
        Object.assign(source[key], this.deepMerge(target[key], source[key]));
      }
    }
    Object.assign(target || {}, source);
    return target;
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
    // Deep merge for better ES compatibility
    const updatedDoc = JSON.parse(JSON.stringify(existingDoc));
    this.deepMerge(updatedDoc, updateDoc);

    // 1. Store in the document map
    index.documents.set(id, updatedDoc);

    // 2. Update FlexSearch index
    try {
      index.searchIndex.update({ id, ...updatedDoc });
    } catch (e) {
      console.error(`FlexSearch error updating ${id}:`, e);
    }

    return {
      _index: index.name,
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
      _index: index.name,
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

  getTotalDocCount(): number {
    let total = 0;
    for (const index of this.indices.values()) {
      total += index.documents.size;
    }
    return total;
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

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private extractIndexedFields(mappings: any): string[] {
    if (!mappings?.properties || Object.keys(mappings.properties).length === 0) {
      // Default common fields for dynamic indexing
      return [
        'name',
        'title',
        'content',
        'description',
        'message',
        'author',
        'foo',
        'bar',
        'service',
      ];
    }
    return Object.entries(mappings.properties)
      .filter(([_, value]: [string, any]) => value.type === 'text' || value.type === 'keyword')
      .map(([key, _]) => key);
  }
}

export const globalStore = new Store();
