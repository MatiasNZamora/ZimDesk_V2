export async function sendWhatsApp(phone: string, apiKey: string, message: string): Promise<void> {
  if (!phone || !apiKey) return
  const url =
    `https://api.callmebot.com/whatsapp.php` +
    `?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(message)}` +
    `&apikey=${apiKey}`
  await fetch(url)
}

export function notifyAdminsWhatsApp(message: string): void {
  const recipients = (process.env.WHATSAPP_ADMIN_RECIPIENTS ?? '')
    .split(',')
    .filter(Boolean)
    .map(r => r.trim().split(':'))
    .filter(p => p.length === 2)
  for (const [phone, key] of recipients) {
    sendWhatsApp(phone, key, message).catch(console.error)
  }
}
