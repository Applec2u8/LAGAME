// Cloudflare Pages Function — POST /api/notify
// Sends an email to admin when a user starts a support conversation
// This runs silently in the background — users never know this happens

interface NotifyBody {
  userLabel: string
  firstMessage: string
  platform: string
  sessionId: string
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export async function onRequestPost(context: any) {
  try {
    const body: NotifyBody = await context.request.json()
    const { userLabel, firstMessage, platform, sessionId } = body

    // Read config from Cloudflare env / fallback to hardcoded Supabase
    const supabaseUrl = context.env?.VITE_SUPABASE_URL || 'https://srwttqkjygzraqqnqesl.supabase.co'
    const supabaseKey = context.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NLXFd5_OjpsSXzG7McF3Vg_Li9XKwKS'
    const resendKey = context.env?.RESEND_API_KEY

    // If no Resend key configured, skip silently
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no_resend_key' }), { headers: CORS })
    }

    // Fetch notify_email from notification_settings
    let notifyEmail = 'peun955@gmail.com'
    let notifyEnabled = true
    try {
      const settingsRes = await fetch(
        `${supabaseUrl}/rest/v1/notification_settings?select=notify_email,notify_enabled&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      )
      const settings = await settingsRes.json()
      if (Array.isArray(settings) && settings.length > 0) {
        notifyEmail = settings[0].notify_email || notifyEmail
        notifyEnabled = settings[0].notify_enabled ?? true
      }
    } catch (_) {}

    if (!notifyEnabled) {
      return new Response(JSON.stringify({ ok: true, skipped: 'notifications_disabled' }), { headers: CORS })
    }

    // Build admin link
    const adminLink = 'https://la-pack-game.pages.dev/ap-admin/support'

    // Send email via Resend
    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: 'Noto Sans Lao', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 24px;">
    <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); border-radius: 12px; padding: 3px; margin-bottom: 24px;">
      <div style="background: #12121f; border-radius: 10px; padding: 24px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 8px;">🔔</div>
        <h1 style="color: #fff; font-size: 20px; margin: 0; font-weight: 700;">มีผู้ใช้ส่งข้อความใหม่</h1>
        <p style="color: rgba(148,163,184,0.8); font-size: 13px; margin: 6px 0 0;">LAPACK Game Hub — Support Chat</p>
      </div>
    </div>
    
    <div style="background: rgba(30,30,50,0.8); border: 1px solid rgba(124,58,237,0.2); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: rgba(148,163,184,0.6); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 0; width: 120px;">ชื่อผู้ใช้</td>
          <td style="color: #e2e8f0; font-size: 14px; font-weight: 600; padding: 6px 0;">${escapeHtml(userLabel)}</td>
        </tr>
        <tr>
          <td style="color: rgba(148,163,184,0.6); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 0;">Platform</td>
          <td style="color: #e2e8f0; font-size: 14px; padding: 6px 0;">${getPlatformDisplay(platform)}</td>
        </tr>
      </table>
    </div>

    <div style="background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.25); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <p style="color: rgba(148,163,184,0.7); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;">ข้อความแรก</p>
      <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">"${escapeHtml(firstMessage)}"</p>
    </div>

    <div style="text-align: center;">
      <a href="${adminLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px;">
        ตอบกลับใน Admin Panel →
      </a>
    </div>

    <p style="color: rgba(148,163,184,0.4); font-size: 11px; text-align: center; margin-top: 24px;">
      Email นี้ส่งอัตโนมัติจาก LAPACK Game Hub • ผู้ใช้ไม่ทราบว่ามีการส่ง email
    </p>
  </div>
</body>
</html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LAPACK Support <onboarding@resend.dev>',
        to: [notifyEmail],
        subject: `🔔 มีผู้ใช้ส่งข้อความ: ${userLabel}`,
        html: emailHtml,
      })
    })

    const emailResult = await emailRes.json()
    return new Response(JSON.stringify({ ok: true, emailResult }), { headers: CORS })

  } catch (e: any) {
    // Always return OK — email failure should never break the app
    return new Response(JSON.stringify({ ok: true, error: e.message }), { headers: CORS })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getPlatformDisplay(platform: string): string {
  const map: Record<string, string> = {
    windows: '🪟 Windows', macos: '🍎 macOS',
    ios: '📱 iOS', android: '🤖 Android',
    linux: '🐧 Linux', other: '🌐 Other'
  }
  return map[platform] || '🌐 ' + platform
}
