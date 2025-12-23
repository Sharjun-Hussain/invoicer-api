import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Frontend ID
    userEmail: { type: String, required: true, index: true }, // For multi-tenancy
    invoiceNumber: { type: String },
    date: { type: String },
    dueDate: { type: String },
    billTo: {
        name: String,
        address: String,
        phone: String,
    },
    shipTo: {
        name: String,
        address: String,
        phone: String,
    },
    yourCompany: {
        name: String,
        address: String,
        phone: String,
    },
    items: [{
        name: String,
        description: String,
        quantity: Number,
        amount: Number,
        total: Number,
    }],
    taxPercentage: { type: Number, default: 0 },
    taxAmount: { type: String },
    subTotal: { type: String },
    grandTotal: { type: String },
    notes: { type: String },
    templateNumber: { type: Number, default: 1 },
    status: { type: String, default: 'Pending', enum: ['Paid', 'Pending', 'Overdue'] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
