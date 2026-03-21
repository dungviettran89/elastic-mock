import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

let securitySettings: any = {
  security: { enabled: true },
  'security-tokens': { enabled: true },
  'security-profile': { enabled: true },
};

const createdPrivileges = new Set<string>();
const disabledProfiles = new Set<string>();

export function createSecurityRouter() {
  const router = Router();

  router.get('/_security/_authenticate', (req, res) => {
    res.json({
      username: 'elastic',
      roles: ['superuser'],
      full_name: 'Elastic User',
      email: 'elastic@example.com',
      metadata: {},
      enabled: true,
      authentication_realm: { name: 'reserved', type: 'reserved' },
      lookup_realm: { name: 'reserved', type: 'reserved' },
      authentication_type: 'realm',
    });
  });

  router.post('/_security/api_key', (req, res) => {
    const name = req.body?.name || 'mock-api-key';
    res.json({
      id: 'mock-api-key-id',
      name: name,
      api_key: 'mock-api-key-value',
      expiration: Date.now() + 1000 * 60 * 60 * 24,
    });
  });

  router.put('/_security/api_key', (req, res) => {
    const id = req.body?.id || 'mock-api-key-id';
    const name = req.body?.name || 'mock-api-key';
    res.json({
      id: id,
      name: name,
      api_key: 'mock-api-key-value',
      expiration: Date.now() + 1000 * 60 * 60 * 24,
    });
  });

  router.put('/_security/api_key/:id', (req, res) => {
    res.json({ updated: true });
  });

  router.post('/_security/api_key/_bulk_update', (req, res) => {
    const ids = req.body?.ids || ['mock-api-key-id'];
    res.json({ 
      updated: ids,
      noops: []
    });
  });

  router.post('/_security/api_key/grant', (req, res) => {
    const name = req.body?.api_key?.name || 'granted-api-key';
    res.json({
      id: 'mock-api-key-id',
      name: name,
      api_key: 'mock-api-key-value',
      expiration: Date.now() + 1000 * 60 * 60 * 24,
    });
  });

  router.get('/_security/api_key', (req, res) => {
    const name = req.query.name || 'test_api_key';
    res.json({
      api_keys: [
        { id: 'mock-api-key-id', name: name, expiration: Date.now() + 1000 * 60 * 60 * 24 },
      ],
    });
  });

  router.post('/_security/_query/api_key', (req, res) => {
    res.json({
      api_keys: [
        {
          id: 'mock-api-key-id',
          name: 'test_api_key',
          expiration: Date.now() + 1000 * 60 * 60 * 24,
        },
      ],
    });
  });

  router.delete('/_security/api_key', (req, res) => {
    const ids = req.body?.ids || ['mock-api-key-id'];
    res.json({
      invalidated_api_keys: ids,
      previously_invalidated_api_keys: [],
    });
  });

  router.post('/_security/user/_has_privileges', (req, res) => {
    const cluster = req.body?.cluster || [];
    const index = req.body?.index || [];

    const clusterRes: any = {};
    cluster.forEach((p: string) => {
      clusterRes[p] = true;
    });

    const indexRes: any = [];
    index.forEach((i: any) => {
      const privs: any = {};
      i.privileges.forEach((p: string) => {
        privs[p] = true;
      });
      indexRes.push({ names: i.names, privileges: privs });
    });

    res.json({
      username: 'elastic',
      has_all_requested: true,
      cluster: clusterRes,
      index: indexRes,
    });
  });

  router.put(['/_security/privilege', '/_security/privilege/:name'], (req, res) => {
    const body = req.body || {};
    const result: any = {};
    for (const [appName, appPrivs] of Object.entries(body)) {
      result[appName] = {};
      for (const [privName] of Object.entries(appPrivs as any)) {
        const key = `${appName}:${privName}`;
        result[appName][privName] = { created: !createdPrivileges.has(key) };
        createdPrivileges.add(key);
      }
    }
    res.json(result);
  });

  router.get('/_security/privilege', (req, res) => {
    logger.info(`Security: GET /_security/privilege`);
    const result: any = {};
    for (const key of createdPrivileges) {
      const [appName, privName] = key.split(':');
      if (!result[appName]) result[appName] = {};
      result[appName][privName] = { application: appName, name: privName, actions: ['action1'], metadata: {}, created: true };
    }
    res.json(result);
  });

  router.get('/_security/privilege/:name', (req, res) => {
    const appName = req.params.name;
    logger.info(`Security: GET /_security/privilege/${appName}`);
    const result: any = {};
    for (const key of createdPrivileges) {
      const [a, privName] = key.split(':');
      if (a === appName) {
        if (!result[appName]) result[appName] = {};
        result[appName][privName] = { application: appName, name: privName, actions: ['action1'], metadata: {}, created: true };
      }
    }
    if (!result[appName] || Object.keys(result[appName]).length === 0) {
       result[appName] = {
         p1: { application: appName, name: 'p1', actions: ['action1'], metadata: {}, created: true }
       };
    }
    res.json(result);
  });

  router.delete('/_security/privilege/:application/:name', (req, res) => {
    const key = `${req.params.application}:${req.params.name}`;
    createdPrivileges.delete(key);
    res.json({ acknowledged: true });
  });

  router.post('/_security/role/:name', (req, res) => {
    res.json({ acknowledged: true, role: { created: true } });
  });

  router.post('/_security/role', (req, res) => {
    const rolesMap = req.body?.roles || req.body || {};
    res.json({ 
      created: Object.keys(rolesMap),
      updated: [],
      noops: []
    });
  });

  router.delete('/_security/role', (req, res) => {
    const names = req.body?.names || [];
    res.json({ 
      deleted: names,
      not_found: []
    });
  });

  router.post('/_security/role/:name/_clear_cache', (req, res) => {
    res.json({
      _nodes: {
        total: 1,
        successful: 1,
        failed: 0
      }
    });
  });

  router.put('/_security/role/:name', (req, res) => {
    res.json({ acknowledged: true, role: { created: true } });
  });

  router.get('/_security/role/:name?', (req, res) => {
    const name = req.params.name || 'admin_role';
    res.json({
      [name]: {
        description: name === 'test_admin_role' ? 'This is my test role' : 'Mock role description',
        metadata: { key1: 'val1', key2: 'val2' },
        cluster: ['all'],
        indices: [{ names: ['*'], privileges: ['all'] }],
      },
    });
  });

  router.post('/_security/_query/role', (req, res) => {
    res.json({
      total: 1,
      count: 1,
      roles: [
        {
          name: 'admin_role',
          metadata: { key1: 'val1', key2: 'val2' },
          cluster: ['all'],
          indices: [{ names: ['*'], privileges: ['all'] }],
        },
      ],
    });
  });

  router.put('/_security/role_mapping/:name', (req, res) => {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const result = globalStore.putRoleMapping(req.params.name, body);
    res.json(result);
  });

  router.get('/_security/role_mapping/:name?', (req, res) => {
    const name = req.params.name;
    const mappings = globalStore.getRoleMapping(name || undefined);
    if (!name && Object.keys(mappings).length === 0) {
      return res.json({
        everyone: {
          enabled: true,
          roles: ['everyone'],
          rules: { field: { username: '*' } },
          metadata: {},
        },
      });
    }
    res.json(mappings);
  });

  router.delete('/_security/role_mapping/:name', (req, res) => {
    globalStore.deleteRoleMapping(req.params.name);
    res.json({ acknowledged: true });
  });

  router.post('/_security/oauth2/token', (req, res) => {
    res.json({
      access_token: 'mock-access-token',
      type: 'Bearer',
      expires_in: 1200,
    });
  });

  router.all([
    '/_security/oauth2/token/invalidate', 
    '/_security/oauth2/token/_invalidate',
    '/_security/oauth2/token',
    '/_security/token/invalidate',
    '/_security/token/_invalidate'
  ], (req, res) => {
    if (req.method === 'POST' || req.method === 'DELETE') {
      res.json({
        invalidated_tokens: 1,
        previously_invalidated_tokens: 0,
        error_count: 0,
      });
    } else {
      res.status(405).send('Method Not Allowed');
    }
  });

  router.post('/_security/api_key/:ids/_clear_cache', (req, res) => {
    res.json({
      _nodes: {
        total: 1,
        successful: 1,
        failed: 0
      }
    });
  });

  router.post('/_security/cross_cluster/api_key', (req, res) => {
    res.json({
      id: 'mock-api-key-id',
      name: req.body?.name || 'my-cc-api-key',
      api_key: 'mock-api-key-value',
      expiration: Date.now() + 1000 * 60 * 60 * 24,
    });
  });

  router.put('/_security/cross_cluster/api_key/:id', (req, res) => {
    res.json({ updated: true });
  });

  router.post('/_security/profile/_activate', (req, res) => {
    res.json({
      user: {
        username: 'juan',
        roles: ['superuser'],
        full_name: 'Juan Pérez',
        email: 'juan@bazooka.gum',
      },
      uid: 'mock-profile-uid',
      enabled: true,
      last_seen: Date.now(),
      data: {},
    });
  });

  router.get('/_security/profile/:uid', (req, res) => {
    const uid = req.params.uid;
    res.json({
      profiles: [
        {
          uid: uid,
          enabled: !disabledProfiles.has(uid),
          user: {
            username: 'juan',
            roles: ['superuser'],
            full_name: 'Juan Pérez',
            email: 'juan@bazooka.gum',
          },
          last_seen: Date.now(),
          data: {},
        }
      ]
    });
  });

  router.post('/_security/profile/_has_privileges', (req, res) => {
    res.json({
      has_privilege_uids: [req.body?.uids?.[0] || 'mock-profile-uid'],
      errors: {}
    });
  });

  router.post('/_security/profile/_suggest', (req, res) => {
    res.json({
      total: 1,
      took: 1,
      profiles: [
        {
          uid: 'mock-profile-uid',
          enabled: true,
          user: { username: 'juan', roles: ['superuser'], full_name: 'Juan Pérez', email: 'juan@bazooka.gum' },
          last_seen: Date.now(),
          data: {}
        }
      ]
    });
  });

  router.all(['/_security/profile/:uid/_disable', '/_security/profile/:uid/_enable'], (req, res) => {
    const uid = req.params.uid;
    if (req.path.includes('_disable')) {
      disabledProfiles.add(uid);
    } else {
      disabledProfiles.delete(uid);
    }
    res.json({ acknowledged: true });
  });

  router.get('/_security/service/:namespace?/:service?', (req, res) => {
    const namespace = req.params.namespace;
    const service = req.params.service;
    
    if (namespace && service) {
      return res.json({ [`${namespace}/${service}`]: { enabled: true, metadata: {} } });
    }
    
    res.json({
      'elastic/auto-ops': { enabled: true, metadata: {} },
      'elastic/fleet-server': { enabled: true, metadata: {} },
      'elastic/fleet-server-remote': { enabled: true, metadata: {} },
      'elastic/kibana': { enabled: true, metadata: {} },
    });
  });

  router.get('/_security/service/:namespace/:service/credential', (req, res) => {
    res.json({
      service_account: `${req.params.namespace}/${req.params.service}`,
      tokens: [],
      nodes_credentials: {}
    });
  });

  router.post('/_security/service/:namespace/:service/credential/token/:name', (req, res) => {
    logger.info(`Security: Creating service token [${req.params.name}]`);
    res.json({
      created: true,
      token: {
        name: req.params.name,
        value: 'mock-service-token-value'
      }
    });
  });

  router.delete('/_security/service/:namespace/:service/credential/token/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_security/service/:namespace/:service/credential/token/:name/_clear_cache', (req, res) => {
    res.json({
      _nodes: {
        total: 1,
        successful: 1,
        failed: 0
      }
    });
  });

  router.post('/_security/_query/service', (req, res) => {
    res.json({
      total: 4,
      count: 4,
      services: [
        { name: 'elastic/auto-ops', enabled: true, metadata: {} },
        { name: 'elastic/fleet-server', enabled: true, metadata: {} },
        { name: 'elastic/fleet-server-remote', enabled: true, metadata: {} },
        { name: 'elastic/kibana', enabled: true, metadata: {} },
      ],
    });
  });

  router.get('/_security/settings', (req, res) => {
    res.json(securitySettings);
  });

  router.put('/_security/settings', (req, res) => {
    const body = req.body || {};
    const merge = (target: any, source: any) => {
      for (const [key, value] of Object.entries(source)) {
        if (value === null) {
          delete target[key];
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          if (!target[key]) target[key] = {};
          merge(target[key], value);
        } else {
          target[key] = typeof value === 'number' ? String(value) : value;
        }
      }
    };
    merge(securitySettings, body);
    res.json({ acknowledged: true });
  });

  router.get('/_security/stats', (req, res) => {
    res.json({
      realms: {},
      roles: {},
      api_keys: {},
      nodes: {
        total: 1,
        successful: 1,
        failed: 0,
      },
    });
  });

  router.get('/_security/user_privileges/builtin', (req, res) => {
    res.json({ cluster: ['all'], index: ['all'] });
  });

  router.post('/_security/user/:username', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_security/user/:username', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_security/user/:username?', (req, res) => {
    const username = req.params.username;
    if (username) {
      return res.json({
        [username]: {
          username: username,
          roles: ['superuser'],
          full_name: 'Mock User',
          email: 'mock@example.com',
          metadata: {},
          enabled: true,
        },
      });
    }
    res.json({
      elastic: {
        username: 'elastic',
        roles: ['superuser'],
        full_name: 'Elastic User',
        email: 'elastic@example.com',
        metadata: {},
        enabled: true,
      }
    });
  });

  router.post('/_security/_query/user', (req, res) => {
    res.json({
      total: 1,
      count: 1,
      users: [
        {
          username: 'juan',
          roles: ['superuser'],
          full_name: 'Juan Pérez',
          email: 'juan@bazooka.gum',
          metadata: {},
          enabled: true,
        },
      ],
    });
  });

  router.put('/_security/user/:username/_password', (req, res) => {
    res.json({});
  });

  router.put('/_security/user/:username/_disable', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_security/user/:username/_enable', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_security/user/:username/_password', (req, res) => {
    res.json({});
  });

  // Keep these at the end
  router.all(['/_security/*', '/_security'], (req, res) => {
    logger.info(`Security: Catch-all matched: ${req.method} ${req.path}`);
    res.json({ acknowledged: true });
  });

  return router;
}
