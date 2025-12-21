import mongoose, { Schema, model, models } from 'mongoose';

const PlanSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  price: Number,
  currency: { type: String, default: 'LKR' },

  // Technical Limits
  limits: {
    invoices: { type: Number, default: 50 }, // -1 = Unlimited
    clients: { type: Number, default: 20 },
    items: { type: Number, default: 50 },
    teamMembers: Number,
    exportPDF: Boolean,
    customTemplates: Boolean,
    // Add other feature flags here
  },

  // For UI Display
  marketingFeatures: [String]
});

// Prevent overwriting the model if it already exists (Next.js hot reload fix)
const Plan = models.Plan || model('Plan', PlanSchema);

export default Plan;