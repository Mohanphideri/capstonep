import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import staffRoutes from './routes/staff.js';
import appointmentRoutes from './routes/appointments.js';
import queueRoutes from './routes/queue.js';
import queryRoutes from './routes/queries.js';
import pharmacyRoutes from './routes/pharmacy.js';
import leaveRoutes from './routes/leave.js';
import departmentRoutes from './routes/departments.js';
import analyticsRoutes from './routes/analytics.js';
import scheduleRoutes from './routes/schedule.js';
import patientRoutes from './routes/patients.js';
import billingRoutes from './routes/billing.js';
import financeRoutes from './routes/finance.js';
import encounterRoutes from './routes/encounters.js';
import ipdRoutes from './routes/ipd.js';

// Middleware
import { authenticate, requirePasswordReset } from './middleware/auth.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/heartstone');

const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB connection error:', err));
db.once('open', () => console.log('MongoDB connected'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/encounters', encounterRoutes);
app.use('/api/ipd', ipdRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HeartStone API is running' });
});

// Socket.IO middleware - authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  next();
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join department room for queue updates
  socket.on('join-department', (departmentId) => {
    socket.join(`department-${departmentId}`);
    console.log(`Socket ${socket.id} joined department-${departmentId}`);
  });

  // Leave department room
  socket.on('leave-department', (departmentId) => {
    socket.leave(`department-${departmentId}`);
    console.log(`Socket ${socket.id} left department-${departmentId}`);
  });

  // Queue status update broadcast
  socket.on('queue-update', (data) => {
    io.to(`department-${data.departmentId}`).emit('queue-status-updated', data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Export io for use in controllers if needed
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`HeartStone API running on port ${PORT}`);
});
