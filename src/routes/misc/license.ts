import { Router } from 'express';

let currentLicenseType = 'trial';

export function createLicenseRouter() {
  const router = Router();

  // GET /_license
  router.get('/_license', (req, res) => {
    res.json({
      license: {
        status: 'active',
        uid: 'mock-license-id',
        type: currentLicenseType,
        issue_date_in_millis: Date.now(),
        expiry_date_in_millis: Date.now() + 1000 * 60 * 60 * 24 * 30,
        issue_date: '2024-01-01T00:00:00.000Z',
        expiry_date: '2025-01-01T00:00:00.000Z',
        max_nodes: 5,
        issued_to: 'test',
        issuer: 'elasticsearch',
        signature: 'mock-signature',
        start_date_in_millis: -1,
      },
    });
  });

  // POST /_license and PUT /_license
  router.post('/_license', (req, res) => {
    currentLicenseType = 'trial';
    res.json({
      license_status: 'valid',
      acknowledged: true,
    });
  });

  router.put('/_license', (req, res) => {
    currentLicenseType = 'trial';
    res.json({
      license_status: 'valid',
      acknowledged: true,
    });
  });

  // DELETE /_license
  router.delete('/_license', (req, res) => {
    currentLicenseType = 'basic';
    res.json({
      acknowledged: true,
    });
  });

  // GET /_license/basic_status
  router.get('/_license/basic_status', (req, res) => {
    res.json({
      eligible_to_start_basic: false,
    });
  });

  // POST /_license/start_basic
  router.post('/_license/start_basic', (req, res) => {
    res.status(403).json({
      error: {
        type: 'forbidden',
        reason: 'Basic license cannot be started',
      },
    });
  });

  // GET /_license/trial_status
  router.get('/_license/trial_status', (req, res) => {
    res.json({
      eligible_to_start_trial: false,
    });
  });

  // POST /_license/start_trial
  router.post('/_license/start_trial', (req, res) => {
    res.status(403).json({
      error: {
        type: 'forbidden',
        reason: 'Trial license cannot be started',
      },
    });
  });

  return router;
}
