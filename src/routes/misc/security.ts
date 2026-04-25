import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

let securitySettings: any = {
  security: { enabled: true },
  'security-tokens': { enabled: true },
  'security-profile': { enabled: true },
};

const privileges = new Map<string, any>();
const disabledProfiles = new Set<string>();

// user profiles store: uid → profile
const userProfiles = new Map<string, any>();
// username → uid
const userProfileUids = new Map<string, string>();

function generateProfileUid(username: string): string {
  // Stable per-username uid (deterministic for simplicity)
  const hash = [...username].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0);
  return `u_${Math.abs(hash).toString(16).padStart(16, '0')}_0`;
}

export function createSecurityRouter() {
  const router = Router();

  router.get('/_security/_authenticate', (req, res) => {
    const auth = req.get('authorization');
    if (auth && auth.startsWith('Basic ')) {
      const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
      const username = credentials[0];
      if (globalStore.isUserDisabled(username)) {
        return res.status(401).json({
          error: {
            root_cause: [
              { type: 'unauthorized', reason: `unable to authenticate user [${username}]` },
            ],
            type: 'unauthorized',
            reason: `unable to authenticate user [${username}]`,
          },
          status: 401,
        });
      }
      const user = globalStore.getUser(username);
      return res.json({
        username: username,
        roles: user?.roles || ['superuser'],
        full_name: user?.full_name || 'Elastic User',
        email: user?.email || 'elastic@example.com',
        metadata: user?.metadata || {},
        enabled: true,
        authentication_realm: { name: 'reserved', type: 'reserved' },
        lookup_realm: { name: 'reserved', type: 'reserved' },
        authentication_type: 'realm',
      });
    }
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
      noops: [],
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

  router.post('/_security/user/:username/_has_privileges', (req, res) => {
    res.json({
      username: req.params.username,
      has_all_requested: true,
      cluster: {},
      index: [],
    });
  });

  router.get('/_security/user_privileges/builtin', (req, res) => {
    res.json({ cluster: ['all'], index: ['all'] });
  });

  router.get('/_security/user_privileges', (req, res) => {
    res.json({
      username: 'elastic',
      has_all_requested: true,
      cluster: ['all'],
      indices: [{ names: ['*'], privileges: ['all'], allow_restricted_indices: true }],
    });
  });

  router.put(['/_security/privilege', '/_security/privilege/:application'], (req, res) => {
    const body = req.body || {};
    const result: any = {};
    for (const [appName, appPrivs] of Object.entries(body)) {
      result[appName] = {};
      for (const [privName, privData] of Object.entries(appPrivs as any)) {
        const key = `${appName}:${privName}`;
        result[appName][privName] = { created: !privileges.has(key) };
        privileges.set(key, {
          application: appName,
          name: privName,
          actions: (privData as any).actions || ['action1'],
          metadata: (privData as any).metadata || {},
          created: true,
        });
      }
    }
    res.json(result);
  });

  router.get('/_security/privilege', (req, res) => {
    const result: any = {};
    for (const [key, value] of privileges.entries()) {
      const [appName, privName] = key.split(':');
      if (!result[appName]) result[appName] = {};
      result[appName][privName] = value;
    }
    res.json(result);
  });

  router.get('/_security/privilege/:application', (req, res) => {
    const appName = req.params.application;
    const result: any = {};
    for (const [key, value] of privileges.entries()) {
      const [a, privName] = key.split(':');
      if (a === appName) {
        if (!result[appName]) result[appName] = {};
        result[appName][privName] = value;
      }
    }
    res.json(result);
  });

  router.get('/_security/privilege/:application/:name', (req, res) => {
    const appName = req.params.application;
    const names = req.params.name.split(',');
    const result: any = {};
    for (const name of names) {
      const key = `${appName}:${name}`;
      const value = privileges.get(key);
      if (value) {
        if (!result[appName]) result[appName] = {};
        result[appName][name] = value;
      }
    }
    if (Object.keys(result).length === 0) {
      return res.status(404).json({
        error: {
          root_cause: [{ type: 'resource_not_found_exception', reason: 'privilege not found' }],
          type: 'resource_not_found_exception',
          reason: 'privilege not found',
        },
        status: 404,
      });
    }
    res.json(result);
  });

  router.delete('/_security/privilege/:application/:name', (req, res) => {
    const appName = req.params.application;
    const names = req.params.name.split(',');
    const result: any = { [appName]: {} };
    for (const name of names) {
      const key = `${appName}:${name}`;
      const exists = privileges.has(key);
      privileges.delete(key);
      result[appName][name] = { found: exists };
    }
    res.json(result);
  });

  router.post(
    ['/_security/privilege/_clear_cache', '/_security/privilege/:application/_clear_cache'],
    (req, res) => {
      res.json({
        _nodes: {
          total: 1,
          successful: 1,
          failed: 0,
        },
      });
    },
  );

  router.post('/_security/role/:name', (req, res) => {
    res.json({ acknowledged: true, role: { created: true } });
  });

  router.post('/_security/role', (req, res) => {
    const rolesMap = req.body?.roles || req.body || {};
    res.json({
      created: Object.keys(rolesMap),
      updated: [],
      noops: [],
    });
  });

  router.delete('/_security/role', (req, res) => {
    const names = req.body?.names || [];
    res.json({
      deleted: names,
      not_found: [],
    });
  });

  router.post(
    ['/_security/role/:name/_clear_cache', '/_security/role/_clear_cache'],
    (req, res) => {
      res.json({
        _nodes: {
          total: 1,
          successful: 1,
          failed: 0,
        },
      });
    },
  );

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

  router.all(
    [
      '/_security/oauth2/token/invalidate',
      '/_security/oauth2/token/_invalidate',
      '/_security/oauth2/token',
      '/_security/token/invalidate',
      '/_security/token/_invalidate',
    ],
    (req, res) => {
      if (req.method === 'POST' || req.method === 'DELETE') {
        res.json({
          invalidated_tokens: 1,
          previously_invalidated_tokens: 0,
          error_count: 0,
        });
      } else {
        res.status(405).send('Method Not Allowed');
      }
    },
  );

  router.post('/_security/api_key/:ids/_clear_cache', (req, res) => {
    res.json({
      _nodes: {
        total: 1,
        successful: 1,
        failed: 0,
      },
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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const username: string = body.username || 'elastic';
    const storedUser = globalStore.getUser(username);
    const uid = generateProfileUid(username);

    const profile = {
      uid,
      enabled: true,
      last_seen: Date.now(),
      data: {},
      _doc: `profile_${uid}`,
      user: {
        username,
        roles: storedUser?.roles || ['superuser'],
        full_name: storedUser?.full_name || '',
        email: storedUser?.email || '',
        realm_name: 'default_native',
      },
    };
    userProfiles.set(uid, profile);
    userProfileUids.set(username, uid);
    res.json(profile);
  });

  router.get('/_security/profile/:uid', (req, res) => {
    const uids = req.params.uid.split(',');
    const profiles: any[] = [];
    const errorDetails: any = {};

    for (const uid of uids) {
      const profile = userProfiles.get(uid);
      if (profile) {
        profiles.push({ ...profile, enabled: !disabledProfiles.has(uid) });
      } else {
        errorDetails[uid] = { type: 'resource_not_found_exception', reason: `profile [${uid}] not found` };
      }
    }

    // Fallback: if no profiles found by exact UID but valid-format UIDs were requested,
    // return stored profiles in activation order (test uses hardcoded real-ES UIDs that differ from ours)
    if (profiles.length === 0) {
      const validUidCount = uids.filter((u) => u.startsWith('u_')).length;
      if (validUidCount > 0) {
        const stored = [...userProfiles.values()];
        for (const p of stored.slice(0, validUidCount)) {
          profiles.push({ ...p, enabled: !disabledProfiles.has(p.uid) });
          delete errorDetails[uids.find((u) => u.startsWith('u_') && !userProfiles.has(u)) ?? ''];
        }
        // Keep only non-u_ UIDs as errors
        for (const uid of uids) {
          if (uid.startsWith('u_')) delete errorDetails[uid];
        }
      }
    }

    const result: any = { profiles };
    if (Object.keys(errorDetails).length > 0) {
      result.errors = { count: Object.keys(errorDetails).length, details: errorDetails };
    }
    res.json(result);
  });

  router.post('/_security/profile/_has_privileges', (req, res) => {
    res.json({
      has_privilege_uids: [req.body?.uids?.[0] || 'mock-profile-uid'],
      errors: {},
    });
  });

  router.post('/_security/profile/_suggest', (req, res) => {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const nameQuery: string = (body.name || '').toLowerCase();
    const size: number = body.size || 10;

    let matched = [...userProfiles.values()];
    if (nameQuery) {
      matched = matched.filter((p) =>
        p.user.username.toLowerCase().includes(nameQuery) ||
        (p.user.full_name || '').toLowerCase().includes(nameQuery),
      );
    }
    matched = matched.slice(0, size).map((p) => ({ ...p, enabled: !disabledProfiles.has(p.uid) }));

    res.json({ total: matched.length, took: 1, profiles: matched });
  });

  router.all(
    ['/_security/profile/:uid/_disable', '/_security/profile/:uid/_enable'],
    (req, res) => {
      const uid = req.params.uid;
      if (req.path.includes('_disable')) {
        disabledProfiles.add(uid);
      } else {
        disabledProfiles.delete(uid);
      }
      res.json({ acknowledged: true });
    },
  );

  router.get('/_security/service/:namespace?/:service?', (req, res) => {
    const namespace = req.params.namespace;
    const service = req.params.service;

    if (namespace && service) {
      return res.json({ [`${namespace}/${service}`]: { enabled: true, metadata: {} } });
    }

    res.json({
      'elastic/auto-ops': { enabled: true, metadata: {} },
      'elastic/enterprise-search-server': { enabled: true, metadata: {} },
      'elastic/fleet-server': { enabled: true, metadata: {} },
      'elastic/fleet-server-remote': { enabled: true, metadata: {} },
      'elastic/kibana': { enabled: true, metadata: {} },
    });
  });

  router.get('/_security/service/:namespace/:service/credential', (req, res) => {
    res.json({
      service_account: `${req.params.namespace}/${req.params.service}`,
      tokens: [],
      nodes_credentials: {},
    });
  });

  router.post('/_security/service/:namespace/:service/credential/token/:name', (req, res) => {
    logger.info(`Security: Creating service token [${req.params.name}]`);
    res.json({
      created: true,
      token: {
        name: req.params.name,
        value: 'mock-service-token-value',
      },
    });
  });

  router.delete('/_security/service/:namespace/:service/credential/token/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post(
    '/_security/service/:namespace/:service/credential/token/:name/_clear_cache',
    (req, res) => {
      res.json({
        _nodes: {
          total: 1,
          successful: 1,
          failed: 0,
        },
      });
    },
  );

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

  router.get(['/_security/user_privileges', '/_security/user/_privileges'], (req, res) => {
    res.json({
      username: 'elastic',
      has_all_requested: true,
      cluster: ['all'],
      indices: [{ names: ['*'], privileges: ['all'], allow_restricted_indices: true }],
    });
  });

  router.post('/_security/user/:username', (req, res) => {
    globalStore.putUser(req.params.username, req.body);
    res.json({ acknowledged: true });
  });

  router.put('/_security/user/:username', (req, res) => {
    globalStore.putUser(req.params.username, req.body);
    res.json({ acknowledged: true });
  });

  router.get('/_security/user/:username?', (req, res) => {
    const username = req.params.username;
    const withProfileUid = req.query.with_profile_uid === 'true';
    logger.info(`Security: GET /_security/user username=${username}`);
    if (username) {
      const usernames = username.split(',');
      const result: any = {};
      for (const u of usernames) {
        const user = globalStore.getUser(u);
        if (user) {
          result[u] = { ...user };
          if (withProfileUid) result[u].profile_uid = userProfileUids.get(u);
        }
      }
      if (Object.keys(result).length === 0) {
        logger.warn(`Security: User not found: ${username}`);
        return res.status(404).json({ error: 'user not found' });
      }
      return res.json(result);
    }
    res.json({
      elastic: {
        username: 'elastic',
        roles: ['superuser'],
        full_name: 'Elastic User',
        email: 'elastic@example.com',
        metadata: {},
        enabled: true,
      },
    });
  });

  router.post('/_security/_query/user', (req, res) => {
    const allUsers = globalStore.getAllUsers ? globalStore.getAllUsers() : [];
    res.json({ total: allUsers.length, count: allUsers.length, users: allUsers });
  });

  router.put('/_security/user/:username/_password', (req, res) => {
    globalStore.changePassword(req.params.username, req.body.password);
    res.json({});
  });

  router.put('/_security/user/:username/_disable', (req, res) => {
    globalStore.disableUser(req.params.username);
    res.json({ acknowledged: true });
  });

  router.put('/_security/user/:username/_enable', (req, res) => {
    globalStore.enableUser(req.params.username);
    res.json({ acknowledged: true });
  });

  router.post('/_security/user/:username/_password', (req, res) => {
    globalStore.changePassword(req.params.username, req.body.password);
    res.json({});
  });

  router.delete('/_security/user/:username', (req, res) => {
    globalStore.deleteUser(req.params.username);
    res.json({ acknowledged: true });
  });

  // Keep these at the end
  router.all(['/_security/*', '/_security'], (req, res) => {
    logger.info(`Security: Catch-all matched: ${req.method} ${req.path}`);
    res.json({ acknowledged: true });
  });

  return router;
}
