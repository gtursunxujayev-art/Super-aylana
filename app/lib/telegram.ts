const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN is missing. Telegram features are disabled.')
}
const API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : ''

export async function tgSendMessage(chatId: string | number, text: string, extra?: Record<string, any>) {
  if (!API) return
  try {
    await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
    })
  } catch (e) {
    console.error('tgSendMessage failed', e)
  }
}

export async function tgSetWebhook(url: string, secret?: string) {
  if (!API) throw new Error('BOT_TOKEN missing')
  const payload: any = { url }
  if (secret) payload.secret_token = secret
  const res = await fetch(`${API}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function tgDeleteWebhook() {
  if (!API) throw new Error('BOT_TOKEN missing')
  const res = await fetch(`${API}/deleteWebhook`, { method: 'POST' })
  return res.json()
}
