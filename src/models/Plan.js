import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, 
  name: String,
  price: Number,
  currency: { type: String, default: 'LKR' },
  
  // Technical Limits
  limits: {
    invoices: { type: Number, default: 50 }, // -1 = Unlimited
    teamMembers: Number,
    exportPDF: Boolean,
    customTemplates: Boolean,
    // Add other feature flags here
  },

  // For UI Display
  marketingFeatures: [String] 
});

export default mongoose.models.Plan || mongoose.model('Plan', PlanSchema);