const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ quiet: true });

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ng_tailadmin';
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:4200';
const jwtSecret = process.env.JWT_SECRET || 'change-this-secret';
const adminUsername = process.env.ADMIN_USERNAME || 'dhernandez';
const adminPassword = process.env.ADMIN_PASSWORD;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || `http://127.0.0.1:${port}/api/google/callback`;
const roles = ['administrador', 'coach', 'alumno'];
const calendarScope = 'https://www.googleapis.com/auth/calendar.events';
const googleOAuthScopes = [calendarScope, 'https://www.googleapis.com/auth/userinfo.email'];

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active'
    }
  },
  { timestamps: true }
);

const Item = mongoose.model('Item', itemSchema);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 80
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: roles,
      default: 'alumno'
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 160,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ''
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ''
    },
    avatar: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '/images/user/owner.jpg'
    },
    social: {
      facebook: { type: String, trim: true, maxlength: 300, default: '' },
      x: { type: String, trim: true, maxlength: 300, default: '' },
      linkedin: { type: String, trim: true, maxlength: 300, default: '' },
      instagram: { type: String, trim: true, maxlength: 300, default: '' }
    },
    address: {
      country: { type: String, trim: true, maxlength: 120, default: '' },
      cityState: { type: String, trim: true, maxlength: 160, default: '' },
      postalCode: { type: String, trim: true, maxlength: 40, default: '' },
      taxId: { type: String, trim: true, maxlength: 80, default: '' }
    },
    googleCalendar: {
      email: { type: String, trim: true, lowercase: true, default: '' },
      accessToken: { type: String, default: '' },
      refreshToken: { type: String, default: '' },
      expiryDate: { type: Number, default: 0 },
      connectedAt: { type: Date }
    }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

const calendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    },
    calendar: {
      type: String,
      enum: ['Danger', 'Success', 'Primary', 'Warning'],
      default: 'Primary'
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    google: {
      studentEventId: { type: String, default: '' },
      coachEventId: { type: String, default: '' },
      studentSyncStatus: { type: String, enum: ['pending', 'synced', 'failed', 'skipped'], default: 'pending' },
      coachSyncStatus: { type: String, enum: ['pending', 'synced', 'failed', 'skipped'], default: 'pending' },
      lastError: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

calendarEventSchema.index({ coach: 1, start: 1, end: 1 });
calendarEventSchema.index({ student: 1, start: 1, end: 1 });

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

function sanitizeUser(user) {
  return {
    _id: user._id,
    username: user.username,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    bio: user.bio,
    location: user.location,
    avatar: user.avatar,
    social: user.social,
    address: user.address,
    googleCalendar: {
      connected: Boolean(user.googleCalendar?.refreshToken),
      email: user.googleCalendar?.email || '',
      connectedAt: user.googleCalendar?.connectedAt
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function sanitizeCalendarEvent(event) {
  const student = event.student && typeof event.student === 'object' ? sanitizeUser(event.student) : event.student;
  const coach = event.coach && typeof event.coach === 'object' ? sanitizeUser(event.coach) : event.coach;

  return {
    _id: event._id,
    title: event.title,
    start: event.start,
    end: event.end,
    calendar: event.calendar,
    student,
    coach,
    createdBy: event.createdBy,
    google: event.google,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

function getOneHourEnd(start) {
  return new Date(start.getTime() + 60 * 60 * 1000);
}

async function findCalendarConflict({ start, end, coachId, studentId, excludeEventId }) {
  const filter = {
    start: { $lt: end },
    end: { $gt: start },
    $or: [
      { coach: coachId },
      { student: studentId }
    ]
  };

  if (excludeEventId) {
    filter._id = { $ne: excludeEventId };
  }

  return CalendarEvent.findOne(filter).populate(['student', 'coach']);
}

function getGoogleOAuthClient() {
  if (!googleClientId || !googleClientSecret) {
    return null;
  }

  return new google.auth.OAuth2(googleClientId, googleClientSecret, googleRedirectUri);
}

function getGoogleOAuthClientForUser(user) {
  const client = getGoogleOAuthClient();

  if (!client || !user.googleCalendar?.refreshToken) {
    return null;
  }

  client.setCredentials({
    access_token: user.googleCalendar.accessToken || undefined,
    refresh_token: user.googleCalendar.refreshToken,
    expiry_date: user.googleCalendar.expiryDate || undefined
  });

  return client;
}

function toGoogleCalendarResource(event, student, coach) {
  return {
    summary: event.title,
    description: `Clase agendada en TailAdmin.\nAlumno: ${student.firstName || student.username} ${student.lastName || ''}\nCoach: ${coach.firstName || coach.username} ${coach.lastName || ''}`.trim(),
    start: {
      dateTime: event.start.toISOString()
    },
    end: {
      dateTime: event.end.toISOString()
    }
  };
}

async function upsertGoogleEventForUser(user, event, existingGoogleEventId, student, coach) {
  const auth = getGoogleOAuthClientForUser(user);

  if (!auth) {
    return { status: 'pending', eventId: existingGoogleEventId || '', error: '' };
  }

  const calendar = google.calendar({ version: 'v3', auth });
  const resource = toGoogleCalendarResource(event, student, coach);

  try {
    if (existingGoogleEventId) {
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: existingGoogleEventId,
        requestBody: resource
      });

      return { status: 'synced', eventId: response.data.id, error: '' };
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: resource
    });

    return { status: 'synced', eventId: response.data.id, error: '' };
  } catch (error) {
    return { status: 'failed', eventId: existingGoogleEventId || '', error: error.message };
  }
}

async function syncCalendarEventToGoogle(event) {
  const populatedEvent = await event.populate(['student', 'coach']);
  const student = populatedEvent.student;
  const coach = populatedEvent.coach;

  const studentSync = await upsertGoogleEventForUser(
    student,
    populatedEvent,
    populatedEvent.google?.studentEventId,
    student,
    coach
  );
  const coachSync = await upsertGoogleEventForUser(
    coach,
    populatedEvent,
    populatedEvent.google?.coachEventId,
    student,
    coach
  );

  populatedEvent.google = {
    studentEventId: studentSync.eventId,
    coachEventId: coachSync.eventId,
    studentSyncStatus: studentSync.status,
    coachSyncStatus: coachSync.status,
    lastError: [studentSync.error, coachSync.error].filter(Boolean).join(' | ')
  };

  await populatedEvent.save();
  return populatedEvent;
}

async function deleteGoogleEventForUser(user, eventId) {
  const auth = getGoogleOAuthClientForUser(user);

  if (!auth || !eventId) {
    return;
  }

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({ calendarId: 'primary', eventId });
  } catch (error) {
    if (error.code !== 410 && error.code !== 404) {
      throw error;
    }
  }
}

function ensureDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'MongoDB is not connected. Check MONGODB_URI and make sure MongoDB is running.'
    });
  }

  return next();
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      role: user.role
    },
    jwtSecret,
    { expiresIn: '8h' }
  );
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    return next();
  };
}

async function seedAdminUser() {
  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD is missing. Admin user was not created.');
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await User.findOneAndUpdate(
    { username: adminUsername.toLowerCase() },
    {
      username: adminUsername.toLowerCase(),
      passwordHash,
      role: 'administrador',
      firstName: 'Dany',
      lastName: 'Hernandez',
      email: 'dhernandez@example.com',
      bio: 'Administrador'
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );

  console.log(`Admin user ready: ${adminUsername}`);
}

app.get('/api/health', (req, res) => {
  res.json({
    api: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.post('/api/auth/login', ensureDatabase, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await User.findOne({ username });
    const isValidPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !isValidPassword) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    return res.json({
      token: signToken(user),
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/auth/me', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const update = {};

    [
      'firstName',
      'lastName',
      'email',
      'phone',
      'bio',
      'location',
      'avatar'
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    });

    if (req.body.social !== undefined) {
      update.social = req.body.social;
    }

    if (req.body.address !== undefined) {
      update.address = req.body.address;
    }

    const user = await User.findByIdAndUpdate(req.user.sub, update, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/google/status', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    res.json({
      connected: Boolean(user?.googleCalendar?.refreshToken),
      email: user?.googleCalendar?.email || '',
      configured: Boolean(googleClientId && googleClientSecret)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/google/auth-url', ensureDatabase, authenticate, (req, res) => {
  const client = getGoogleOAuthClient();

  if (!client) {
    return res.status(503).json({ message: 'Google Calendar OAuth is not configured.' });
  }

  const state = jwt.sign({ sub: req.user.sub }, jwtSecret, { expiresIn: '10m' });
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: googleOAuthScopes,
    state
  });

  return res.json({ url });
});

app.get('/api/google/callback', ensureDatabase, async (req, res, next) => {
  try {
    const client = getGoogleOAuthClient();

    if (!client) {
      return res.status(503).send('Google Calendar OAuth is not configured.');
    }

    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send('Missing Google OAuth code or state.');
    }

    const payload = jwt.verify(state, jwtSecret);
    const { tokens } = await client.getToken(String(code));
    client.setCredentials(tokens);

    let googleEmail = '';

    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const profile = await oauth2.userinfo.get();
      googleEmail = profile.data.email || '';
    } catch (error) {
      googleEmail = '';
    }

    const existingUser = await User.findById(payload.sub);
    await User.findByIdAndUpdate(payload.sub, {
      googleCalendar: {
        email: googleEmail,
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || existingUser?.googleCalendar?.refreshToken || '',
        expiryDate: tokens.expiry_date || 0,
        connectedAt: new Date()
      }
    });

    return res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 32px;">
          <h2>Google Calendar conectado</h2>
          <p>Ya puedes cerrar esta ventana y volver a TailAdmin.</p>
        </body>
      </html>
    `);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/coaches', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const coaches = await User.find({ role: 'coach' }).sort({ firstName: 1, username: 1 });
    res.json(coaches.map(sanitizeUser));
  } catch (error) {
    next(error);
  }
});

app.get('/api/students', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const students = await User.find({ role: { $in: ['alumno', 'administrador'] } }).sort({ firstName: 1, username: 1 });
    res.json(students.map(sanitizeUser));
  } catch (error) {
    next(error);
  }
});

app.get('/api/calendar-events', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'alumno') {
      filter.student = req.user.sub;
    } else if (req.user.role === 'coach') {
      filter.coach = req.user.sub;
    }

    const events = await CalendarEvent.find(filter)
      .populate(['student', 'coach'])
      .sort({ start: 1 });

    res.json(events.map(sanitizeCalendarEvent));
  } catch (error) {
    next(error);
  }
});

app.post('/api/calendar-events', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const coachId = String(req.body.coachId || '').trim();
    const start = new Date(req.body.start);
    const end = getOneHourEnd(start);
    const calendar = req.body.calendar || 'Primary';

    const requestedStudentId = String(req.body.studentId || '').trim();

    if (
      !title ||
      Number.isNaN(start.getTime()) ||
      (req.user.role !== 'coach' && !coachId) ||
      (req.user.role !== 'alumno' && !requestedStudentId)
    ) {
      return res.status(400).json({ message: 'Title, coach, student, start and end are required.' });
    }

    if (start <= new Date()) {
      return res.status(400).json({ message: 'Start time must be in the future.' });
    }

    const resolvedCoachId = req.user.role === 'coach' ? req.user.sub : coachId;
    const coach = await User.findOne({ _id: resolvedCoachId, role: 'coach' });

    if (!coach) {
      return res.status(400).json({ message: 'Selected coach was not found.' });
    }

    const studentId = req.user.role === 'alumno' ? req.user.sub : requestedStudentId;
    const student = await User.findOne({ _id: studentId, role: { $in: ['alumno', 'administrador'] } });

    if (!student) {
      return res.status(400).json({ message: 'Selected student was not found.' });
    }

    const conflict = await findCalendarConflict({
      start,
      end,
      coachId: coach._id,
      studentId: student._id
    });

    if (conflict) {
      return res.status(409).json({ message: 'This coach or student already has an event scheduled at that time.' });
    }

    const event = await CalendarEvent.create({
      title,
      start,
      end,
      calendar,
      student: student._id,
      coach: coach._id,
      createdBy: req.user.sub
    });

    const syncedEvent = await syncCalendarEventToGoogle(event);
    return res.status(201).json(sanitizeCalendarEvent(syncedEvent));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/calendar-events/:id', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Calendar event not found.' });
    }

    const canEdit =
      req.user.role === 'administrador' ||
      event.student.toString() === req.user.sub ||
      event.coach.toString() === req.user.sub;

    if (!canEdit) {
      return res.status(403).json({ message: 'You do not have permission to edit this event.' });
    }

    if (req.body.title !== undefined) event.title = String(req.body.title).trim();
    if (req.body.start !== undefined) {
      const start = new Date(req.body.start);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({ message: 'Start date and time are required.' });
      }
      if (start <= new Date()) {
        return res.status(400).json({ message: 'Start time must be in the future.' });
      }
      event.start = start;
      event.end = getOneHourEnd(start);
    }
    if (req.body.calendar !== undefined) event.calendar = req.body.calendar;

    if (req.body.coachId !== undefined && req.user.role !== 'coach') {
      const coach = await User.findOne({ _id: req.body.coachId, role: 'coach' });
      if (!coach) return res.status(400).json({ message: 'Selected coach was not found.' });
      event.coach = coach._id;
    }

    if (req.body.studentId !== undefined && req.user.role !== 'alumno') {
      const student = await User.findOne({ _id: req.body.studentId, role: { $in: ['alumno', 'administrador'] } });
      if (!student) return res.status(400).json({ message: 'Selected student was not found.' });
      event.student = student._id;
    }

    const conflict = await findCalendarConflict({
      start: event.start,
      end: event.end,
      coachId: event.coach,
      studentId: event.student,
      excludeEventId: event._id
    });

    if (conflict) {
      return res.status(409).json({ message: 'This coach or student already has an event scheduled at that time.' });
    }

    await event.save();
    const syncedEvent = await syncCalendarEventToGoogle(event);
    return res.json(sanitizeCalendarEvent(syncedEvent));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/calendar-events/:id', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id).populate(['student', 'coach']);

    if (!event) {
      return res.status(404).json({ message: 'Calendar event not found.' });
    }

    const canDelete =
      req.user.role === 'administrador' ||
      event.student._id.toString() === req.user.sub ||
      event.coach._id.toString() === req.user.sub;

    if (!canDelete) {
      return res.status(403).json({ message: 'You do not have permission to delete this event.' });
    }

    await deleteGoogleEventForUser(event.student, event.google?.studentEventId);
    await deleteGoogleEventForUser(event.coach, event.google?.coachEventId);
    await event.deleteOne();

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/users', ensureDatabase, authenticate, requireRole('administrador'), async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(sanitizeUser));
  } catch (error) {
    next(error);
  }
});

app.post('/api/users', ensureDatabase, authenticate, requireRole('administrador'), async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'alumno').trim().toLowerCase();

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    if (!roles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      passwordHash,
      role,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      bio: req.body.bio,
      location: req.body.location,
      avatar: req.body.avatar,
      social: req.body.social,
      address: req.body.address
    });

    return res.status(201).json(sanitizeUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    return next(error);
  }
});

app.patch('/api/users/:id', ensureDatabase, authenticate, requireRole('administrador'), async (req, res, next) => {
  try {
    const update = {};

    if (req.body.username !== undefined) {
      update.username = String(req.body.username).trim().toLowerCase();
    }

    if (req.body.role !== undefined) {
      const role = String(req.body.role).trim().toLowerCase();

      if (!roles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role.' });
      }

      update.role = role;
    }

    [
      'firstName',
      'lastName',
      'email',
      'phone',
      'bio',
      'location',
      'avatar'
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    });

    if (req.body.social !== undefined) {
      update.social = req.body.social;
    }

    if (req.body.address !== undefined) {
      update.address = req.body.address;
    }

    if (req.body.password) {
      update.passwordHash = await bcrypt.hash(String(req.body.password), 12);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json(sanitizeUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    return next(error);
  }
});

app.delete('/api/users/:id', ensureDatabase, authenticate, requireRole('administrador'), async (req, res, next) => {
  try {
    if (req.user.sub === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own user.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/items', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (error) {
    next(error);
  }
});

app.post('/api/items', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const item = await Item.create({
      name: req.body.name,
      description: req.body.description,
      status: req.body.status
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/items/:id', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    return res.json(item);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/items/:id', ensureDatabase, authenticate, async (req, res, next) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

const clientDistPath = path.join(__dirname, '..', 'dist', 'ng-tailadmin', 'browser');

app.use(express.static(clientDistPath));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.use((error, req, res, next) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: 'Unexpected server error.' });
});

mongoose
  .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log('MongoDB connected');
    await seedAdminUser();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
  });

app.listen(port, () => {
  console.log(`API server listening on http://127.0.0.1:${port}`);
});
