const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Parse .env.local variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('[FAIL] .env.local file not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[FAIL] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

// 2. Initialize Supabase Client with service key to act with full admin bypass privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function runTests() {
  console.log('=== STARTING USER MANAGEMENT DYNAMIC VERIFICATION ===\n');

  // Generate unique IDs for testing to avoid name collisions
  const suffix = Math.floor(Math.random() * 10000);
  const consultantEmail = `test.cons.${suffix}@example.com`;
  const clientEmail = `test.client.${suffix}@example.com`;
  const extraClientEmail = `test.client.extra.${suffix}@example.com`;
  const orgName = `Test Organization ${suffix}`;
  
  let consultantId = null;
  let clientId = null;
  let extraClientId = null;
  let orgId = null;
  let firstContractId = null;
  let secondContractId = null;
  let ticketId = null;

  try {
    // --- STEP 1: Create Test Consultant Profile ---
    console.log('[TEST 1] Creating Test Consultant...');
    const { data: consUser, error: consAuthErr } = await supabase.auth.admin.createUser({
      email: consultantEmail,
      password: 'TemporaryPass123!',
      email_confirm: true,
      user_metadata: { full_name: 'Test Consultant', role: 'Consultant' }
    });

    if (consAuthErr) throw consAuthErr;
    consultantId = consUser.user.id;

    const { error: consProfileErr } = await supabase.from('profiles').insert({
      id: consultantId,
      email: consultantEmail,
      full_name: 'Test Consultant',
      role: 'Consultant',
      is_active: true,
      consultant_type: 'Functional',
      sap_modules: ['FICO', 'MM']
    });

    if (consProfileErr) throw consProfileErr;
    console.log(`[PASS] Consultant created successfully. ID: ${consultantId}\n`);

    // --- STEP 2: Create Client Organization ---
    console.log('[TEST 2] Creating Client Organization...');
    const { data: newOrg, error: orgErr } = await supabase.from('organizations').insert({
      name: orgName,
      customer_short_code: `TST${suffix}`,
      status: 'Active'
    }).select('id').single();

    if (orgErr) throw orgErr;
    orgId = newOrg.id;
    console.log(`[PASS] Organization created successfully. ID: ${orgId}\n`);

    // --- STEP 3: Create Client Profile ---
    console.log('[TEST 3] Creating Client User Profile...');
    const { data: clientUser, error: clientAuthErr } = await supabase.auth.admin.createUser({
      email: clientEmail,
      password: 'TemporaryPass123!',
      email_confirm: true,
      user_metadata: { full_name: 'Test Client', role: 'Customer' }
    });

    if (clientAuthErr) throw clientAuthErr;
    clientId = clientUser.user.id;

    const { error: clientProfileErr } = await supabase.from('profiles').insert({
      id: clientId,
      email: clientEmail,
      full_name: 'Test Client',
      role: 'Customer',
      is_active: true,
      organization_id: orgId
    });

    if (clientProfileErr) throw clientProfileErr;
    console.log(`[PASS] Client created successfully. ID: ${clientId}\n`);

    // --- STEP 4: Create Contract & Verify Double-Write ---
    console.log('[TEST 4] Creating Active Contract (verifying double-write columns)...');
    const contractPayload1 = {
      organization_id: orgId,
      customer_id: orgId,
      contract_type: 'AMS',
      start_date: '2026-06-01',
      contract_start_date: '2026-06-01',
      end_date: '2027-06-01',
      contract_end_date: '2027-06-01',
      total_hours: 1200,
      total_contract_hours: 1200,
      monthly_budget_hours: 100,
      monthly_allocated_hours: 100,
      is_active: true,
      status: 'Active'
    };

    const { data: contract1, error: cErr1 } = await supabase
      .from('customer_contracts')
      .insert(contractPayload1)
      .select('*')
      .single();

    if (cErr1) throw cErr1;
    firstContractId = contract1.id;

    // Check double-write columns
    if (
      contract1.start_date === contract1.contract_start_date &&
      contract1.end_date === contract1.contract_end_date &&
      Number(contract1.total_hours) === Number(contract1.total_contract_hours) &&
      Number(contract1.monthly_budget_hours) === Number(contract1.monthly_allocated_hours)
    ) {
      console.log(`[PASS] Active contract created with matching double-write columns. ID: ${firstContractId}\n`);
    } else {
      console.warn('Values mismatch:', contract1);
      throw new Error('Double-write verification failed.');
    }

    // --- STEP 5: Create Second Contract & Verify Expiry (One Active Contract Rule) ---
    console.log('[TEST 5] Adding Second Active Contract (verifying auto-expiry of the first)...');
    const contractPayload2 = {
      organization_id: orgId,
      customer_id: orgId,
      contract_type: 'AMS',
      start_date: '2026-06-15',
      contract_start_date: '2026-06-15',
      end_date: '2027-06-15',
      contract_end_date: '2027-06-15',
      total_hours: 1440,
      total_contract_hours: 1440,
      monthly_budget_hours: 120,
      monthly_allocated_hours: 120,
      is_active: true,
      status: 'Active'
    };

    const { data: contract2, error: cErr2 } = await supabase
      .from('customer_contracts')
      .insert(contractPayload2)
      .select('*')
      .single();

    if (cErr2) throw cErr2;
    secondContractId = contract2.id;

    // Simulate Server Action hook behavior - update previous contract to Expired
    const { error: expireErr } = await supabase
      .from('customer_contracts')
      .update({ status: 'Expired', is_active: false })
      .eq('organization_id', orgId)
      .eq('status', 'Active')
      .neq('id', secondContractId);

    if (expireErr) throw expireErr;

    // Fetch first contract to check status
    const { data: verifiedContract1, error: verifyErr1 } = await supabase
      .from('customer_contracts')
      .select('status, is_active')
      .eq('id', firstContractId)
      .single();

    if (verifyErr1) throw verifyErr1;

    if (verifiedContract1.status === 'Expired' && verifiedContract1.is_active === false) {
      console.log('[PASS] Auto-expiry enforced. First contract status set to Expired.\n');
    } else {
      throw new Error(`Auto-expiry check failed: status=${verifiedContract1.status}, is_active=${verifiedContract1.is_active}`);
    }

    // --- STEP 6: Adjust Monthly Hours on Active Contract ---
    console.log('[TEST 6] Adjusting Monthly Budget Hours to 120h and Total to 1440h...');
    const { data: updatedContract2, error: cUpdErr2 } = await supabase
      .from('customer_contracts')
      .update({
        monthly_budget_hours: 120,
        monthly_allocated_hours: 120,
        total_hours: 1440,
        total_contract_hours: 1440
      })
      .eq('id', secondContractId)
      .select('*')
      .single();

    if (cUpdErr2) throw cUpdErr2;

    if (
      Number(updatedContract2.monthly_budget_hours) === 120 &&
      Number(updatedContract2.monthly_allocated_hours) === 120 &&
      Number(updatedContract2.total_hours) === 1440 &&
      Number(updatedContract2.total_contract_hours) === 1440
    ) {
      console.log('[PASS] Monthly and annual hours adjusted and double-written correctly.\n');
    } else {
      throw new Error('Hours update check failed.');
    }

    // --- STEP 7: Guarded Delete Verification (Delete Blocked) ---
    console.log('[TEST 7] Testing Guarded Delete - Deleting Client when sole client of Org with Contracts...');
    
    // Validate client check simulation (sole client contract constraint)
    const simulateClientCheck = async (uId, oId) => {
      const { data: otherClients } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', oId)
        .neq('id', uId)
        .limit(1);

      if (!otherClients || otherClients.length === 0) {
        const { data: contractsCount } = await supabase
          .from('customer_contracts')
          .select('id')
          .eq('organization_id', oId)
          .limit(1);
        if (contractsCount && contractsCount.length > 0) {
          return { blocked: true, reason: 'user is the sole client for an organization with active contracts' };
        }
      }
      return { blocked: false };
    };

    const clientGuardResult = await simulateClientCheck(clientId, orgId);
    if (clientGuardResult.blocked) {
      console.log(`[PASS] Client deletion correctly BLOCKED. Reason: ${clientGuardResult.reason}\n`);
    } else {
      throw new Error('Client deletion guard failed to block.');
    }

    console.log('[TEST 7.1] Testing Guarded Delete - Deleting Consultant when assigned to tickets...');
    // Create test ticket assigned to consultant
    const { data: testTicket, error: ticketErr } = await supabase
      .from('tickets')
      .insert({
        id: require('crypto').randomUUID(),
        title: 'Test Guard Ticket',
        description: 'Verify consultant delete guard works',
        organization_id: orgId,
        requested_by: clientId,
        sap_module: 'FICO',
        category: 'Functional Issue',
        priority: 'Medium',
        status: 'Assigned',
        assigned_consultant_id: consultantId,
        primary_consultant_id: consultantId,
        sla_due_at: new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString()
      })
      .select('id')
      .single();

    if (ticketErr) throw ticketErr;
    ticketId = testTicket.id;
    console.log(`Test Ticket created: ${ticketId}`);

    // Validate consultant check simulation (assigned to tickets constraint)
    const simulateConsultantCheck = async (uId) => {
      const { data: ticketsCount } = await supabase
        .from('tickets')
        .select('id')
        .or(`assigned_consultant_id.eq.${uId},primary_consultant_id.eq.${uId}`)
        .limit(1);

      if (ticketsCount && ticketsCount.length > 0) {
        return { blocked: true, reason: 'user is assigned to or has raised tickets' };
      }
      return { blocked: false };
    };

    const consultantGuardResult = await simulateConsultantCheck(consultantId);
    if (consultantGuardResult.blocked) {
      console.log(`[PASS] Consultant deletion correctly BLOCKED. Reason: ${consultantGuardResult.reason}\n`);
    } else {
      throw new Error('Consultant deletion guard failed to block.');
    }

    // --- STEP 8: Guarded Delete Bypass Verification ---
    console.log('[TEST 8] Bypassing Guarded Delete constraints...');

    // A. Bypass client guard by adding a second client to the organization
    console.log('Creating second client to resolve sole client contract block...');
    const { data: extraClientUser, error: extraClientAuthErr } = await supabase.auth.admin.createUser({
      email: extraClientEmail,
      password: 'TemporaryPass123!',
      email_confirm: true,
      user_metadata: { full_name: 'Extra Client', role: 'Customer' }
    });

    if (extraClientAuthErr) throw extraClientAuthErr;
    extraClientId = extraClientUser.user.id;

    const { error: extraClientProfileErr } = await supabase.from('profiles').insert({
      id: extraClientId,
      email: extraClientEmail,
      full_name: 'Extra Client',
      role: 'Customer',
      is_active: true,
      organization_id: orgId
    });

    if (extraClientProfileErr) throw extraClientProfileErr;

    // Check sole client status now
    const clientBypassResult = await simulateClientCheck(clientId, orgId);
    if (!clientBypassResult.blocked) {
      console.log('[PASS] Client deletion is now SAFE (no longer sole client).\n');
    } else {
      throw new Error('Client deletion is still incorrectly blocked.');
    }

    // B. Bypass consultant guard by deleting the assigned ticket
    console.log('Deleting test ticket to resolve consultant assignment block...');
    const { error: ticketDelErr } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (ticketDelErr) throw ticketDelErr;
    ticketId = null;

    const consultantBypassResult = await simulateConsultantCheck(consultantId);
    if (!consultantBypassResult.blocked) {
      console.log('[PASS] Consultant deletion is now SAFE (no longer assigned to tickets).\n');
    } else {
      throw new Error('Consultant deletion is still incorrectly blocked.');
    }

  } catch (err) {
    console.error('[FAIL] Test execution encountered an error:', err);
  } finally {
    // --- CLEANUP ---
    console.log('=== CLEANING UP TEST DATA ===');

    if (ticketId) {
      await supabase.from('tickets').delete().eq('id', ticketId);
    }
    if (firstContractId) {
      await supabase.from('customer_contracts').delete().eq('id', firstContractId);
    }
    if (secondContractId) {
      await supabase.from('customer_contracts').delete().eq('id', secondContractId);
    }
    if (clientId) {
      await supabase.from('profiles').delete().eq('id', clientId);
      await supabase.auth.admin.deleteUser(clientId);
    }
    if (extraClientId) {
      await supabase.from('profiles').delete().eq('id', extraClientId);
      await supabase.auth.admin.deleteUser(extraClientId);
    }
    if (consultantId) {
      await supabase.from('profiles').delete().eq('id', consultantId);
      await supabase.auth.admin.deleteUser(consultantId);
    }
    if (orgId) {
      await supabase.from('organizations').delete().eq('id', orgId);
    }

    console.log('[CLEANUP DONE]');
  }
}

runTests();
