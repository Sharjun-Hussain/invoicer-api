import nodemailer from 'nodemailer';

// SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@inzeedo.com';
const FROM_NAME = 'Invoicer';

/**
 * Send password reset email with link (for web platform)
 */
export async function sendPasswordResetEmail(email, resetLink) {
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center;">
                  <a href="${resetLink}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all;">
                  ${resetLink}
                </p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul style="margin: 5px 0;">
                    <li>This link expires in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Your password won't change until you create a new one</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Invoicer. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('SMTP Error:', error);
    return { success: false, error };
  }
}

/**
 * Send password reset OTP (for mobile platform)
 */
export async function sendPasswordResetOTP(email, otp) {
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Your Password Reset Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
              .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset Code</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Here's your password reset verification code:</p>
                <div class="otp-box">
                  <div class="otp-code">${otp}</div>
                </div>
                <p style="text-align: center; color: #666;">Enter this code in your app to continue</p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul style="margin: 5px 0;">
                    <li>This code expires in <strong>10 minutes</strong></li>
                    <li>Don't share this code with anyone</li>
                    <li>If you didn't request this, please ignore this email</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Invoicer. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ Password reset OTP sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('SMTP Error:', error);
    return { success: false, error };
  }
}

/**
 * Send account verification OTP
 */
export async function sendAccountVerificationOTP(email, otp) {
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Verify Your Invoicer Account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
              .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>👋 Welcome to Invoicer!</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Thank you for signing up! To complete your registration and secure your account, please use the following verification code:</p>
                <div class="otp-box">
                  <div class="otp-code">${otp}</div>
                </div>
                <p style="text-align: center; color: #666;">Enter this code in the app to verify your email address.</p>
                <p>If you didn't create an account with us, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Invoicer. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ Account verification OTP sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('SMTP Error:', error);
    return { success: false, error };
  }
}

// Verify SMTP connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ SMTP connection failed:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});
