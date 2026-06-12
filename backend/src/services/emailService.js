// backend/src/services/emailService.js
import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const EMAIL_FROM = process.env.EMAIL_FROM || 'Skusku <noreply@skusku.life>';

// Format monétaire FR unique pour tous les emails : « 1 136 € », jamais « €1,136 »
const fmtEUR = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} €`;

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
    console.log('📧 From Address:', EMAIL_FROM);

    // Le prénom de l'invitant en premier mot : c'est lui l'argument de
    // conversion, pas le produit (Annexe A #9 audit V3).
    const emailPayload = {
      from: EMAIL_FROM,
      to: [to],
      subject: `${inviterName} vous invite : ${tripName} ✈️`,
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
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation à un voyage</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #3d3528;
          background-color: #f7f4ef;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(61, 53, 40, 0.08);
        }
        .header {
          background: #2e2a23;
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: bold;
        }
        .content {
          padding: 40px 30px;
        }
        .trip-name {
          font-size: 24px;
          font-weight: bold;
          color: #b85c38;
          margin: 20px 0;
          text-align: center;
        }
        .message-box {
          background: #faf6f0;
          border-left: 4px solid #b85c38;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .cta-button {
          display: inline-block;
          background: #b85c38;
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
          background: #faf8f4;
          padding: 30px;
          text-align: center;
          color: #8a7d68;
          font-size: 14px;
          border-top: 1px solid #ebe4d8;
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
          background: #f6e7df;
          color: #b85c38;
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
          color: #2e2a23;
          margin-bottom: 4px;
        }
        .feature-description {
          color: #8a7d68;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✈️ ${inviterName} vous invite</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.85;">Un voyage se prépare — il ne manque que vous</p>
        </div>

        <div class="content">
          <p>Bonjour,</p>
          <p><strong>${inviterName}</strong> vous invite à organiser un voyage ensemble :</p>

          <div class="trip-name">${tripName}</div>

          ${message ? `
            <div class="message-box">
              <strong>Message personnel :</strong><br>
              ${message}
            </div>
          ` : ''}

          <div class="features">
            <div class="feature">
              <div class="feature-icon">🤝</div>
              <div class="feature-text">
                <div class="feature-title">Planifiez ensemble</div>
                <div class="feature-description">Organisez le voyage avec vos amis, en temps réel</div>
              </div>
            </div>

            <div class="feature">
              <div class="feature-icon">🗳️</div>
              <div class="feature-text">
                <div class="feature-title">Votez pour la destination</div>
                <div class="feature-description">Chacun donne son avis, le groupe décide</div>
              </div>
            </div>

            <div class="feature">
              <div class="feature-icon">🤖</div>
              <div class="feature-text">
                <div class="feature-title">Suggestions par IA</div>
                <div class="feature-description">Des propositions adaptées aux envies du groupe</div>
              </div>
            </div>
          </div>

          <div class="button-container">
            <a href="${acceptUrl}" class="cta-button">
              Rejoindre le voyage
            </a>
          </div>

          <p style="text-align: center; color: #8a7d68; font-size: 14px; margin-top: 30px;">
            Ou copiez ce lien dans votre navigateur :<br>
            <a href="${acceptUrl}" style="color: #b85c38; word-break: break-all;">${acceptUrl}</a>
          </p>
        </div>

        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            Envoyé via <strong>Skusku</strong> — skusku.life
          </p>
          <p style="margin: 0; font-size: 12px;">
            Cette invitation expire dans 7 jours
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
      from: EMAIL_FROM,
      to: [to],
      subject: `Du nouveau sur « ${tripName} »`,
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
              <h2>Du nouveau sur ${tripName}</h2>
            </div>
            <div class="content">
              <h3>${updateType}</h3>
              <p>${updateMessage}</p>
              <div style="text-align: center;">
                <a href="${tripUrl}" class="button">Voir le voyage</a>
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

/**
 * Send booking reminder email to group members who haven't booked yet
 */
export async function sendBookingReminder({
  to,
  memberName,
  tripName,
  destination,
  startDate,
  endDate,
  senderName,
  tripUrl,
  missingBookings = [] // ['flight', 'hotel']
}) {
  console.log('\n📧 ========== EMAIL SERVICE: BOOKING REMINDER ==========');
  console.log('📧 Recipient:', to);
  console.log('📧 Member:', memberName);
  console.log('📧 Trip:', tripName);
  console.log('📧 Missing:', missingBookings.join(', '));

  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not set, email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    const missingText = missingBookings.map(b => {
      if (b === 'flight') return '✈️ Vol';
      if (b === 'hotel') return '🏨 Hébergement';
      return b;
    }).join(' et ');

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `⏰ Rappel : votre ${missingText} pour ${destination}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1f2937;
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
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
            }
            .trip-card {
              background: #f9fafb;
              border-radius: 12px;
              padding: 20px;
              margin: 20px 0;
              border: 1px solid #e5e7eb;
            }
            .trip-name {
              font-size: 20px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 10px;
            }
            .trip-details {
              color: #6b7280;
              font-size: 14px;
            }
            .missing-box {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px 20px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
            }
            .cta-button {
              display: inline-block;
              background: #3b82f6;
              color: white !important;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 12px;
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .footer {
              background: #f9fafb;
              padding: 20px 30px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Petit rappel</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Il est temps de finaliser votre réservation</p>
            </div>

            <div class="content">
              <p>Bonjour ${memberName},</p>
              <p><strong>${senderName}</strong> vous rappelle gentiment qu'il reste une réservation à faire pour votre voyage :</p>

              <div class="trip-card">
                <div class="trip-name">🌍 ${destination}</div>
                <div class="trip-details">
                  📅 Du ${formatDate(startDate)} au ${formatDate(endDate)}
                </div>
              </div>

              <div class="missing-box">
                <strong>Il vous reste à réserver :</strong><br>
                ${missingText}
              </div>

              <p>Le groupe compte sur vous pour que tout soit prêt à temps 🙌</p>

              <div class="button-container">
                <a href="${tripUrl}" class="cta-button">
                  Voir le voyage et réserver
                </a>
              </div>
            </div>

            <div class="footer">
              <p>Envoyé via <strong>Skusku</strong> — skusku.life</p>
              <p style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
                Vous recevez cet email car vous faites partie du voyage « ${tripName} »
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Reminder email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception in sendBookingReminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send voting complete notification email
 */
export async function sendVotingCompleteNotification({
  to,
  memberName,
  tripName,
  winningDestination,
  startDate,
  endDate,
  tripUrl
}) {
  console.log('\n📧 ========== EMAIL SERVICE: VOTING COMPLETE ==========');
  console.log('📧 Recipient:', to);
  console.log('📧 Destination:', winningDestination);

  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not set, email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `🎉 C'est décidé : direction ${winningDestination} !`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1f2937;
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
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
            }
            .destination-card {
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
              color: white;
              border-radius: 16px;
              padding: 30px;
              margin: 20px 0;
              text-align: center;
            }
            .destination-name {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .dates {
              opacity: 0.9;
              font-size: 16px;
            }
            .next-steps {
              background: #f0fdf4;
              border-radius: 12px;
              padding: 20px;
              margin: 20px 0;
            }
            .step {
              display: flex;
              align-items: center;
              margin: 10px 0;
            }
            .step-icon {
              width: 30px;
              height: 30px;
              background: #10b981;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 15px;
              font-weight: bold;
            }
            .cta-button {
              display: inline-block;
              background: #10b981;
              color: white !important;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 12px;
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .footer {
              background: #f9fafb;
              padding: 20px 30px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Le vote est terminé !</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">La destination de ${tripName} est choisie</p>
            </div>

            <div class="content">
              <p>Bonjour ${memberName},</p>
              <p>Le groupe a voté, et la destination gagnante est…</p>

              <div class="destination-card">
                <div class="destination-name">🌍 ${winningDestination}</div>
                <div class="dates">📅 ${formatDate(startDate)} → ${formatDate(endDate)}</div>
              </div>

              <div class="next-steps">
                <h3 style="margin-top: 0;">Prochaines étapes :</h3>
                <div class="step">
                  <div class="step-icon">1</div>
                  <div>Réservez votre vol ✈️</div>
                </div>
                <div class="step">
                  <div class="step-icon">2</div>
                  <div>Réservez votre hébergement 🏨</div>
                </div>
                <div class="step">
                  <div class="step-icon">3</div>
                  <div>Préparez vos affaires 🎒</div>
                </div>
              </div>

              <div class="button-container">
                <a href="${tripUrl}" class="cta-button">
                  Voir le voyage et réserver
                </a>
              </div>
            </div>

            <div class="footer">
              <p>Bon voyage avec <strong>Skusku</strong> ✈️</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Voting complete email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception in sendVotingCompleteNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send price drop alert email
 */
export async function sendPriceDropEmail({
  to,
  userName,
  destination,
  country,
  origin,
  departureDate,
  returnDate,
  originalPrice,
  currentPrice,
  targetPrice,
  priceDrop,
  percentDrop,
  alertId
}) {
  console.log('\n📧 ========== EMAIL SERVICE: PRICE DROP ALERT ==========');
  console.log('📧 Recipient:', to);
  console.log('📧 Destination:', destination);
  console.log('📧 Price drop:', `€${priceDrop} (-${percentDrop}%)`);

  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not set, email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    const frontendUrl = process.env.FRONTEND_URL || 'https://skusku.life';
    const bookingUrl = `${frontendUrl}/price-alerts?highlight=${alertId}`;

    // Annexe A #10 audit V3 : la destination d'abord, le vrai format FR,
    // et la preuve que l'alerte a servi — pas un simple constat.
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `${destination} vient de baisser : ${fmtEUR(currentPrice)} (−${percentDrop} %) — votre alerte a fonctionné`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1f2937;
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
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
            }
            .price-card {
              background: #f0fdf4;
              border: 2px solid #10b981;
              border-radius: 16px;
              padding: 24px;
              margin: 20px 0;
              text-align: center;
            }
            .destination-name {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .route {
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 16px;
            }
            .price-container {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 20px;
              margin: 20px 0;
            }
            .old-price {
              font-size: 20px;
              color: #9ca3af;
              text-decoration: line-through;
            }
            .new-price {
              font-size: 36px;
              font-weight: bold;
              color: #10b981;
            }
            .savings-badge {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 16px;
            }
            .dates {
              color: #6b7280;
              font-size: 14px;
              margin-top: 16px;
            }
            .cta-button {
              display: inline-block;
              background: #3b82f6;
              color: white !important;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 12px;
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .tip-box {
              background: #fffbeb;
              border-left: 4px solid #f59e0b;
              padding: 15px 20px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
              font-size: 14px;
            }
            .footer {
              background: #f9fafb;
              padding: 20px 30px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Votre alerte a fonctionné</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Le prix de votre vol a baissé</p>
            </div>

            <div class="content">
              <p>Bonjour ${userName},</p>
              <p>Bonne nouvelle : le prix du vol que vous surveillez vient de baisser.</p>

              <div class="price-card">
                <div class="destination-name">✈️ ${destination}${country ? `, ${country}` : ''}</div>
                <div class="route">${origin} → ${destination}</div>

                <div class="price-container">
                  <span class="old-price">${fmtEUR(originalPrice)}</span>
                  <span class="new-price">${fmtEUR(currentPrice)}</span>
                </div>

                <div class="savings-badge">
                  −${percentDrop} % · vous économisez ${fmtEUR(priceDrop)}
                </div>

                <div class="dates">
                  📅 ${formatDate(departureDate)} → ${formatDate(returnDate)}
                </div>
              </div>

              <div class="tip-box">
                💡 <strong>À savoir :</strong> les prix last-minute remontent vite. Si ce tarif vous convient, c'est le bon moment pour réserver.
              </div>

              <div class="button-container">
                <a href="${bookingUrl}" class="cta-button">
                  Voir le prix
                </a>
              </div>

              <p style="text-align: center; color: #6b7280; font-size: 12px;">
                Prix initial : ${fmtEUR(originalPrice)} · Prix cible : ${fmtEUR(targetPrice)}
              </p>
            </div>

            <div class="footer">
              <p>Vous recevez cet email car vous avez créé une alerte de prix sur <strong>Skusku</strong></p>
              <p style="margin-top: 10px;">
                <a href="${frontendUrl}/price-alerts" style="color: #b85c38;">Gérer mes alertes</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Price drop email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception in sendPriceDropEmail:', error);
    return { success: false, error: error.message };
  }
}

export default {
  sendTripInvitation,
  sendTripUpdateNotification,
  sendBookingReminder,
  sendVotingCompleteNotification,
  sendPriceDropEmail,
};
