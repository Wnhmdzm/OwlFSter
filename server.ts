/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'fms-super-secret-key-123';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Database Initialization
  const db = new Database('local_data.db');
  db.pragma('journal_mode = WAL');

  // Create Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      display_name TEXT,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      userId TEXT,
      caseCreatedTime TEXT,
      caseAssignedTime TEXT,
      mode TEXT,
      status TEXT,
      eventType TEXT,
      riskScore INTEGER,
      ipAddress TEXT,
      ruleId TEXT,
      policyAction TEXT,
      assignedTo TEXT,
      amount REAL,
      resolution TEXT,
      firstCallTime TEXT,
      reassignedToFA TEXT,
      secondCallTime TEXT,
      thirdCallTime TEXT,
      callResponse TEXT,
      remarks TEXT,
      fmsStatusAction TEXT,
      createdByUid TEXT,
      createdByName TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default users
  const expectedUsers = [
    { id: 'PS101435', email: 'ps101435@fms.pro', displayName: 'Zaim', role: 'admin', dept: 'Affin Bank Fraud HQ' },
    { id: 'PS101436', email: 'ps101436@fms.pro', displayName: 'Faris', role: 'user', dept: 'Affin Bank Fraud HQ' },
    { id: 'PS101477', email: 'ps101477@fms.pro', displayName: 'Nabil', role: 'user', dept: 'Affin Bank Fraud HQ' },
    { id: 'PS101405', email: 'ps101405@fms.pro', displayName: 'Naja', role: 'user', dept: 'Affin Bank Fraud HQ' },
    { id: 'PS101480', email: 'ps101480@fms.pro', displayName: 'Izzat', role: 'user', dept: 'Affin Bank Fraud HQ' }
  ];

  for (const u of expectedUsers) {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(u.id);
    if (!userExists) {
      const hashedPassword = await bcrypt.hash('Affin123', 10);
      db.prepare('INSERT OR IGNORE INTO users (id, email, password, display_name, role, department) VALUES (?, ?, ?, ?, ?, ?)')
        .run(u.id, u.email, hashedPassword, u.displayName, u.role, u.dept);
    } else {
      db.prepare('UPDATE users SET display_name = ?, role = ? WHERE id = ?').run(u.displayName, u.role, u.id);
    }
  }

  // Delete all other accounts to ensure absolute security and compliance
  db.prepare("DELETE FROM users WHERE id NOT IN ('PS101435', 'PS101436', 'PS101477', 'PS101405', 'PS101480')").run();
  console.log('Precisely seeded 5 FMS bank operators successfully!');

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  const adminOnly = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin' || req.user.id !== 'PS101435') {
      return res.status(403).json({ error: 'Access denied: Only PS101435 is designated as Administrator' });
    }
    next();
  };

  // API Routes
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    // Check both email address and Staff ID
    const user: any = db.prepare('SELECT * FROM users WHERE (email = ? OR id = ?) AND is_active = 1').get(email, email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, displayName: user.display_name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, displayName: user.display_name } });
  });

  app.get('/api/me', authenticateToken, (req: any, res) => {
    const user: any = db.prepare('SELECT id, email, display_name as displayName, role, is_active as isActive, department FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  });

  // Self password change
  app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNew, req.user.id);

    // Log activity
    db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)')
      .run(req.user.id, 'CHANGE_PASSWORD', `Changed own password successfully`);

    res.json({ success: true, message: 'Password changed successfully!' });
  });

  // Admin resets a user's password to Affin123
  app.post('/api/admin/users/:id/reset-password', authenticateToken, adminOnly, async (req: any, res) => {
    const { id } = req.params;
    
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const defaultHashed = await bcrypt.hash('Affin123', 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(defaultHashed, id);

    // Log activity
    db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)')
      .run(req.user.id, 'ADMIN_RESET_PASSWORD', `Reset password for operator: ${id}`);

    res.json({ success: true, message: 'Password reset to default Affin123 successfully!' });
  });

  // Case Management
  app.get('/api/cases', authenticateToken, (req, res) => {
    const cases = db.prepare('SELECT * FROM cases ORDER BY createdAt DESC').all();
    res.json(cases);
  });

  app.get('/api/cases/search', authenticateToken, (req, res) => {
    const { cif } = req.query;
    const record = db.prepare('SELECT * FROM cases WHERE userId = ?').get(cif);
    res.json(record || null);
  });

  app.post('/api/cases', authenticateToken, (req: any, res) => {
    const data = req.body;
    const id = data.id || crypto.randomUUID();
    
    const existing = db.prepare('SELECT id FROM cases WHERE id = ?').get(id);
    
    const stmt = existing 
      ? db.prepare(`
          UPDATE cases SET 
            userId = ?, caseCreatedTime = ?, caseAssignedTime = ?, mode = ?, status = ?, 
            eventType = ?, riskScore = ?, ipAddress = ?, ruleId = ?, policyAction = ?, 
            assignedTo = ?, amount = ?, resolution = ?, firstCallTime = ?, reassignedToFA = ?, 
            secondCallTime = ?, thirdCallTime = ?, callResponse = ?, remarks = ?, 
            fmsStatusAction = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
      : db.prepare(`
          INSERT INTO cases (
            userId, caseCreatedTime, caseAssignedTime, mode, status, 
            eventType, riskScore, ipAddress, ruleId, policyAction, 
            assignedTo, amount, resolution, firstCallTime, reassignedToFA, 
            secondCallTime, thirdCallTime, callResponse, remarks, 
            fmsStatusAction, createdByUid, createdByName, id
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `);

    const params = [
      data.userId, data.caseCreatedTime, data.caseAssignedTime, data.mode, data.status,
      data.eventType, data.riskScore, data.ipAddress, data.ruleId, data.policyAction,
      data.assignedTo, data.amount, data.resolution, data.firstCallTime, data.reassignedToFA,
      data.secondCallTime, data.thirdCallTime, data.callResponse, data.remarks,
      data.fmsStatusAction
    ];

    if (existing) {
      params.push(id);
    } else {
      params.push(req.user.id, req.user.displayName, id);
    }

    stmt.run(...params);
    
    // Log activity
    db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)')
      .run(req.user.id, existing ? 'UPDATE_CASE' : 'CREATE_CASE', `Case ID: ${id}, CIF: ${data.userId}`);

    res.json({ success: true, id });
  });

  // Admin: User Management
  app.get('/api/admin/users', authenticateToken, adminOnly, (req, res) => {
    const users = db.prepare('SELECT id, email, display_name as displayName, role, is_active as isActive, department FROM users').all();
    res.json(users);
  });

  app.patch('/api/admin/users/:id', authenticateToken, adminOnly, (req, res) => {
    const { id } = req.params;
    const { role, isActive } = req.body;
    
    if (role !== undefined) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    }
    if (isActive !== undefined) {
      db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
    }
    
    res.json({ success: true });
  });

  // Activity Logs
  app.get('/api/admin/logs', authenticateToken, adminOnly, (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, u.display_name, u.email 
      FROM activity_logs l 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.timestamp DESC 
      LIMIT 100
    `).all();
    res.json(logs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
