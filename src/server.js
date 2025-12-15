// server.js
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './app.js';

import Product from './models/productModel.js'; 
import User from './models/userModel.js';
import Admin from './models/adminModel.js';

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



const seedAdmin = async () => {
    try {
        // 1. Connect to MongoDB
        

        // 2. Define Admin Credentials
        const adminCredentials = {
            email: 'ytsameer@gmail.com',
            password: 'Ayyomarchipoya@1', // This will be hashed by the Admin model pre-save hook
            role: 'admin'
        };

        // 3. Check if Admin already exists
        const adminExists = await Admin.findOne({ email: adminCredentials.email });

        if (adminExists) {
            console.log('⚠️ Admin user already exists.');
            process.exit();
        }

        // 4. Create new Admin
        const admin = await Admin.create(adminCredentials);

        console.log(`✅ Admin created successfully: ${admin.email}`);
        process.exit();

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
};

//seedAdmin();






 // To find an admin user to link products to



// const DUMMY_PRODUCTS = [
//     {
//         name: 'Classic Black T-shirt',
//         category: 'T-shirt',
//         description: 'A timeless, comfortable black crew neck made from 100% organic cotton.',
//         price: 999,
//         stock: 50,
//         sizes: ['S', 'M', 'L', 'XL'],
//         colour: 'Black',
//         image: 'https://dummyimage.com/600x400/000/fff&text=Black+Tee',
//     },
//     {
//         name: 'Sky Blue Oversized Hoodie',
//         category: 'Hoodie',
//         description: 'Relaxed fit hoodie for ultimate comfort and style.',
//         price: 2499,
//         stock: 30,
//         sizes: ['M', 'L', 'XL', 'XXL'],
//         colour: 'Sky Blue',
//         image: 'https://dummyimage.com/600x400/3498db/fff&text=Blue+Hoodie',
//     },
//     {
//         name: 'The Trail Runner Shoes',
//         category: 'Shoes',
//         description: 'Lightweight and durable shoes built for the toughest terrains.',
//         price: 4999,
//         stock: 20,
//         sizes: ['M', 'L'], // Assuming M, L correspond to shoe sizes like 9, 10
//         colour: 'Grey/Neon',
//         image: 'https://dummyimage.com/600x400/7f8c8d/fff&text=Running+Shoes',
//     },
//     {
//         name: 'Premium Leather Wallet',
//         category: 'Other',
//         description: 'Hand-stitched leather wallet with multiple card slots.',
//         price: 1500,
//         stock: 100,
//         sizes: ['S'], // Size is arbitrary for non-clothing items, using 'S'
//         colour: 'Brown',
//         image: 'https://dummyimage.com/600x400/8b4513/fff&text=Wallet',
//     },
//     {
//         name: 'Deep Forest Green T-shirt',
//         category: 'T-shirt',
//         description: 'Heavyweight cotton T-shirt in a rich, deep green.',
//         price: 1199,
//         stock: 45,
//         sizes: ['S', 'M', 'L'],
//         colour: 'Forest Green',
//         image: 'https://dummyimage.com/600x400/228b22/fff&text=Green+Tee',
//     },
// ];

// export const seedProducts = async () => {
//     try {
        

//         // 1. Find an existing user (we need an ID to link the product)
//         const user = await User.findOne({});
//         if (!user) {
//             console.error('No user found in database. Cannot link products.');
//             return;
//         }

//         // 2. Clear existing products (optional, for clean run)
//         await Product.deleteMany();
//         console.log('Existing products cleared.');

//         // 3. Prepare products with user ID
//         const productsWithUser = DUMMY_PRODUCTS.map(product => ({
//             ...product,
//             user: user._id,
//         }));

//         // 4. Insert data
//         await Product.insertMany(productsWithUser);
//         console.log(`Successfully added ${DUMMY_PRODUCTS.length} dummy products.`);

//     } catch (error) {
//         console.error(`Error during seeding: ${error.message}`);
//     } finally {
        
//     }
// };

// seedProducts();

// To run this script, you would typically add an entry to package.json:
// "seed": "node src/utils/seedProducts.js" 
// and then run "npm run seed"