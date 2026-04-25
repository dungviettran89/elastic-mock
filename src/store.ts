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
  status: 'open' | 'close';
}

export class Store {
  private indices: Map<string, IndexState> = new Map();
  private templates: Map<string, any> = new Map();
  private indexTemplates: Map<string, any> = new Map();
  private componentTemplates: Map<string, any> = new Map();
  private ingestPipelines: Map<string, any> = new Map();
  private geoipDatabases: Map<string, any> = new Map();
  private synonymsSets: Map<string, any> = new Map();
  private synonymRules: Map<string, Map<string, any>> = new Map();
  private roleMappings: Map<string, any> = new Map();
  private disabledUsers: Set<string> = new Set();
  private tasks: Map<string, any> = new Map();
  private users: Map<string, any> = new Map();
  private dataStreams: Map<string, any> = new Map();

  // Data Stream Management
  createDataStream(name: string) {
    if (this.dataStreams.has(name)) return;

    // Find matching template
    let template: any = null;
    for (const tpl of this.indexTemplates.values()) {
      if (
        tpl.index_patterns &&
        tpl.index_patterns.some((pattern: string) => {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(name);
        })
      ) {
        template = tpl;
        break;
      }
    }

    const backingIndexName = `.ds-${name}-000001`;
    const mappings = template?.template?.mappings || { properties: {} };
    const settings = template?.template?.settings || { number_of_shards: 1, number_of_replicas: 0 };

    this.createIndex(backingIndexName, { mappings, settings });

    this.dataStreams.set(name, {
      name,
      indices: [backingIndexName],
      generation: 1,
      mappings,
      settings,
    });
  }

  getDataStream(name: string) {
    return this.dataStreams.get(name);
  }

  deleteDataStream(name: string) {
    const ds = this.dataStreams.get(name);
    if (ds) {
      ds.indices.forEach((idx: string) => this.deleteIndex(idx));
      return this.dataStreams.delete(name);
    }
    return false;
  }

  getAllDataStreams() {
    return Array.from(this.dataStreams.values());
  }

  // User Management
  putUser(username: string, body: any) {
    this.users.set(username, {
      username,
      password: body.password,
      roles: body.roles || [],
      full_name: body.full_name || '',
      email: body.email || '',
      metadata: body.metadata || {},
      enabled: true,
    });
  }

  changePassword(username: string, password: string) {
    const user = this.users.get(username);
    if (user) {
      user.password = password;
    } else {
      // Create user if not exists for simplicity in mock
      this.users.set(username, { username, password, roles: [], enabled: true });
    }
  }

  getUser(username: string) {
    return this.users.get(username);
  }

  deleteUser(username: string) {
    return this.users.delete(username);
  }

  getAllUsers(): any[] {
    return [...this.users.values()];
  }

  // Task Management
  createTask(action: string, description: string) {
    const taskId = `mock-task-id:${Math.floor(Math.random() * 1000000)}`;
    const task = {
      node: 'mock-node',
      id: taskId.split(':')[1],
      type: 'transport',
      action,
      status: {
        total: 0,
        updated: 0,
        created: 0,
        deleted: 0,
        batches: 1,
        version_conflicts: 0,
        noops: 0,
        retries: { bulk: 0, search: 0 },
        throttled_millis: 0,
        requests_per_second: -1,
        throttled_until_millis: 0,
      },
      description,
      start_time_in_millis: Date.now(),
      running_time_in_nanos: 0,
      cancellable: true,
      cancelled: false,
    };
    this.tasks.set(taskId, task);
    return taskId;
  }

  getTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    return {
      completed: true, // Mock tasks are always "completed" for simplicity in this mock
      task,
      response: {
        took: 1,
        timed_out: false,
        total: task.status.total,
        updated: task.status.updated,
        created: task.status.created,
        deleted: task.status.deleted,
        batches: task.status.batches,
        version_conflicts: task.status.version_conflicts,
        noops: task.status.noops,
        retries: task.status.retries,
        throttled_millis: task.status.throttled_millis,
        requests_per_second: task.status.requests_per_second,
        throttled_until_millis: task.status.throttled_until_millis,
        failures: [],
      },
    };
  }

  listTasks() {
    const tasks: any = {};
    for (const [id, task] of this.tasks.entries()) {
      tasks[id] = task;
    }
    return { nodes: { 'mock-node': { name: 'mock-node', tasks } } };
  }

  cancelTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.cancelled = true;
      return { nodes: { 'mock-node': { name: 'mock-node', tasks: { [taskId]: task } } } };
    }
    return { nodes: {} };
  }

  // User Management
  disableUser(username: string) {
    this.disabledUsers.add(username);
  }

  enableUser(username: string) {
    this.disabledUsers.delete(username);
  }

  isUserDisabled(username: string): boolean {
    return this.disabledUsers.has(username);
  }

  // Template Management
  // ...
  // (Assuming I can add it at the end of the class)
  putTemplate(name: string, body: any) {
    this.templates.set(name, body);
  }

  getTemplate(name: string): any {
    return this.templates.get(name);
  }

  getAllTemplates(): Map<string, any> {
    return this.templates;
  }

  deleteTemplate(name: string): boolean {
    return this.templates.delete(name);
  }

  putIndexTemplate(name: string, body: any) {
    this.indexTemplates.set(name, body);
  }

  getIndexTemplate(name: string): any {
    return this.indexTemplates.get(name);
  }

  getAllIndexTemplates(): Map<string, any> {
    return this.indexTemplates;
  }

  deleteIndexTemplate(name: string): boolean {
    return this.indexTemplates.delete(name);
  }

  // Component Template Management
  putComponentTemplate(name: string, body: any) {
    this.componentTemplates.set(name, body);
  }

  getComponentTemplate(name: string): any {
    return this.componentTemplates.get(name);
  }

  getAllComponentTemplates(): Map<string, any> {
    return this.componentTemplates;
  }

  deleteComponentTemplate(name: string): boolean {
    return this.componentTemplates.delete(name);
  }

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
      status: 'open',
    });
  }

  getIndex(name: string): IndexState | undefined {
    let searchName = name;
    if (name.endsWith('::failures')) {
      searchName = name.replace('::failures', '');
    }

    // 1. Direct match
    if (this.indices.has(searchName)) {
      return this.indices.get(searchName);
    }

    // 2. Alias match
    for (const index of this.indices.values()) {
      if (index.aliases.has(searchName)) {
        return index;
      }
    }

    // 3. Data stream match
    if (this.dataStreams.has(searchName)) {
      const ds = this.dataStreams.get(searchName);
      const lastIndex = ds.indices[ds.indices.length - 1];
      return this.indices.get(lastIndex);
    }

    return undefined;
  }

  closeIndex(name: string): boolean {
    const index = this.getIndex(name);
    if (index) {
      index.status = 'close';
      return true;
    }
    return false;
  }

  openIndex(name: string): boolean {
    const index = this.getIndex(name);
    if (index) {
      index.status = 'open';
      return true;
    }
    return false;
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

  updateByQuery(indexName: string, body: any, query: any = {}) {
    logger.info(`Store: updateByQuery index=${indexName} query=${JSON.stringify(query)}`);
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }

    const count = index.documents.size;
    const waitForCompletion =
      query.wait_for_completion !== 'false' && query.wait_for_completion !== false;

    if (!waitForCompletion) {
      const taskId = this.createTask(
        'indices:data/write/update/byquery',
        `update-by-query [${indexName}]`,
      );
      const task = this.tasks.get(taskId);
      task.status.total = count;
      task.status.updated = count;
      logger.info(`Store: created task ${taskId}`);
      return { task: taskId };
    }

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

  private matchesQuery(doc: any, query: any): boolean {
    if (!query) return true;

    if (query.match_all) {
      return true;
    }

    if (query.term) {
      const [field, value] = Object.entries(query.term)[0];
      return doc[field] === value;
    }

    if (query.match) {
      const [field, searchValue] = Object.entries(query.match)[0];
      const docValue = doc[field];
      if (docValue === undefined) return false;
      return String(docValue).toLowerCase().includes(String(searchValue).toLowerCase());
    }

    if (query.bool) {
      const must = query.bool.must || [];
      const filter = query.bool.filter || [];
      const mustNot = query.bool.must_not || [];
      const should = query.bool.should || [];

      // Must
      for (const q of Array.isArray(must) ? must : [must]) {
        if (!this.matchesQuery(doc, q)) return false;
      }
      // Filter
      for (const q of Array.isArray(filter) ? filter : [filter]) {
        if (!this.matchesQuery(doc, q)) return false;
      }
      // Must Not
      for (const q of Array.isArray(mustNot) ? mustNot : [mustNot]) {
        if (this.matchesQuery(doc, q)) return false;
      }
      // Should
      if (Array.isArray(should) && should.length > 0) {
        let matched = false;
        for (const q of should) {
          if (this.matchesQuery(doc, q)) {
            matched = true;
            break;
          }
        }
        if (!matched) return false;
      }
      return true;
    }

    // Default: don't match if we don't understand the query
    return false;
  }

  deleteByQuery(indexName: string, body: any, query: any = {}) {
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index [${indexName}] not found`);
    }

    const esQuery = body.query || { match_all: {} };
    const deletedIds: string[] = [];

    // Find all documents matching the query
    for (const [id, doc] of index.documents.entries()) {
      if (this.matchesQuery(doc, esQuery)) {
        deletedIds.push(id);
      }
    }

    // Delete matching documents
    for (const id of deletedIds) {
      index.documents.delete(id);
      index.searchIndex.remove(id);
    }

    const waitForCompletion = query.wait_for_completion !== 'false';
    if (!waitForCompletion) {
      const taskId = this.createTask(
        'indices:data/write/delete/byquery',
        `delete-by-query [${indexName}]`,
      );
      const task = this.tasks.get(taskId);
      task.status.total = deletedIds.length;
      task.status.deleted = deletedIds.length;
      return { task: taskId };
    }

    return {
      took: 1,
      timed_out: false,
      total: index.documents.size + deletedIds.length,
      deleted: deletedIds.length,
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
        total:
          body.rest_total_hits_as_int === 'true' || body.rest_total_hits_as_int === true
            ? totalHits
            : {
                value: totalHits,
                relation: 'eq',
              },
        max_score: totalHits > 0 ? 1.0 : null,
        hits: paginatedHits,
      },
    };

    if (body.pit) {
      response.pit_id = body.pit.id;
    }

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

  // Ingest Pipelines
  putPipeline(id: string, body: any) {
    this.ingestPipelines.set(id, body);
  }

  getPipeline(id: string): any {
    return this.ingestPipelines.get(id);
  }

  getAllPipelines(): Map<string, any> {
    return this.ingestPipelines;
  }

  deletePipeline(id: string): boolean {
    return this.ingestPipelines.delete(id);
  }

  // GeoIP Databases
  putGeoIPDatabase(id: string, body: any) {
    this.geoipDatabases.set(id, {
      ...body,
      modified_date_millis: Date.now(),
    });
  }

  getGeoIPDatabase(id?: string): any[] {
    if (id) {
      // Handle comma-separated IDs
      const ids = id.split(',').map((s) => s.trim());
      const databases: any[] = [];
      for (const dbId of ids) {
        const db = this.geoipDatabases.get(dbId);
        if (db) {
          databases.push({
            id: dbId,
            modified_date_millis: db.modified_date_millis,
            database: {
              name: db.name,
              maxmind: db.maxmind,
            },
          });
        }
      }
      return databases;
    }
    // Return all databases
    return Array.from(this.geoipDatabases.entries()).map(([dbId, db]: [string, any]) => ({
      id: dbId,
      modified_date_millis: db.modified_date_millis,
      database: {
        name: db.name,
        maxmind: db.maxmind,
      },
    }));
  }

  deleteGeoIPDatabase(id: string): boolean {
    return this.geoipDatabases.delete(id);
  }

  // Synonyms Sets
  putSynonymSet(id: string, body: any) {
    this.synonymsSets.set(id, {
      ...body,
      modified_time_millis: Date.now(),
    });
    return { result: 'created' };
  }

  getSynonymSet(id: string): any {
    const set = this.synonymsSets.get(id);
    if (!set) return null;
    return {
      ...set,
      modified_time_millis: set.modified_time_millis,
    };
  }

  getAllSynonymSets(): any[] {
    return Array.from(this.synonymsSets.entries()).map(([id, set]) => ({
      synonyms_set: id,
      modified_time_millis: set.modified_time_millis,
    }));
  }

  deleteSynonymSet(id: string): boolean {
    this.synonymRules.delete(id);
    return this.synonymsSets.delete(id);
  }

  // Synonym Rules
  putSynonymRule(setId: string, ruleId: string, body: any) {
    if (!this.synonymRules.has(setId)) {
      this.synonymRules.set(setId, new Map());
    }
    this.synonymRules.get(setId)!.set(ruleId, {
      ...body,
      modified_time_millis: Date.now(),
    });
    return { result: 'created' };
  }

  getSynonymRule(setId: string, ruleId: string): any {
    const setRules = this.synonymRules.get(setId);
    if (!setRules) return null;
    const rule = setRules.get(ruleId);
    if (!rule) return null;
    return { ...rule };
  }

  deleteSynonymRule(setId: string, ruleId: string): boolean {
    const setRules = this.synonymRules.get(setId);
    if (!setRules) return false;
    return setRules.delete(ruleId);
  }

  // Role Mappings
  putRoleMapping(name: string, body: any) {
    this.roleMappings.set(name, body);
    return { role_mapping: { created: true } };
  }

  getRoleMapping(name?: string): any {
    if (name) {
      const mapping = this.roleMappings.get(name);
      if (!mapping) return {};
      return { [name]: mapping };
    }
    // Return all mappings
    const result: any = {};
    for (const [name, mapping] of this.roleMappings.entries()) {
      result[name] = mapping;
    }
    return result;
  }

  deleteRoleMapping(name: string): boolean {
    return this.roleMappings.delete(name);
  }

  splitIndex(sourceIndexName: string, targetIndexName: string, body?: any) {
    const sourceIndex = this.indices.get(sourceIndexName);
    if (!sourceIndex) {
      throw new Error(`Index [${sourceIndexName}] not found`);
    }

    const newSettings = { ...sourceIndex.settings, ...(body?.settings || {}) };
    this.createIndex(targetIndexName, {
      mappings: sourceIndex.mappings,
      settings: newSettings,
    });

    const targetIndex = this.indices.get(targetIndexName);
    if (targetIndex) {
      for (const [id, doc] of sourceIndex.documents.entries()) {
        targetIndex.documents.set(id, doc);
        targetIndex.searchIndex.add({ id, ...doc });
      }
    }
  }

  rollover(alias: string, newIndexName?: string) {
    let searchName = alias;
    if (alias.endsWith('::failures')) {
      searchName = alias.replace('::failures', '');
    }

    if (this.dataStreams.has(searchName)) {
      const ds = this.dataStreams.get(searchName);
      ds.generation++;
      const nextIndexName = `.ds-${searchName}-${String(ds.generation).padStart(6, '0')}`;

      this.createIndex(nextIndexName, {
        mappings: ds.mappings,
        settings: ds.settings,
      });
      ds.indices.push(nextIndexName);

      return {
        old_index: ds.indices[ds.indices.length - 2],
        new_index: nextIndexName,
        rolled_over: true,
        dry_run: false,
        acknowledged: true,
        shards_acknowledged: true,
        conditions: {},
      };
    }

    const sourceIndex = this.getIndex(alias);
    if (!sourceIndex) {
      throw new Error(`Alias [${alias}] not found`);
    }

    let newName = newIndexName;
    if (!newName) {
      const match = sourceIndex.name.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2]);
        newName = `${prefix}${String(num + 1).padStart(6, '0')}`;
      } else {
        newName = `${sourceIndex.name}-000001`;
      }
    }

    this.createIndex(newName, {
      mappings: sourceIndex.mappings,
      settings: sourceIndex.settings,
    });

    // Move alias
    sourceIndex.aliases.delete(alias);
    const targetIndex = this.indices.get(newName)!;
    targetIndex.aliases.add(alias);

    return {
      old_index: sourceIndex.name,
      new_index: newName,
      rolled_over: true,
      dry_run: false,
      acknowledged: true,
      shards_acknowledged: true,
      conditions: {},
    };
  }

  cloneIndex(sourceIndexName: string, targetIndexName: string) {
    const sourceIndex = this.indices.get(sourceIndexName);
    if (!sourceIndex) {
      throw new Error(`Index [${sourceIndexName}] not found`);
    }

    this.createIndex(targetIndexName, {
      mappings: sourceIndex.mappings,
      settings: sourceIndex.settings,
    });

    const targetIndex = this.indices.get(targetIndexName);
    if (targetIndex) {
      for (const [id, doc] of sourceIndex.documents.entries()) {
        targetIndex.documents.set(id, doc);
        targetIndex.searchIndex.add({ id, ...doc });
      }
    }
  }
}

export const globalStore = new Store();
