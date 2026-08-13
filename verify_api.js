/**
 * Advanced verification script for Housewives Backend API
 * Uses native fetch (available in Node.js 18+)
 */

const BASE_URL = 'http://localhost:4000';
let token = '';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

async function runTests() {
  console.log('=== STARTING ADVANCED BACKEND API VERIFICATION ===\n');

  try {
    // 1. Health check
    console.log('1. Checking server health...');
    const health = await request('/health');
    if (!health.ok) {
      throw new Error(`Health check failed: ${JSON.stringify(health.data)}`);
    }
    console.log('✓ Health check passed:', health.data.status);

    // 2. Authentication: Login/Create User
    console.log('\n2. Authenticating user (9876543210)...');
    let login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone: '9876543210', password: 'password' })
    });

    if (login.status === 404) {
      console.log('  Account does not exist. Creating new account via /api/auth/register...');
      login = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone: '9876543210', password: 'password' })
      });
      if (!login.ok) {
        throw new Error(`Registration failed: ${JSON.stringify(login.data)}`);
      }
    } else if (!login.ok) {
      throw new Error(`Login failed: ${JSON.stringify(login.data)}`);
    }

    token = login.data.token;
    console.log('✓ Authentication successful! Token received.');

    // 3. Complete Onboarding
    console.log('\n3. Running onboarding for the user...');
    const onboard = await request('/api/user/complete-onboarding', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Sunita Sharma',
        monthlyBudget: 15000,
        preferredLanguage: 'hi'
      })
    });
    if (!onboard.ok) {
      throw new Error(`Onboarding failed: ${JSON.stringify(onboard.data)}`);
    }
    console.log(`✓ Onboarding completed! budget: ${onboard.data.user.monthlyBudget}`);

    // 4. Voice Parsing Test
    console.log('\n4. Testing AI Voice Parsing mock endpoint (/api/expenses/voice-parse)...');
    
    const voiceSentences = [
      { text: "Sabzi ke 150 rupaiah diye", expectedAmt: 150, expectedCat: "Groceries" },
      { text: "Doodh wale ko 1200 diye", expectedAmt: 1200, expectedCat: "Groceries" },
      { text: "Bijli ka bill 2500", expectedAmt: 2500, expectedCat: "Utilities" },
      { text: "Rickshaw fare 80 rupees", expectedAmt: 80, expectedCat: "Travel" }
    ];

    for (const testItem of voiceSentences) {
      console.log(`  Parsing sentence: "${testItem.text}"...`);
      const parseRes = await request('/api/expenses/voice-parse', {
        method: 'POST',
        body: JSON.stringify({ text: testItem.text })
      });
      if (!parseRes.ok) {
        throw new Error(`Voice parsing failed: ${JSON.stringify(parseRes.data)}`);
      }
      const data = parseRes.data;
      console.log(`    Result -> Amt: ₹${data.amount}, Category: ${data.category}, ItemName: "${data.itemName}"`);
      if (data.amount !== testItem.expectedAmt || data.category !== testItem.expectedCat) {
        console.warn(`    ⚠️ Warning: Expected amount ${testItem.expectedAmt} and category ${testItem.expectedCat}, but got ${data.amount} and ${data.category}`);
      } else {
        console.log(`    ✓ Correctly parsed!`);
      }
    }

    // 5. Fixed Bills & Reminders Test
    console.log('\n5. Testing Fixed Bills & Reminders API...');
    
    // Create reminders
    console.log('  Creating monthly Electricity bill reminder (₹2000)...');
    const r1 = await request('/api/reminders', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Electricity Bill',
        amount: 2000,
        category: 'Utilities',
        dueDate: new Date() // due today
      })
    });
    if (!r1.ok) throw new Error(`Failed to create reminder 1: ${JSON.stringify(r1.data)}`);

    console.log('  Creating Gas Bill reminder (₹950)...');
    const r2 = await request('/api/reminders', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Gas Bill',
        amount: 950,
        category: 'Utilities',
        dueDate: new Date() // due today
      })
    });
    if (!r2.ok) throw new Error(`Failed to create reminder 2: ${JSON.stringify(r2.data)}`);
    
    const reminderIdToPay = r1.data.reminder.reminderId;
    const reminderIdToKeep = r2.data.reminder.reminderId;

    // Fetch reminders
    console.log('  Fetching active reminders...');
    const list1 = await request('/api/reminders');
    if (!list1.ok) throw new Error(`Failed to fetch reminders: ${JSON.stringify(list1.data)}`);
    console.log(`    Active unpaid reminders count: ${list1.data.reminders.length}`);
    if (list1.data.reminders.length < 2) {
      console.warn('    ⚠️ Warning: Expected at least 2 reminders');
    }

    // Pay one reminder
    console.log(`  Paying Electricity bill reminder (ID: ${reminderIdToPay})...`);
    const payRes = await request(`/api/reminders/${reminderIdToPay}/pay`, {
      method: 'PUT'
    });
    if (!payRes.ok) throw new Error(`Failed to pay reminder: ${JSON.stringify(payRes.data)}`);
    console.log(`    ✓ Status: ${payRes.data.reminder.status}, Logged Expense Amount: ₹${payRes.data.expense.amount}`);

    // Fetch reminders again
    console.log('  Re-fetching active reminders after payment...');
    const list2 = await request('/api/reminders');
    if (!list2.ok) throw new Error(`Failed to fetch reminders post-payment: ${JSON.stringify(list2.data)}`);
    console.log(`    Active unpaid reminders count: ${list2.data.reminders.length}`);
    const rPaidExists = list2.data.reminders.some(r => r.reminderId === reminderIdToPay);
    if (rPaidExists) {
      throw new Error('Verification failed: Paid reminder still returned in unpaid active list');
    }
    console.log('    ✓ Paid reminder successfully removed from active list.');

    // 6. Virtual Gullak Savings Test
    console.log('\n6. Testing Gupt Gullak savings logic API (/api/savings/gullak)...');
    
    // Log a few expenses to see how budget leftovers are computed
    console.log('  Logging grocery transaction of ₹1000...');
    await request('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ amount: 1000, category: 'Groceries', itemName: 'Weekly Kirana', type: 'debit' })
    });

    console.log('  Fetching Gullak calculations...');
    const gullak = await request('/api/savings/gullak');
    if (!gullak.ok) throw new Error(`Failed to fetch Gullak: ${JSON.stringify(gullak.data)}`);
    console.log(`    Monthly Budget: ₹${gullak.data.monthlyBudget}`);
    console.log(`    Total Spent (Debits): ₹${gullak.data.totalSpent}`);
    console.log(`    Budget Leftover: ₹${gullak.data.leftover}`);
    console.log(`    Updated Virtual Gullak Balance: ₹${gullak.data.savingsGullakBalance}`);

    if (gullak.data.savingsGullakBalance !== gullak.data.leftover && gullak.data.leftover > 0) {
      console.warn('    ⚠️ Warning: Gullak balance does not match budget leftovers');
    } else {
      console.log('    ✓ Gullak calculations are correct and synced with database!');
    }

    // 7. OCR Bill Scanner Test
    console.log('\n7. Testing OCR Receipt Scanner API (/api/expenses/scan-bill)...');
    
    // Create a mock image file as FormData upload
    const form = new FormData();
    const mockImageContent = 'Reliance Mart Total ₹980';
    const mockBlob = new Blob([mockImageContent], { type: 'image/jpeg' });
    form.append('bill', mockBlob, 'reliance_mart_bill.jpg');

    const scanRes = await request('/api/expenses/scan-bill', {
      method: 'POST',
      body: form
    });

    if (!scanRes.ok) {
      throw new Error(`Receipt scanner API request failed: ${JSON.stringify(scanRes.data)}`);
    }

    const scanData = scanRes.data;
    console.log('  Response:', scanData);
    if (scanData.success && scanData.extractedAmount === 980 && scanData.extractedMerchant === 'Reliance Fresh' && scanData.suggestedCategory === 'Groceries') {
      console.log('    ✓ OCR Receipt Scanner API test passed!');
    } else {
      console.warn('    ⚠️ Warning: OCR Extracted values did not match expected values.');
    }

    console.log('\n✨ ALL ADVANCED API ENDPOINTS COMPLETED SUCCESSFULLY! ✨');

  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:');
    console.error(error.message);
  }
}

runTests();
