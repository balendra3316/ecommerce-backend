import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a product name'],
        trim: true,
        maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    category: {
        type: String,
        required: [true, 'Please select a category for this product'],
        enum: {
            values: ['T-shirt', 'Hoodie', 'Shoes', 'Other'],
            message: 'Please select a valid category: T-shirt, Hoodie, Shoes, or Other'
        }
    },
    description: {
        type: String,
        required: [true, 'Please add a product description']
    },
    price: {
        type: Number,
        required: [true, 'Please add a product price'],
        maxlength: [8, 'Price cannot exceed 8 digits']
    },
    // Stock/Quantity per size/color can get complex. We'll track total stock simply for now.
    stock: { 
        type: Number,
        required: [true, 'Please add stock quantity'],
        default: 0
    },
    sizes: {
        type: [String],
        enum: ['S', 'M', 'L', 'XL', 'XXL'], // Assuming a standard clothing size set
        default: [],
        required: [true, 'Please specify available sizes']
    },
    colour: {
        type: String, // Can be text (e.g., "Red", "Navy Blue") or hex code
        default: 'None'
    },
    image: {
        // In a real app, this would be an array of image URLs from a service like AWS S3
        type: String, 
        required: [true, 'Please add a product image URL']
    },
    user: { // To link product creation to a user (Admin)
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
}, {
    timestamps: true,
});

const Product = mongoose.model('Product', productSchema);
export default Product;