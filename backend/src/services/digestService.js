// backend/src/services/digestService.js
// Weekly personalized travel digest — sent every Monday morning
// Pulls opportunities + best upcoming period + top DNA match for each user

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import prisma from '../db/prisma.js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const FROM = process.env.EMAIL_FROM || 'Skusku <noreply@skusku.life>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://skusku.life';

/**
 * Send weekly digest to all active users
 * Called by cron every Monday at 8am
 */
export async function sendWeeklyDigestToAll() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Digest] RESEND_API_KEY not set, skipping');
    return { sent: 0, skipped: 0 };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = getSupabase();

  // Get all users who have completed onboarding (have preferences)
  const users = await prisma.user.findMany({
    where: {
      // `is` on a to-one relation implies non-null AND applies the scalar
      // filter. Mixing `isNot: null` with a scalar field at the same level is
      // an invalid Prisma filter and throws on every cron run.
      preferences: {
        is: { digestOptOut: false },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      clerkId: true,
      preferences: {
        select: {
          topActivities: true,
          idealDuration: true,
          avgBudget: true,
        },
      },
    },
  });

  console.log(`[Digest] Sending to ${users.length} users...`);

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      const digestData = await buildDigestForUser(supabase, user);
      if (!digestData) {
        skipped++;
        continue;
      }

      await resend.emails.send({
        from: FROM,
        to: [user.email],
        subject: digestData.subject,
        html: renderDigestEmail(digestData, user),
      });

      sent++;
      console.log(`[Digest] Sent to ${user.email}`);

      // Small delay to respect Resend rate limits
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`[Digest] Failed for ${user.email}:`, err.message);
      skipped++;
    }
  }

  console.log(`[Digest] Done. Sent: ${sent}, Skipped: ${skipped}`);
  return { sent, skipped };
}

async function buildDigestForUser(supabase, user) {
  // 1. Get active opportunities for this user
  const { data: opportunities } = await supabase
    .from('travel_opportunities')
    .select(`
      flight_price_eur, departure_date, return_date, match_score, match_reasons,
      destinations (city, country, avg_flight_price_eur)
    `)
    .eq('user_id', user.clerkId)
    .in('status', ['pending', 'sent'])
    .gte('expires_at', new Date().toISOString())
    .order('match_score', { ascending: false })
    .limit(2);

  // 2. Get top DNA match destination (for "discover this week")
  const { data: profile } = await supabase
    .from('user_travel_profiles')
    .select('embedding')
    .eq('user_id', user.clerkId)
    .single();

  let topMatch = null;
  if (profile?.embedding) {
    const { data: matches } = await supabase.rpc('match_destinations', {
      query_embedding: profile.embedding,
      match_count: 1,
      filter_region: null,
      filter_trip_type: null,
      min_safety: 7,
    });
    topMatch = matches?.[0] || null;
  }

  // Skip digest if we have nothing interesting to say
  if (!opportunities?.length && !topMatch) return null;

  // Build subject line
  const topDeal = opportunities?.[0];
  const subject = topDeal
    ? `✈️ Deal détecté : ${topDeal.destinations?.city} à ${topDeal.flight_price_eur}€`
    : `🌍 Votre destination de la semaine : ${topMatch?.city}`;

  return { subject, opportunities: opportunities || [], topMatch };
}

function renderDigestEmail({ opportunities, topMatch }, user) {
  const firstName = user.name?.split(' ')[0] || 'là';
  const dashboardUrl = `${FRONTEND_URL}/dashboard`;
  const createTripUrl = `${FRONTEND_URL}/create-trip`;

  const dealsHtml = opportunities.length > 0 ? `
    <div style="margin: 24px 0;">
      <h2 style="font-size:16px; font-weight:700; color:#111827; margin:0 0 12px 0;">
        🔥 Deals détectés pour vous
      </h2>
      ${opportunities.map(o => {
        const dest = o.destinations;
        const savings = dest?.avg_flight_price_eur
          ? Math.round((1 - o.flight_price_eur / dest.avg_flight_price_eur) * 100)
          : null;
        const dep = new Date(o.departure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const ret = new Date(o.return_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        return `
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:16px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:700; color:#111827; font-size:15px;">✈️ ${dest?.city}, ${dest?.country}</div>
                <div style="font-size:13px; color:#6b7280; margin-top:2px;">📅 ${dep} – ${ret}</div>
                ${o.match_reasons?.[0] ? `<div style="font-size:12px; color:#059669; margin-top:4px;">${o.match_reasons[0]}</div>` : ''}
              </div>
              <div style="text-align:right; flex-shrink:0; margin-left:16px;">
                <div style="font-size:22px; font-weight:800; color:#059669;">${o.flight_price_eur}€</div>
                ${savings ? `<div style="font-size:11px; color:#059669;">-${savings}% vs normal</div>` : ''}
              </div>
            </div>
          </div>`;
      }).join('')}
      <div style="text-align:center; margin-top:16px;">
        <a href="${dashboardUrl}" style="display:inline-block; background:#111827; color:white; text-decoration:none; padding:12px 28px; border-radius:10px; font-weight:600; font-size:14px;">
          Voir les deals →
        </a>
      </div>
    </div>
  ` : '';

  const matchHtml = topMatch ? `
    <div style="margin: 24px 0; background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:20px;">
      <div style="font-size:12px; font-weight:600; color:#3b82f6; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">
        Destination de la semaine
      </div>
      <div style="font-size:20px; font-weight:800; color:#111827;">
        ${topMatch.city}, ${topMatch.country}
      </div>
      ${topMatch.vibe_tags?.length ? `
        <div style="margin-top:8px;">
          ${topMatch.vibe_tags.slice(0, 3).map(t =>
            `<span style="display:inline-block; background:white; border:1px solid #bfdbfe; color:#3b82f6; font-size:11px; font-weight:500; padding:2px 8px; border-radius:20px; margin-right:4px;">#${t}</span>`
          ).join('')}
        </div>` : ''}
      <div style="margin-top:6px; font-size:13px; color:#6b7280;">
        Vol depuis Paris : ~${topMatch.avg_flight_price_eur}€ A/R · Hôtel : ~${topMatch.avg_hotel_price_eur}€/nuit
      </div>
      <div style="margin-top:14px;">
        <a href="${createTripUrl}" style="display:inline-block; background:#3b82f6; color:white; text-decoration:none; padding:10px 20px; border-radius:8px; font-weight:600; font-size:13px;">
          Planifier ce voyage →
        </a>
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f9fafb; margin:0; padding:0;">
  <div style="max-width:560px; margin:32px auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#111827; padding:28px 32px; display:flex; align-items:center; gap:12px;">
      <div style="width:32px; height:32px; background:#10b981; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px;">✈</div>
      <span style="color:white; font-size:18px; font-weight:700;">Skusku</span>
      <span style="color:#6b7280; font-size:13px; margin-left:auto;">Digest hebdo</span>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="font-size:15px; color:#374151; margin:0 0 4px 0;">Salut ${firstName} 👋</p>
      <p style="font-size:13px; color:#6b7280; margin:0 0 24px 0;">
        Voici vos opportunités voyage personnalisées de la semaine.
      </p>

      ${dealsHtml}
      ${matchHtml}

      <div style="text-align:center; margin-top:24px; padding-top:24px; border-top:1px solid #f3f4f6;">
        <a href="${dashboardUrl}" style="color:#3b82f6; font-size:13px; text-decoration:none;">
          Ouvrir le dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb; padding:16px 32px; border-top:1px solid #f3f4f6; text-align:center;">
      <p style="font-size:11px; color:#9ca3af; margin:0;">
        Vous recevez cet email car vous utilisez Skusku ·
        <a href="${FRONTEND_URL}/account" style="color:#9ca3af;">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
