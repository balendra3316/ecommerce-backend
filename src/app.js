// app.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import  {apiLimiter} from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
const app = express();

const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// PRODUCTION MIDDLEWARE
app.use(helmet());
app.use(compression());

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(apiLimiter);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(errorHandler);

app.use('/api/auth', authRoutes);



// Basic test route for quick verification
app.get('/', (req, res) => {
  res.send('dashboard API is running... tytyy');
});

export default app;
