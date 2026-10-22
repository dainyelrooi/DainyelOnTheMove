/* Existing Firebase CLI credentials only. Never print tokens, user records or secrets. */
const path = require('node:path');
const cli = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'firebase-tools', 'lib');
const { getGlobalDefaultAccount } = require(path.join(cli, 'auth'));
const { requireAuth } = require(path.join(cli, 'requireAuth'));
const { Client } = require(path.join(cli, 'apiv2'));

const PROJECT = 'dainyelonthemove';
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--status', '--enable-totp', '--authorize-owner-domains', '--owner-approved'].includes(arg))) throw Error('Unsupported argument.');
  if (args.some(arg => ['--enable-totp', '--authorize-owner-domains'].includes(arg)) && !args.includes('--owner-approved')) throw Error('Current owner approval is required before changing Auth configuration.');
  const account = getGlobalDefaultAccount();
  if (!account) throw Error('Use the existing Firebase CLI account first.');
  await requireAuth({ project: PROJECT, projectRoot: path.resolve(__dirname, '..'), ...account });
  const safe = { skipLog: { body: true, resBody: true, queryParams: true }, resolveOnHTTPError: true,
    headers: { 'x-goog-user-project': PROJECT } };
  const billing = new Client({ urlPrefix: 'https://cloudbilling.googleapis.com' });
  const bill = await billing.get(`/v1/projects/${PROJECT}/billingInfo`, { ...safe, queryParams: { fields: 'billingEnabled' } });
  if (bill.status !== 200 || bill.body.billingEnabled !== false) throw Error('Stopped: the no-billing requirement could not be confirmed. No Auth change made.');
  const identity = new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com' });
  const endpoint = `/admin/v2/projects/${PROJECT}/config`;
  const config = await identity.get(endpoint, { ...safe, queryParams: { fields: 'subtype,mfa,authorizedDomains' } });
  if (config.status !== 200) throw Error('Auth configuration could not be read. No change made.');
  const totpEnabled = data => data.mfa?.providerConfigs?.some(item => item.totpProviderConfig && item.state === 'ENABLED') === true;
  if (args.includes('--authorize-owner-domains')) {
    const domains = [...new Set([...(config.body.authorizedDomains || []), 'dainyelonthemove.com', 'dainyelonthemove-staging.web.app'])];
    const changed = await identity.patch(endpoint, { authorizedDomains: domains }, { ...safe,
      queryParams: { updateMask: 'authorizedDomains', fields: 'authorizedDomains' } });
    if (changed.status !== 200) throw Error('Auth configuration domain update was not confirmed.');
  }
  if (args.includes('--enable-totp')) {
    if (config.body.subtype !== 'IDENTITY_PLATFORM') throw Error('First use the no-cost Identity Platform upgrade in Firebase Authentication Settings. Do not link billing or use initializeAuth. No change made.');
    if (!totpEnabled(config.body)) {
      const mfa = { ...config.body.mfa };
      mfa.providerConfigs = [...(mfa.providerConfigs || []).filter(item => !item.totpProviderConfig),
        { state: 'ENABLED', totpProviderConfig: { adjacentIntervals: 1 } }];
      const changed = await identity.patch(endpoint, { mfa }, { ...safe, queryParams: { updateMask: 'mfa', fields: 'mfa' } });
      if (changed.status !== 200 || !totpEnabled(changed.body)) throw Error('TOTP activation was not confirmed. Inspect configuration before retrying.');
    }
  }
  const fresh = await identity.get(endpoint, { ...safe, queryParams: { fields: 'subtype,mfa,authorizedDomains' } });
  const freshBill = await billing.get(`/v1/projects/${PROJECT}/billingInfo`, { ...safe, queryParams: { fields: 'billingEnabled' } });
  if (fresh.status !== 200 || freshBill.status !== 200) throw Error('Final configuration readback could not be completed.');
  console.log(JSON.stringify({ project: PROJECT, subtype: fresh.body.subtype, totpEnabled: totpEnabled(fresh.body),
    liveDomainAuthorized: fresh.body.authorizedDomains?.includes('dainyelonthemove.com'),
    stagingDomainAuthorized: fresh.body.authorizedDomains?.includes('dainyelonthemove-staging.web.app'),
    billingEnabled: freshBill.body.billingEnabled, ownerEnrollmentPerformed: false, emailSentByThisTool: false }));
}
main().catch(error => {
  // Only our own bounded messages are shown, not SDK response bodies.
  const known = typeof error?.message === 'string' && /^(Unsupported|Current owner|Use the existing|Stopped:|Auth configuration|First use|TOTP activation|Final configuration)/.test(error.message);
  console.error(known ? error.message : 'Configuration request could not be completed; no credentials or response bodies printed.');
  process.exitCode = 1;
});
