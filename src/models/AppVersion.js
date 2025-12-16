import mongoose from 'mongoose';

const AppVersionSchema = new mongoose.Schema({
  version: { type: String, required: true }, // "1.2.0"
  platform: { type: String, default: 'all' }, 
  forceUpdate: { type: Boolean, default: false },
  changelog: { type: String },
  
  // PRIMARY LINK (e.g., Google Play / App Store)
  downloadUrl: { type: String, required: true },
  
  // BACKUP LINK (e.g., S3, GitHub, Direct Website Link)
  backupDownloadUrl: { type: String, default: null }, 
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.AppVersion || mongoose.model('AppVersion', AppVersionSchema);