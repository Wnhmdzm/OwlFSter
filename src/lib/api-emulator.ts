/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Browser-Side API Emulator & Fallback Database Layer for Hostings (such as Netlify/Vercel/Static Previews)
// This file intercepts /api/* calls and emulates the better-sqlite3 database behavior on the client.

import { FMSCase, UserRole, UserProfile } from '../types';

// Storage keys
const KEY_USERS = 'owl_users';
const KEY_PASSWORDS = 'owl_passwords';
const KEY_CASES = 'owl_cases';
const KEY_LOGS = 'owl_logs';

// Helper: Seed initial database if empty
function initializeDatabase() {
  if (!localStorage.getItem(KEY_USERS)) {
    const initialUsers = [
      { id: 'PS101435', email: 'ps101435@fms.pro', displayName: 'Zaim', role: UserRole.ADMIN, isActive: true, department: 'Affin Bank Fraud HQ' },
      { id: 'PS101436', email: 'ps101436@fms.pro', displayName: 'Faris', role: UserRole.USER, isActive: true, department: 'Affin Bank Fraud HQ' },
      { id: 'PS101477', email: 'ps101477@fms.pro', displayName: 'Nabil', role: UserRole.USER, isActive: true, department: 'Affin Bank Fraud HQ' },
      { id: 'PS101405', email: 'ps101405@fms.pro', displayName: 'Naja', role: UserRole.USER, isActive: true, department: 'Affin Bank Fraud HQ' },
      { id: 'PS101480', email: 'ps101480@fms.pro', displayName: 'Izzat', role: UserRole.USER, isActive: true, department: 'Affin Bank Fraud HQ' }
    ];
    localStorage.setItem(KEY_USERS, JSON.stringify(initialUsers));
  }

  if (!localStorage.getItem(KEY_PASSWORDS)) {
    const initialPasswords: { [key: string]: string } = {
      'PS101435': 'Affin123',
      'PS101436': 'Affin123',
      'PS101477': 'Affin123',
      'PS101405': 'Affin123',
      'PS101480': 'Affin123'
    };
    localStorage.setItem(KEY_PASSWORDS, JSON.stringify(initialPasswords));
  }

  if (!localStorage.getItem(KEY_CASES)) {
    const initialCases: FMSCase[] = [
      {
        id: 'case-001',
        userId: 'CIF8817293',
        caseCreatedTime: '2026-06-11 10:15:30',
        caseAssignedTime: '2026-06-11 10:18:12',
        mode: 'RIB',
        status: 'PENDING',
        eventType: 'High-Value Transfer',
        riskScore: 94,
        ipAddress: '175.143.2.11 (MY)',
        ruleId: 'R_HIGH_AMT_RIB',
        policyAction: 'LOCK_USER',
        assignedTo: 'Faris',
        amount: 48500.00,
        resolution: 'UNRESOLVED' as any,
        firstCallTime: '',
        reassignedToFA: 'NO',
        secondCallTime: '',
        thirdCallTime: '',
        callResponse: 'NO_RESPONSE' as any,
        remarks: 'Large RIB transfer initiated. User registered location in KL but IP resides in Butterworth. RIB access locked automatically.',
        fmsStatusAction: 'Pending' as any,
        createdByUid: 'PS101435',
        createdByName: 'Zaim',
        createdAt: '2026-06-11T10:15:30Z',
        updatedAtAt: '2026-06-11T10:18:12Z'
      },
      {
        id: 'case-002',
        userId: 'CIF9921204',
        caseCreatedTime: '2026-06-11 08:30:00',
        caseAssignedTime: '2026-06-11 08:35:00',
        mode: 'FPX',
        status: 'COMPLETED',
        eventType: 'Rapid Multiple Transactions',
        riskScore: 87,
        ipAddress: '60.50.112.98 (MY)',
        ruleId: 'R_RAPID_FPX_VELOCITY',
        policyAction: 'CHALLENGE_OTP',
        assignedTo: 'Zaim',
        amount: 12500.00,
        resolution: 'GENUINE' as any,
        firstCallTime: '2026-06-11 08:42:00',
        reassignedToFA: 'NO',
        secondCallTime: '',
        thirdCallTime: '',
        callResponse: 'ANSWERED' as any,
        remarks: 'Client successfully contacted. Verified genuine purchase for electronics on Lazada. OTP confirmed.',
        fmsStatusAction: 'Unlocked' as any,
        createdByUid: 'PS101435',
        createdByName: 'Zaim',
        createdAt: '2026-06-11T08:30:00Z',
        updatedAtAt: '2026-06-11T08:45:00Z'
      },
      {
        id: 'case-003',
        userId: 'CIF1002931',
        caseCreatedTime: '2026-06-11 09:00:00',
        caseAssignedTime: '2026-06-11 09:12:00',
        mode: 'RIB',
        status: 'PENDING',
        eventType: 'Profile Modification',
        riskScore: 99,
        ipAddress: '195.22.126.4 (NL)',
        ruleId: 'R_FOREIGN_IP_ADMIN_CHANGE',
        policyAction: 'LOCK_USER',
        assignedTo: 'Nabil',
        amount: 0.00,
        resolution: 'CONFIRMED_FRAUD' as any,
        firstCallTime: '2026-06-11 09:15:00',
        reassignedToFA: 'YES',
        secondCallTime: '',
        thirdCallTime: '',
        callResponse: 'NO_RESPONSE' as any,
        remarks: 'Attempted mobile number change from Netherlands proxy. Client phone is offline. Account frozen immediately.',
        fmsStatusAction: 'Locked' as any,
        createdByUid: 'PS101435',
        createdByName: 'Zaim',
        createdAt: '2026-06-11T09:00:00Z',
        updatedAtAt: '2026-06-11T09:20:00Z'
      },
      {
        id: 'case-004',
        userId: 'CIF5541829',
        caseCreatedTime: '2026-06-11 06:12:00',
        caseAssignedTime: '2026-06-11 06:15:00',
        mode: 'ATM',
        status: 'COMPLETED',
        eventType: 'Suspicious Withdrawal',
        riskScore: 82,
        ipAddress: 'Active Terminal ATM_1029',
        ruleId: 'R_ATM_VELOCITY',
        policyAction: 'BLOCK_CARD',
        assignedTo: 'Naja',
        amount: 5000.00,
        resolution: 'GENUINE' as any,
        firstCallTime: '2026-06-11 06:22:00',
        reassignedToFA: 'NO',
        secondCallTime: '',
        thirdCallTime: '',
        callResponse: 'ANSWERED' as any,
        remarks: 'Customer confirmed genuine withdrawals for wedding expenses. Card is unblocked.',
        fmsStatusAction: 'Unlocked' as any,
        createdByUid: 'PS101405',
        createdByName: 'Naja',
        createdAt: '2026-06-11T06:12:00Z',
        updatedAtAt: '2026-06-11T06:25:00Z'
      }
    ];
    localStorage.setItem(KEY_CASES, JSON.stringify(initialCases));
  }

  if (!localStorage.getItem(KEY_LOGS)) {
    const initialLogs = [
      { id: 1, user_id: 'PS101435', action: 'INIT_SYSTEM', details: 'OwlFraudster system fallback initialized securely', timestamp: new Date().toISOString() }
    ];
    localStorage.setItem(KEY_LOGS, JSON.stringify(initialLogs));
  }
}

// Emulation controllers
function getUsers(): any[] {
  initializeDatabase();
  return JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
}

function saveUsers(users: any[]) {
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
}

function getPasswords(): { [key: string]: string } {
  initializeDatabase();
  return JSON.parse(localStorage.getItem(KEY_PASSWORDS) || '{}');
}

function savePasswords(passwords: { [key: string]: string }) {
  localStorage.setItem(KEY_PASSWORDS, JSON.stringify(passwords));
}

function getCases(): FMSCase[] {
  initializeDatabase();
  return JSON.parse(localStorage.getItem(KEY_CASES) || '[]');
}

function saveCases(cases: FMSCase[]) {
  localStorage.setItem(KEY_CASES, JSON.stringify(cases));
}

function getLogs(): any[] {
  initializeDatabase();
  return JSON.parse(localStorage.getItem(KEY_LOGS) || '[]');
}

function saveLogs(logs: any[]) {
  localStorage.setItem(KEY_LOGS, JSON.stringify(logs));
}

// Extract current authenticated user profile based on mock JWT format
function getUserByToken(token: string) {
  if (!token || !token.startsWith('mock-token-')) return null;
  const parts = token.split('-');
  const id = parts[2];
  const users = getUsers();
  const u = users.find(user => user.id === id);
  if (u && u.isActive) {
    return u;
  }
  return null;
}

// API Emulation Logic
async function handleEmulatedRequest(path: string, options: RequestInit = {}): Promise<Response> {
  initializeDatabase();
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers as Record<string, string> || {};
  let authHeader = headers['Authorization'] || headers['authorization'] || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Route: POST /api/auth/login
  if (path.startsWith('/api/auth/login') && method === 'POST') {
    try {
      const { email, password } = JSON.parse(options.body as string);
      const users = getUsers();
      const passwords = getPasswords();
      
      // Check both email address and Staff ID
      const user = users.find(u => (u.email === email || u.id === email) && u.isActive);
      
      if (!user || passwords[user.id] !== password) {
        return new Response(JSON.stringify({ error: 'Invalid credentials or inactive account' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const generatedToken = `mock-token-${user.id}-${Date.now()}`;
      return new Response(JSON.stringify({
        token: generatedToken,
        user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 });
    }
  }

  // Auth Guard endpoints
  const currentUser = getUserByToken(token);
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Route: GET /api/me
  if (path.startsWith('/api/me') && method === 'GET') {
    return new Response(JSON.stringify({
      id: currentUser.id,
      email: currentUser.email,
      displayName: currentUser.displayName,
      role: currentUser.role,
      isActive: currentUser.isActive,
      department: currentUser.department
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Route: POST /api/auth/change-password
  if (path.startsWith('/api/auth/change-password') && method === 'POST') {
    try {
      const { currentPassword, newPassword } = JSON.parse(options.body as string);
      const passwords = getPasswords();
      
      if (passwords[currentUser.id] !== currentPassword) {
        return new Response(JSON.stringify({ error: 'Incorrect current password' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      passwords[currentUser.id] = newPassword;
      savePasswords(passwords);

      const logs = getLogs();
      logs.unshift({
        id: logs.length + 1,
        user_id: currentUser.id,
        action: 'CHANGE_PASSWORD',
        details: 'Changed own password successfully in backup layer',
        timestamp: new Date().toISOString()
      });
      saveLogs(logs);

      return new Response(JSON.stringify({ success: true, message: 'Password changed successfully!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 });
    }
  }

  // Route: GET /api/cases
  if (path.startsWith('/api/cases') && method === 'GET' && !path.includes('/search')) {
    const cases = getCases();
    // Sort descending by creation date/time (default sqlite ordering)
    const sorted = [...cases].sort((a, b) => new Date(b.caseCreatedTime || b.createdAt || '').getTime() - new Date(a.caseCreatedTime || a.createdAt || '').getTime());
    return new Response(JSON.stringify(sorted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Route: GET /api/cases/search?cif=...
  if (path.startsWith('/api/cases/search') && method === 'GET') {
    const parsedUrl = new URL(path, window.location.origin);
    const cif = parsedUrl.searchParams.get('cif');
    const cases = getCases();
    const found = cases.find(c => c.userId === cif);
    return new Response(JSON.stringify(found || null), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Route: POST /api/cases
  if (path.startsWith('/api/cases') && method === 'POST') {
    try {
      const data = JSON.parse(options.body as string);
      const id = data.id || 'case-' + Math.random().toString(36).substr(2, 9);
      const cases = getCases();
      
      const idx = cases.findIndex(c => c.id === id);
      const isExisting = idx !== -1;
      
      const timestamp = new Date().toISOString();
      let updatedCase: FMSCase;

      if (isExisting) {
        updatedCase = {
          ...cases[idx],
          ...data,
          id, // protect ID
          updatedAtAt: timestamp
        };
        cases[idx] = updatedCase;
      } else {
        updatedCase = {
          ...data,
          id,
          createdByUid: currentUser.id,
          createdByName: currentUser.displayName,
          createdAt: timestamp,
          updatedAtAt: timestamp
        };
        cases.unshift(updatedCase);
      }
      
      saveCases(cases);

      // Log action
      const logs = getLogs();
      logs.unshift({
        id: logs.length + 1,
        user_id: currentUser.id,
        action: isExisting ? 'UPDATE_CASE' : 'CREATE_CASE',
        details: `Case ID: ${id}, CIF: ${data.userId} in backup database`,
        timestamp: timestamp
      });
      saveLogs(logs);

      return new Response(JSON.stringify({ success: true, id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 });
    }
  }

  // Admin checks for admin-only operations
  const isAdmin = currentUser.role === UserRole.ADMIN && currentUser.id === 'PS101435';

  // Route: GET /api/admin/users
  if (path.startsWith('/api/admin/users') && method === 'GET') {
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Access denied: Designated Administrator PS101435 only' }), { status: 403 });
    }
    const users = getUsers();
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Route: PATCH /api/admin/users/:id
  if (path.startsWith('/api/admin/users/') && method === 'PATCH') {
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Access denied: Designated Administrator PS101435 only' }), { status: 403 });
    }
    const match = path.match(/\/api\/admin\/users\/([^\/]+)/);
    if (!match) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    const targetId = match[1];
    
    try {
      const { role, isActive } = JSON.parse(options.body as string);
      const users = getUsers();
      const idx = users.findIndex(u => u.id === targetId);
      
      if (idx === -1) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
      }

      if (role !== undefined) users[idx].role = role;
      if (isActive !== undefined) users[idx].isActive = isActive;

      saveUsers(users);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 });
    }
  }

  // Route: POST /api/admin/users/:id/reset-password
  if (path.startsWith('/api/admin/users/') && path.endsWith('/reset-password') && method === 'POST') {
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Access denied: Designated Administrator PS101435 only' }), { status: 403 });
    }
    const match = path.match(/\/api\/admin\/users\/([^\/]+)\/reset-password/);
    if (!match) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    const targetId = match[1];

    const users = getUsers();
    const userExists = users.some(u => u.id === targetId);
    if (!userExists) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const passwords = getPasswords();
    passwords[targetId] = 'Affin123';
    savePasswords(passwords);

    const logs = getLogs();
    logs.unshift({
      id: logs.length + 1,
      user_id: currentUser.id,
      action: 'ADMIN_RESET_PASSWORD',
      details: `Reset password for operator: ${targetId} in backup database`,
      timestamp: new Date().toISOString()
    });
    saveLogs(logs);

    return new Response(JSON.stringify({ success: true, message: 'Password reset to default Affin123 successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Route: GET /api/admin/logs
  if (path.startsWith('/api/admin/logs') && method === 'GET') {
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Access denied: Designated Administrator PS101435 only' }), { status: 403 });
    }
    const logs = getLogs();
    const users = getUsers();
    
    // Add display_name and email details
    const populatedLogs = logs.map(l => {
      const u = users.find(user => user.id === l.user_id) || {};
      return {
        ...l,
        display_name: u.displayName || 'Unknown Operator',
        email: u.email || 'N/A'
      };
    });

    return new Response(JSON.stringify(populatedLogs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
}

// Safe custom fetch wrapper that intercepts and routes to browser fallback database
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input as Request).url);
  const originalFetch = window.fetch.bind(window);
  
  if (url.includes('/api/')) {
    const apiPath = url.substring(url.indexOf('/api/'));
    try {
      const response = await originalFetch(input, init);
      
      // Netlify or other client environments router-fallback to index.html when a 
      // backend is absent, causing content type to be text/html instead of proper JSON.
      const contentType = response.headers.get('content-type') || '';
      
      if (response.status === 404 || contentType.includes('text/html')) {
        console.warn(`[OwlFraudster] API Intercepted (404/HTML response matched on path ${apiPath}). Triggered browser fallback database...`);
        return await handleEmulatedRequest(apiPath, init);
      }
      
      return response;
    } catch (err) {
      console.warn(`[OwlFraudster] Node.js server unreachable on path ${apiPath}. Switching transparently to backup browser database...`, err);
      return await handleEmulatedRequest(apiPath, init);
    }
  }

  return originalFetch(input, init);
}

// Safe try-catch wrapper to attempt global window.fetch intercept, without causing fatal blockages
export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;
  try {
    // Only attempt if configurable or writable
    const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (!descriptor || descriptor.writable || descriptor.set || descriptor.configurable) {
      Object.defineProperty(window, 'fetch', {
        value: apiFetch,
        writable: true,
        configurable: true,
        enumerable: true
      });
      console.log('[OwlFraudster] Global fetch interceptor successfully installed.');
    } else {
      console.warn('[OwlFraudster] Global fetch is non-configurable; falling back to explicit apiFetch.');
    }
  } catch (err) {
    console.warn('[OwlFraudster] Could not redefine window.fetch globally, using explicit wrappers:', err);
  }
}
