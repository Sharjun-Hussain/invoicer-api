import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Frontend ID
    userEmail: { type: String, required: true, index: true }, // For multi-tenancy
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Client || mongoose.model('Client', ClientSchema);
