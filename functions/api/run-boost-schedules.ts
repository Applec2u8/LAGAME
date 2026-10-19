// Cloudflare Pages Function — POST /api/run-boost-schedules
// This is the background runner endpoint.
// Schedule it as a Cloudflare Worker Cron Trigger or call from Supabase Edge Function.
// Endpoint calls process_due_boost_schedules() SQL function in Supabase.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-pin',
  'Content-Type': 'application/json',
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestGet(ctx: { env: Record<string, string> }): Promise<Response> {
  return handleRun(ctx.env)
}

export async function onRequestPost(ctx: { env: Record<string, string> }): Promise<Response> {
  return handleRun(ctx.env)
}

async function handleRun(env: Record<string, string>): Promise<Response> {
  const sbUrl = env.VITE_SUPABASE_URL || 'https://srwttqkjygzraqqnqesl.supabase.co'
  const sbKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NLXFd5_OjpsSXzG7McF3Vg_Li9XKwKS'

  try {
    // Call the Supabase RPC function that processes all due schedules
    const res = await fetch(`${sbUrl}/rest/v1/rpc/process_due_boost_schedules`, {
      method: 'POST',
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    const result = await res.text()

    return new Response(
      JSON.stringify({ success: res.ok, result: JSON.parse(result), ran_at: new Date().toISOString() }),
      { status: 200, headers: CORS }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to run boost schedules' }),
      { status: 500, headers: CORS }
    )
  }
}
