# ACD E-commerce Backend

Node.js Express backend server for ACD E-commerce platform with MongoDB.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   - Copy `.env` file and update MongoDB connection string
   - Set JWT_SECRET for authentication

3. **Start Server:**
   ```bash
   npm start        # Production
   npm run dev      # Development (with nodemon)
   ```

4. **MongoDB Setup:**
   - Ensure MongoDB is running locally or update `MONGODB_URI` in `.env`

## API Routes

- `GET /` - Welcome message
- `GET /api/products` - Get all products
- `GET /api/users` - Get all users
- `GET /api/orders` - Get all orders

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT
- **Password Hashing:** bcryptjs
