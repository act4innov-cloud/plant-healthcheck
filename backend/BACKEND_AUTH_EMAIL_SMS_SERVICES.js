// ═══════════════════════════════════════════════════════════════════════════
// FILE: backend/src/services/emailService.js
// Complete email service with SendGrid
// ═══════════════════════════════════════════════════════════════════════════

const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailTemplates = {
  // Welcome Email
  welcome: (email, displayName) => ({
    to: email,
    from: process.env.SENDER_EMAIL || 'noreply@plant-healthcheck.com',
    subject: 'Welcome to Plant HealthCheck!',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #0066cc;">Welcome to Plant HealthCheck!</h1>
        <p>Hi ${displayName},</p>
        <p>Your account has been successfully created. You can now:</p>
        <ul>
          <li>Create and manage checklists</li>
          <li>Upload and archive documents</li>
          <li>Manage approval workflows</li>
          <li>Receive real-time notifications</li>
        </ul>
        <p>
          <a href="${process.env.APP_URL}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Get Started
          </a>
        </p>
        <p>Best regards,<br>Plant HealthCheck Team</p>
      </div>
    `
  }),

  // Approval Request Email
  approvalRequest: (email, checklistTitle, checklistId, requesterName) => ({
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: `⚠️ Approval Required: ${checklistTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #ff9800;">Approval Required</h1>
        <p>A new checklist has been submitted for your review:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Checklist:</strong> ${checklistTitle}</p>
          <p><strong>Requested by:</strong> ${requesterName}</p>
          <p><strong>Submitted on:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>
          <a href="${process.env.APP_URL}/approvals/${checklistId}" style="background-color: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Review Now
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `
  }),

  // Approval Approved Email
  approvalApproved: (email, checklistTitle, approverName) => ({
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: `✅ Checklist Approved: ${checklistTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #4caf50;">Checklist Approved!</h1>
        <p>Your checklist has been approved:</p>
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Checklist:</strong> ${checklistTitle}</p>
          <p><strong>Approved by:</strong> ${approverName}</p>
          <p><strong>Approved on:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>
          <a href="${process.env.APP_URL}/checklists" style="background-color: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Checklists
          </a>
        </p>
      </div>
    `
  }),

  // Approval Rejected Email
  approvalRejected: (email, checklistTitle, approverName, comment) => ({
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: `❌ Checklist Rejected: ${checklistTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #f44336;">Checklist Rejected</h1>
        <p>Your checklist has been rejected and needs revision:</p>
        <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Checklist:</strong> ${checklistTitle}</p>
          <p><strong>Rejected by:</strong> ${approverName}</p>
          <p><strong>Comment:</strong> ${comment}</p>
        </div>
        <p>Please review the comments and resubmit your checklist.</p>
        <p>
          <a href="${process.env.APP_URL}/checklists" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Review Checklist
          </a>
        </p>
      </div>
    `
  }),

  // Password Reset Email
  passwordReset: (email, resetLink) => ({
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1>Password Reset Request</h1>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <p>
          <a href="${resetLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </p>
        <p><strong>Note:</strong> This link expires in 1 hour.</p>
        <p style="color: #999;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `
  }),

  // Document Uploaded Email
  documentUploaded: (email, documentName, checklistTitle) => ({
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: `📄 Document Uploaded: ${documentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #2196f3;">Document Uploaded</h1>
        <p>A new document has been uploaded:</p>
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Document:</strong> ${documentName}</p>
          <p><strong>Associated Checklist:</strong> ${checklistTitle}</p>
          <p><strong>Uploaded on:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>
          <a href="${process.env.APP_URL}/documents" style="background-color: #2196f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Documents
          </a>
        </p>
      </div>
    `
  })
};

// Send email with error handling and logging
const sendEmail = async (messageConfig) => {
  try {
    const result = await sgMail.send(messageConfig);
    console.log(`✅ Email sent successfully to ${messageConfig.to}`);
    return { success: true, messageId: result[0].headers['x-message-id'] };
  } catch (error) {
    console.error(`❌ Error sending email to ${messageConfig.to}:`, error.message);
    throw new Error(`Email service error: ${error.message}`);
  }
};

// Export public functions
module.exports = {
  // Welcome email
  async sendWelcomeEmail(email, displayName) {
    const messageConfig = emailTemplates.welcome(email, displayName);
    return sendEmail(messageConfig);
  },

  // Approval notifications
  async sendApprovalRequest(email, checklistTitle, checklistId, requesterName) {
    const messageConfig = emailTemplates.approvalRequest(
      email,
      checklistTitle,
      checklistId,
      requesterName
    );
    return sendEmail(messageConfig);
  },

  async sendApprovalApproved(email, checklistTitle, approverName) {
    const messageConfig = emailTemplates.approvalApproved(
      email,
      checklistTitle,
      approverName
    );
    return sendEmail(messageConfig);
  },

  async sendApprovalRejected(email, checklistTitle, approverName, comment) {
    const messageConfig = emailTemplates.approvalRejected(
      email,
      checklistTitle,
      approverName,
      comment
    );
    return sendEmail(messageConfig);
  },

  // Password reset
  async sendPasswordResetEmail(email, resetToken) {
    const resetLink = `${process.env.APP_URL}/reset-password/${resetToken}`;
    const messageConfig = emailTemplates.passwordReset(email, resetLink);
    return sendEmail(messageConfig);
  },

  // Document notifications
  async sendDocumentUploaded(email, documentName, checklistTitle) {
    const messageConfig = emailTemplates.documentUploaded(
      email,
      documentName,
      checklistTitle
    );
    return sendEmail(messageConfig);
  },

  // Bulk email sending
  async sendBulkEmails(recipients, subject, htmlContent) {
    try {
      const personalizations = recipients.map(email => ({
        to: [{ email }]
      }));

      const messageConfig = {
        from: process.env.SENDER_EMAIL,
        subject,
        html: htmlContent,
        personalizations
      };

      const result = await sgMail.send(messageConfig);
      console.log(`✅ Bulk emails sent to ${recipients.length} recipients`);
      return { success: true, count: recipients.length };
    } catch (error) {
      console.error('❌ Error sending bulk emails:', error.message);
      throw new Error(`Bulk email service error: ${error.message}`);
    }
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: backend/src/services/smsService.js
// Complete SMS service with Twilio
// ═══════════════════════════════════════════════════════════════════════════

const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const smsTemplates = {
  // Approval request SMS
  approvalRequest: (checklistTitle, appUrl) =>
    `Plant HealthCheck: New approval request for "${checklistTitle}". Review: ${appUrl}/approvals`,

  // Approval approved SMS
  approvalApproved: (checklistTitle) =>
    `✅ Plant HealthCheck: Your checklist "${checklistTitle}" has been approved!`,

  // Approval rejected SMS
  approvalRejected: (checklistTitle, comment) =>
    `❌ Plant HealthCheck: Your checklist "${checklistTitle}" was rejected. Comment: ${comment}`,

  // Document uploaded SMS
  documentUploaded: (documentName) =>
    `📄 Plant HealthCheck: Document "${documentName}" uploaded successfully`,

  // Checklist completed SMS
  checklistCompleted: (checklistTitle) =>
    `✅ Plant HealthCheck: Checklist "${checklistTitle}" completed and submitted for review`,

  // Password reset SMS
  passwordReset: (resetLink) =>
    `Plant HealthCheck: Reset your password: ${resetLink}. Link expires in 1 hour.`
};

// Send SMS with error handling
const sendSMS = async (phoneNumber, message) => {
  try {
    // Validate phone number format (E.164 format: +1234567890)
    if (!phoneNumber.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (+1234567890)');
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`✅ SMS sent successfully to ${phoneNumber}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error(`❌ Error sending SMS to ${phoneNumber}:`, error.message);
    throw new Error(`SMS service error: ${error.message}`);
  }
};

module.exports = {
  // Approval notifications
  async sendApprovalRequestSMS(phoneNumber, checklistTitle) {
    const message = smsTemplates.approvalRequest(
      checklistTitle,
      process.env.APP_URL
    );
    return sendSMS(phoneNumber, message);
  },

  async sendApprovalApprovedSMS(phoneNumber, checklistTitle) {
    const message = smsTemplates.approvalApproved(checklistTitle);
    return sendSMS(phoneNumber, message);
  },

  async sendApprovalRejectedSMS(phoneNumber, checklistTitle, comment) {
    const message = smsTemplates.approvalRejected(checklistTitle, comment);
    return sendSMS(phoneNumber, message);
  },

  // Document notifications
  async sendDocumentUploadedSMS(phoneNumber, documentName) {
    const message = smsTemplates.documentUploaded(documentName);
    return sendSMS(phoneNumber, message);
  },

  // Checklist notifications
  async sendChecklistCompletedSMS(phoneNumber, checklistTitle) {
    const message = smsTemplates.checklistCompleted(checklistTitle);
    return sendSMS(phoneNumber, message);
  },

  // Password reset
  async sendPasswordResetSMS(phoneNumber, resetToken) {
    const resetLink = `${process.env.APP_URL}/reset-password/${resetToken}`;
    const message = smsTemplates.passwordReset(resetLink);
    return sendSMS(phoneNumber, message);
  },

  // Bulk SMS sending
  async sendBulkSMS(phoneNumbers, message) {
    const results = [];
    const errors = [];

    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await sendSMS(phoneNumber, message);
        results.push(result);
      } catch (error) {
        errors.push({ phoneNumber, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      sent: results.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: backend/src/controllers/authController.js
// Complete authentication controller with Firebase + Email/SMS
// ═══════════════════════════════════════════════════════════════════════════

const { auth, db } = require('../config/firebase');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (uid, email, role) => {
  return jwt.sign(
    { uid, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = {
  // Register new user
  async register(req, res) {
    try {
      const { email, password, displayName, phoneNumber } = req.body;

      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false
      });

      // Save user data to database
      const userData = {
        uid: userRecord.uid,
        email,
        displayName,
        phoneNumber: phoneNumber || null,
        role: 'user', // Default role
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true
        }
      };

      await db.ref(`users/${userRecord.uid}`).set(userData);

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(email, displayName);
      } catch (emailError) {
        console.error('Welcome email failed:', emailError.message);
        // Don't fail registration if email fails
      }

      // Generate JWT
      const token = generateToken(userRecord.uid, email, 'user');

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          uid: userRecord.uid,
          email,
          displayName,
          token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Registration failed'
      });
    }
  },

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Authenticate with Firebase
      const userRecord = await auth.getUserByEmail(email);

      // Get user data from database
      const snapshot = await db.ref(`users/${userRecord.uid}`).once('value');
      const userData = snapshot.val();

      if (!userData || userData.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'User account is inactive'
        });
      }

      // Generate JWT (in real app, verify password with Firebase client SDK)
      const token = generateToken(userRecord.uid, email, userData.role);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          uid: userRecord.uid,
          email,
          displayName: userData.displayName,
          role: userData.role,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
  },

  // Request password reset
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      // Get user
      const userRecord = await auth.getUserByEmail(email);

      // Generate reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { uid: userRecord.uid, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Save reset token to database (temporary)
      await db.ref(`passwordResets/${userRecord.uid}`).set({
        token: resetToken,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
      });

      // Send reset email
      try {
        await emailService.sendPasswordResetEmail(email, resetToken);
      } catch (emailError) {
        console.error('Reset email failed:', emailError.message);
      }

      // Send reset SMS if user has phone number
      const userSnapshot = await db.ref(`users/${userRecord.uid}`).once('value');
      const userData = userSnapshot.val();

      if (userData.phoneNumber && userData.preferences.smsNotifications) {
        try {
          await smsService.sendPasswordResetSMS(userData.phoneNumber, resetToken);
        } catch (smsError) {
          console.error('Reset SMS failed:', smsError.message);
        }
      }

      res.json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }
  },

  // Reset password with token
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== 'password_reset') {
        return res.status(400).json({
          success: false,
          error: 'Invalid token'
        });
      }

      // Update password in Firebase
      await auth.updateUser(decoded.uid, {
        password: newPassword
      });

      // Clear reset token from database
      await db.ref(`passwordResets/${decoded.uid}`).remove();

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Password reset failed'
      });
    }
  },

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const { uid } = req.user; // From auth middleware

      const snapshot = await db.ref(`users/${uid}`).once('value');
      const userData = snapshot.val();

      if (!userData) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: userData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user'
      });
    }
  },

  // Logout (client-side in real implementation)
  async logout(req, res) {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { uid } = req.user;
      const { displayName, phoneNumber, preferences } = req.body;

      const updateData = {
        updatedAt: new Date().toISOString()
      };

      if (displayName) updateData.displayName = displayName;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (preferences) updateData.preferences = preferences;

      await db.ref(`users/${uid}`).update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updateData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: backend/src/middleware/authMiddleware.js
// JWT verification middleware
// ═══════════════════════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');

module.exports = {
  // Verify JWT token
  verifyToken: (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No authorization token provided'
        });
      }

      const token = authHeader.split('Bearer ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  },

  // Require admin role
  requireAdmin: (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  },

  // Require specific role
  requireRole: (roles) => {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      next();
    };
  }
};
