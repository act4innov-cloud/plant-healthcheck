import sgMail from '../config/email.js';

class EmailService {
  async sendWelcome(email, displayName) {
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDER_EMAIL,
        subject: 'Welcome to Plant HealthCheck',
        html: 'Welcome ' + displayName
      });
    } catch (error) {
      console.error('Email error:', error);
    }
  }
}

export default new EmailService();
