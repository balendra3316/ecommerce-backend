// server.js
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './app.js';


dotenv.config();

// Disable console logs except errors in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

const port = process.env.PORT || 5003;

// Connect to MongoDB first, then start server
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to DB', err);
    process.exit(1);
  });

