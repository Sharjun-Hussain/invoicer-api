import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Frontend ID
    userEmail: { type: String, required: true, index: true }, // For multi-tenancy
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Item || mongoose.model('Item', ItemSchema);
