// backend/src/services/emailService.js
import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send trip invitation email
 */
export async function sendTripInvitation({
  to,
  tripName,
  inviterName,
  acceptUrl,
  message
}) {
  console.log('\n📧 ========== EMAIL SERVICE: SEND INVITATION ==========');
  console.log('📧 Timestamp:', new Date().toISOString());
  console.log('📧 Recipient:', to);
  console.log('📧 Trip Name:', tripName);
  console.log('📧 Inviter Name:', inviterName);
  console.log('📧 Accept URL:', acceptUrl);
  console.log('📧 Has Custom Message:', !!message);

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not set in environment');
      console.error('❌ Email will NOT be sent');
      console.log('📧 =================================================\n');
      return { success: false, error: 'Email service not configured' };
    }

    console.log('✅ RESEND_API_KEY is configured');
    console.log('📧 From Address:', process.env.EMAIL_FROM || 'Travel AI <noreply@yourdomain.com>');

    const emailPayload = {
      from: process.env.EMAIL_FROM || 'Travel AI <noreply@yourdomain.com>',
      to: [to],
      subject: `🌍 You're invited to join "${tripName}"!`,
      html: generateInvitationEmail({
        tripName,
        inviterName,
        acceptUrl,
        message
      }),
    };

    console.log('📧 Email Payload:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailPayload.html.length
    });

    console.log('📧 Calling Resend API...');
    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('❌ Resend API returned an error:');
      console.error('❌ Error Object:', JSON.stringify(error, null, 2));
      console.error('❌ Error Message:', error.message);
      console.error('❌ Error Name:', error.name);
      console.log('📧 =================================================\n');
      return { success: false, error: error.message };
    }

    console.log('✅ Resend API call successful!');
    console.log('✅ Response Data:', JSON.stringify(data, null, 2));
    console.log(`✅ Invitation email sent to ${to}`);
    console.log('✅ Email ID:', data?.id);
    console.log('📧 =================================================\n');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception caught in sendTripInvitation:');
    console.error('❌ Error Type:', error.constructor.name);
    console.error('❌ Error Message:', error.message);
    console.error('❌ Error Stack:', error.stack);
    console.log('📧 =================================================\n');
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML email template for trip invitation
 */
function generateInvitationEmail({ tripName, inviterName, acceptUrl, message }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Trip Invitation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f7fa;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .content {
          padding: 40px 30px;
        }
        .trip-name {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
          margin: 20px 0;
          text-align: center;
        }
        .message-box {
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .cta-button {
          display: inline-block;
          background: #3b82f6;
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: bold;
          font-size: 16px;
          margin: 20px 0;
          text-align: center;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .footer {
          background: #f9fafb;
          padding: 30px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
        .features {
          margin: 30px 0;
        }
        .feature {
          display: flex;
          align-items: start;
          margin: 15px 0;
        }
        .feature-icon {
          background: #dbeafe;
          color: #3b82f6;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .feature-text {
          flex: 1;
        }
        .feature-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }
        .feature-description {
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✈️ You're Invited!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Join us for an amazing trip</p>
        </div>

        <div class="content">
          <p>Hey there! 👋</p>
          <p><strong>${inviterName}</strong> has invited you to join a collaborative trip planning adventure:</p>

          <div class="trip-name">${tripName}</div>

          ${message ? `
            <div class="message-box">
              <strong>Personal message:</strong><br>
              ${message}
            </div>
          ` : ''}

          <div class="features">
            <div class="feature">
              <div class="feature-icon">🤝</div>
              <div class="feature-text">
                <div class="feature-title">Collaborate Together</div>
                <div class="feature-description">Plan your trip with friends in real-time</div>
              </div>
            </div>

            <div class="feature">
              <div class="feature-icon">🗳️</div>
              <div class="feature-text">
                <div class="feature-title">Vote on Destinations</div>
                <div class="feature-description">Everyone gets a say in where to go</div>
              </div>
            </div>

            <div class="feature">
              <div class="feature-icon">🤖</div>
              <div class="feature-text">
                <div class="feature-title">AI-Powered Suggestions</div>
                <div class="feature-description">Get personalized recommendations based on group preferences</div>
              </div>
            </div>
          </div>

          <div class="button-container">
            <a href="${acceptUrl}" class="cta-button">
              Accept Invitation & Join Trip
            </a>
          </div>

          <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
            Or copy and paste this link into your browser:<br>
            <a href="${acceptUrl}" style="color: #3b82f6; word-break: break-all;">${acceptUrl}</a>
          </p>
        </div>

        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            Powered by <strong>Travel AI</strong> × Claude AI × Amadeus
          </p>
          <p style="margin: 0; font-size: 12px;">
            This invitation will expire in 7 days
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send trip update notification
 */
export async function sendTripUpdateNotification({
  to,
  tripName,
  updateType,
  updateMessage,
  tripUrl
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not set, email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Travel AI <noreply@yourdomain.com>',
      to: [to],
      subject: `🔔 Update for "${tripName}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Trip Update: ${tripName}</h2>
            </div>
            <div class="content">
              <h3>${updateType}</h3>
              <p>${updateMessage}</p>
              <div style="text-align: center;">
                <a href="${tripUrl}" class="button">View Trip Details</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Notification email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

export default {
  sendTripInvitation,
  sendTripUpdateNotification,
};
