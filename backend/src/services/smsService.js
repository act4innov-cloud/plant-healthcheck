import twilio from '../config/sms.js';

class SMSService {
  async sendApprovalSMS(phone, checklistTitle) {
    try {
      await twilio.messages.create({
        body: `New approval request for: ${checklistTitle}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
    } catch (error) {
      console.error('SMS error:', error);
      throw error;
    }
  }

  async sendPasswordReset(phone, resetLink) {
    try {
      await twilio.messages.create({
        body: `Password reset link: ${resetLink}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
    } catch (error) {
      console.error('SMS error:', error);
      throw error;
    }
  }
}

export default new SMSService();
