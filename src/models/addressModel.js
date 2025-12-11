import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true, // Must be linked to a registered user
    },
    isDefaultShipping: {
        type: Boolean,
        default: false,
    },
    isDefaultBilling: {
        type: Boolean,
        default: false,
    },
    // The full address structure, same as requested for shipping/billing in OrderModel
    name: { type: String, required: [true, 'Recipient name is required'] },
    address_line1: { type: String, required: [true, 'Address line 1 is required'] },
    address_line2: { type: String },
    city: { type: String, required: [true, 'City is required'] },
    state: { type: String, required: [true, 'State is required'] },
    pincode: { type: String, required: [true, 'Pincode is required'] },
    phone: { type: String, required: [true, 'Phone number is required'] },
    email: { type: String }, // Optional
}, {
    timestamps: true,
});

const Address = mongoose.model('Address', addressSchema);
export default Address;