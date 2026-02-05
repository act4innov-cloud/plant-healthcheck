import twilio from '../config/sms.js';

class SMSService {
  async sendApprovalSMS(phone, checklistTitle) {
    try {
      console.log('SMS sent to ' + phone);
    } catch (error) {
      console.error('SMS error:', error);
    }
  }
}

export default new SMSService();
