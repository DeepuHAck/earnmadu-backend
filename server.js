const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './.env' });

// Debug logging for MongoDB connection
console.log('Attempting to connect to MongoDB...');
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');
const earningRoutes = require('./routes/earningRoutes');

const app = express();

// Trust proxy - Required for rate limiting behind reverse proxies (like Render)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Enable pre-flight requests for all routes
app.options('*', cors());

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://earnmadu-frontend.vercel.app',
      'https://earnmadu-frontend-git-main-deepumons-projects.vercel.app',
      'https://earnmadu-frontend-frontend-7igk-df8iz71ks-deepumons-projects.vercel.app',
      'https://earnmadu-frontend-frontend-7igk.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('Rejected Origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
    
    console.log('Accepted Origin:', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400
}));

// Add CORS error handling
app.use((err, req, res, next) => {
  if (err.name === 'CORSError') {
    console.error('CORS Error:', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      error: err.message
    });
    return res.status(403).json({
      status: 'error',
      message: 'CORS error: ' + err.message
    });
  }
  next(err);
});

// Rate limiting
const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/earnings', earningRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

mongoose.connect(process.env.MONGODB_URI, {
  retryWrites: true,
  w: 'majority',
  directConnection: false,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('DB connection successful!'))
.catch(err => {
  console.error('DB connection error details:', {
    name: err.name,
    message: err.message,
    code: err.code,
    reason: err.reason
  });
  process.exit(1);
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

// Handle unhandled rejections
process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
}); 