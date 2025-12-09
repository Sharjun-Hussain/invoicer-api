import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'our_super_secret_random_string';

// 1. Function to Verify Token (Used in your API routes)
export const verifyJwt = (token) => {
  try {
    if (!token) return null;
    
    // Verify the token using the secret
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
    
  } catch (error) {
    // If token is invalid or expired, return null
    console.error("JWT Verification Error:", error.message);
    return null;
  }
};

// 2. Function to Sign Token (Used in your Login/Signup API)
export const signJwt = (payload) => {
  // Expires in 30 days (adjust as needed)
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};