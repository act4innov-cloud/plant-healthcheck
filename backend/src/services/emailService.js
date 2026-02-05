import sgMail from '../config/email.js';

class EmailService {
  async sendWelcome(email, displayName) {
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDER_EMAIL,
        subject: 'Welcome to Plant HealthCheck',
        html: `
          <h1>Welcome ${displayName}!</h1>
          <p>Your account has been created successfully.</p>
          <a href="${process.env.APP_URL}">Go to App</a>
        `
      });
    } catch (error) {
      console.error('Email error:', error);
      throw error;
    }
  }

  async sendApprovalRequest(email, checklistTitle) {
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDER_EMAIL,
        subject: `Approval Request: ${checklistTitle}`,
        html: `
          <h2>New Approval Request</h2>
          <p>Checklist: <strong>${checklistTitle}</strong></p>
          <a href="${process.env.APP_URL}/approvals">Review</a>
        `
      });
    } catch (error) {
      console.error('Email error:', error);
      throw error;
    }
  }
}

export default new EmailService();
