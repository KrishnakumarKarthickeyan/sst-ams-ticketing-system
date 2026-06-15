// Removes EVERYTHING created by the enterprise seed, using seed-manifest.json.
// Existing consultants, the manager, the original ALSUHAIMI/SST orgs and their
// data are untouched. Run with:  node teardown-seed.mjs --confirm
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const base = '/Users/krishnakumarkarthickeyan/.gemini/antigravity/scratch/sap-ticketing-system';
const env = {};
for (const l of readFileSync(base + '/.env.local').toString().split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
if (!process.argv.includes('--confirm')) { console.log('Refusing to run without --confirm'); process.exit(1); }
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const man = JSON.parse(readFileSync(base + '/seed-manifest.json'));
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

const tIds = man.ticketIds;
// children first; ticket_actual_hours before ticket_closure_requests (FK)
const childTables = ['notifications', 'ticket_actual_hours', 'ticket_closure_requests', 'ticket_hour_estimates',
  'ticket_estimates', 'ticket_consultant_efforts', 'satisfaction_ratings', 'ticket_escalations',
  'ticket_history', 'ticket_comments', 'ticket_modules', 'ticket_assignments'];
for (const tbl of childTables) {
  let del = 0;
  for (const part of chunk(tIds, 100)) {
    const { error, count } = await c.from(tbl).delete({ count: 'exact' }).in('ticket_id', part);
    if (error) console.error(`  ! ${tbl}: ${error.message}`); else del += count ?? 0;
  }
  console.log(`${tbl}: deleted ${del}`);
}
// tickets
let dt = 0;
for (const part of chunk(tIds, 100)) { const { count } = await c.from('tickets').delete({ count: 'exact' }).in('id', part); dt += count ?? 0; }
console.log(`tickets: deleted ${dt}`);
// org-scoped
for (const part of chunk(man.orgIds, 100)) await c.from('customer_contracts').delete().in('organization_id', part);
console.log('customer_contracts: deleted (seed orgs)');
if (man.customerEmails?.length) for (const part of chunk(man.customerEmails, 100)) await c.from('organization_contacts').delete().in('email', part);
// customer profiles + auth users
for (const part of chunk(man.customerUserIds, 100)) await c.from('profiles').delete().in('id', part);
let au = 0; for (const uid of man.customerUserIds) { const { error } = await c.auth.admin.deleteUser(uid); if (!error) au++; }
console.log(`customer profiles + ${au} auth users: deleted`);
// orgs last
for (const part of chunk(man.orgIds, 100)) await c.from('organizations').delete().in('id', part);
console.log(`organizations: deleted ${man.orgIds.length}`);
console.log('\nTeardown complete. Existing consultants/manager and original data untouched.');
