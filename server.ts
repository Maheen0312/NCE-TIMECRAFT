import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { TimetableScheduler } from './src/scheduler/scheduler';
import { TimetableValidator } from './src/scheduler/validator';
import { ScheduleOptimizer } from './src/scheduler/optimizer';
import { defaultMasterTimeSlots } from './src/services/timeSlotService';
import { defaultRules } from './src/services/rulesService';
import { TimetableModifier } from './src/server/timetableModifier';
import { handleTimetableAssistant } from './src/server/ai/timetableAssistant';
import { analyzeTimetableWithAI } from './src/server/ai/timetableAnalyzer';
import { extractTimetableDataWithAI } from './src/server/ai/dataExtractor';
import { extractTimetableFromImageWithAI } from './src/server/ai/imageExtractor';

import { MASTER_STAFF } from './src/config/timetableConfig';

// In-memory persistent server user store initialized with institution master accounts
interface ServerUserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'unauthorized' | 'unrecognized';
  staffCode?: string | null;
  department?: string | null;
  active: boolean;
  createdAt: string;
  lastLogin?: string | null;
}

const serverUsersMap = new Map<string, ServerUserProfile>();

// Seed default institution accounts
const initialMasterAccounts: ServerUserProfile[] = [
  {
    uid: 'admin_primary',
    name: 'Administrator',
    email: 'admin@nce.edu',
    role: 'admin',
    staffCode: null,
    department: 'Administration',
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    uid: 'admin_maheen',
    name: 'Maheen Mohideen',
    email: 'maheenmohideen@gmail.com',
    role: 'admin',
    staffCode: 'MSM',
    department: 'Computer Science & Engineering',
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  ...MASTER_STAFF.map(s => ({
    uid: `staff_${s.staffCode}`,
    name: s.name,
    email: s.email,
    role: 'staff' as const,
    staffCode: s.staffCode,
    department: s.department,
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  })),
];

initialMasterAccounts.forEach(u => serverUsersMap.set(u.uid, u));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'NCE Timecraft Scheduling Engine v4.0 (AI + Intelligence)' });
  });

  // Admin Secret Code verification endpoint
  // Validates administrator secret passcode strictly server-side - NEVER exposed to frontend
  app.post('/api/auth/verify-admin-code', (req, res) => {
    try {
      const { secretCode, uid, email, displayName, staffCode } = req.body;
      if (!secretCode || typeof secretCode !== 'string') {
        return res.status(400).json({ success: false, message: 'Admin Secret Code is required.' });
      }

      const expectedCode = (process.env.ADMIN_SECRET_CODE || 'NCE9518').trim();
      if (secretCode.trim().toUpperCase() !== expectedCode.toUpperCase()) {
        return res.status(401).json({ success: false, message: 'Invalid Admin Secret Code.' });
      }

      let adminProfile: ServerUserProfile | null = null;
      if (uid) {
        const existing = serverUsersMap.get(uid);
        adminProfile = {
          uid,
          name: displayName || existing?.name || (email ? email.split('@')[0] : 'Administrator'),
          email: email || existing?.email || 'admin@nce.edu',
          role: 'admin',
          staffCode: staffCode || existing?.staffCode || null,
          department: existing?.department || 'Administration',
          active: true,
          createdAt: existing?.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        serverUsersMap.set(uid, adminProfile);
      }

      return res.json({
        success: true,
        message: 'Admin Secret Code verified successfully.',
        verified: true,
        adminProfile,
      });
    } catch (error: any) {
      console.error('Error verifying admin secret code:', error);
      return res.status(500).json({ success: false, message: 'Server error verifying admin secret code.' });
    }
  });

  // Admin User Directory APIs - Server-Side Auth User Directory
  app.get('/api/admin/users', (req, res) => {
    try {
      const userList = Array.from(serverUsersMap.values());
      return res.json({
        success: true,
        users: userList,
        count: userList.length,
      });
    } catch (error: any) {
      console.error('Error fetching admin users:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/users/sync', (req, res) => {
    try {
      const profile = req.body;
      if (profile && profile.uid) {
        const existing = serverUsersMap.get(profile.uid);
        serverUsersMap.set(profile.uid, {
          uid: profile.uid,
          name: profile.name || existing?.name || 'User',
          email: profile.email || existing?.email || '',
          role: profile.role || existing?.role || 'staff',
          staffCode: profile.staffCode || existing?.staffCode || null,
          department: profile.department || existing?.department || null,
          active: profile.active !== false,
          createdAt: existing?.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
      }
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/users/role', (req, res) => {
    try {
      const { uid, role } = req.body;
      if (!uid || !role) {
        return res.status(400).json({ success: false, message: 'UID and role are required.' });
      }
      const user = serverUsersMap.get(uid);
      if (user) {
        user.role = role;
        serverUsersMap.set(uid, user);
      }
      return res.json({ success: true, message: 'User role updated.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/admin/users/:uid', (req, res) => {
    try {
      const { uid } = req.params;
      serverUsersMap.delete(uid);
      return res.json({ success: true, message: 'User removed from directory.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/users/bulk-delete', (req, res) => {
    try {
      const { uids } = req.body;
      if (Array.isArray(uids)) {
        uids.forEach(uid => serverUsersMap.delete(uid));
      }
      return res.json({ success: true, message: 'Selected users removed.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Server timestamp endpoint: provides authoritative server/database time
  app.get('/api/server-time', (req, res) => {
    res.json({
      serverTime: Date.now(),
      iso: new Date().toISOString(),
    });
  });

  // 1. GENERATE API: POST /api/timetable/generate
  app.post('/api/timetable/generate', async (req, res) => {
    try {
      const { department, year, semester, staff, subjects, labs, rooms, timeSlots, specialSessions, rules, seed, consistentMode } = req.body;

      const result = TimetableScheduler.generate({
        department: department || 'Computer Science & Engineering',
        year: year || 'III',
        semester: semester || '5',
        staff: staff || [],
        subjects: subjects || [],
        labs: labs || [],
        rooms: rooms || [],
        timeSlots: timeSlots || [],
        specialSessions: specialSessions || [],
        rules: rules || defaultRules,
        seed: seed,
        consistentMode: consistentMode !== false,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
          suggestions: result.suggestions,
        });
      }

      return res.json(result);
    } catch (error: any) {
      console.error('Server error in /api/timetable/generate:', error);
      return res.status(500).json({
        success: false,
        errors: [error.message || 'Internal server error in timetable generator.'],
      });
    }
  });

  // 2. VALIDATE API: POST /api/timetable/validate
  app.post('/api/timetable/validate', (req, res) => {
    try {
      const { entries, subjects, timeSlots } = req.body;

      const formattedSlots = (timeSlots || defaultMasterTimeSlots).map((s: any, idx: number) => ({
        id: s.id || `slot_${idx}`,
        day: s.day || 'Monday',
        slotIndex: s.order ?? idx,
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.type || 'CLASS',
        isMorning: (s.order ?? idx) < 5,
        isAfternoon: (s.order ?? idx) >= 5,
      }));

      const validation = TimetableValidator.validate(entries || [], subjects || [], formattedSlots);
      const quality = ScheduleOptimizer.calculateQuality(entries || [], subjects || [], formattedSlots);
      validation.qualityScore = quality.score;
      validation.qualityMetrics = quality.metrics;

      return res.json({ success: true, validation });
    } catch (error: any) {
      console.error('Server error in /api/timetable/validate:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. MOVE CLASS API: POST /api/timetable/move
  app.post('/api/timetable/move', (req, res) => {
    try {
      const { timetable, entryId, targetDay, targetSlotIndex, subjects, rooms } = req.body;
      const result = TimetableModifier.moveClass({
        timetable,
        entryId,
        targetDay,
        targetSlotIndex,
        subjects: subjects || [],
        rooms: rooms || [],
      });
      return res.json(result);
    } catch (error: any) {
      console.error('Server error in /api/timetable/move:', error);
      return res.status(500).json({ valid: false, message: error.message });
    }
  });

  // 4. REGENERATE SUBJECT API: POST /api/timetable/regenerate-subject
  app.post('/api/timetable/regenerate-subject', (req, res) => {
    try {
      const { timetable, subjectCode, subjects, rooms } = req.body;
      const result = TimetableModifier.regenerateSubject(
        timetable,
        subjectCode,
        subjects || [],
        rooms || []
      );
      return res.json(result);
    } catch (error: any) {
      console.error('Server error in /api/timetable/regenerate-subject:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // 5. AUTO-FIX CONFLICTS API: POST /api/timetable/auto-fix
  app.post('/api/timetable/auto-fix', (req, res) => {
    try {
      const { timetable, subjects, rooms } = req.body;
      const result = TimetableModifier.autoFixConflicts(
        timetable,
        subjects || [],
        rooms || []
      );
      return res.json(result);
    } catch (error: any) {
      console.error('Server error in /api/timetable/auto-fix:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // 6. AI TIMETABLE ASSISTANT API: POST /api/ai/timetable-assistant
  app.post('/api/ai/timetable-assistant', async (req, res) => {
    try {
      const result = await handleTimetableAssistant(req.body);
      return res.json(result);
    } catch (error: any) {
      console.error('Server error in /api/ai/timetable-assistant:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // 7. AI TIMETABLE ANALYZER API: POST /api/ai/analyze-timetable
  app.post('/api/ai/analyze-timetable', async (req, res) => {
    try {
      const { timetable, validation, subjects, staff, rooms } = req.body;
      const result = await analyzeTimetableWithAI(
        timetable,
        validation,
        subjects || [],
        staff || [],
        rooms || []
      );
      return res.json(result);
    } catch (error: any) {
      console.error('Server error in /api/ai/analyze-timetable:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. AI DATA EXTRACTION API: POST /api/ai/extract-data
  app.post('/api/ai/extract-data', async (req, res) => {
    try {
      const { text, department } = req.body;
      const result = await extractTimetableDataWithAI(text || '', department);
      return res.json(result);
    } catch (error: any) {
      console.error('Server error in /api/ai/extract-data:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9. AI TIMETABLE IMAGE EXTRACTION API: POST /api/ai/extract-image
  app.post('/api/ai/extract-image', async (req, res) => {
    try {
      const { imageBase64, mimeType, department, year, semester } = req.body;
      const result = await extractTimetableFromImageWithAI({
        imageBase64,
        mimeType,
        department,
        year,
        semester,
      });
      return res.json(result);
    } catch (error: any) {
      console.error('Server error in /api/ai/extract-image:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite Middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NCE Timecraft server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
