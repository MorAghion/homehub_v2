/**
 * bill-extractor — Supabase Edge Function
 *
 * Parses raw email content (from bill-scanner) and extracts structured
 * bill data: vendor, amount, currency, date, confidence score.
 *
 * POST body: { body: string, subject: string, from: string }
 * Returns:   { vendor, vendorId, amount, currency, date, confidence }
 */

import vendors from '../bill-vendors.json' assert { type: 'json' }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Vendor {
  id: string
  name: string
  patterns: string[]
  category: string
}

interface ExtractResult {
  vendor: string | null
  vendorId: string | null
  category: string | null
  amount: number | null
  currency: 'ILS' | 'USD' | 'EUR' | null
  date: string | null
  confidence: number
}

function detectVendor(text: string): Vendor | null {
  const lower = text.toLowerCase()
  for (const vendor of (vendors as { vendors: Vendor[] }).vendors) {
    for (const pattern of vendor.patterns) {
      if (lower.includes(pattern.toLowerCase())) return vendor
    }
  }
  return null
}

function extractAmount(text: string): { amount: number; currency: 'ILS' | 'USD' | 'EUR' } | null {
  // ILS patterns: ₪123.45 | 123.45 ₪ | 123.45 ש"ח | NIS 123.45
  const ilsPatterns = [
    /₪\s*([\d,]+\.?\d*)/,
    /([\d,]+\.?\d*)\s*₪/,
    /([\d,]+\.?\d*)\s*ש[""״]ח/,
    /NIS\s*([\d,]+\.?\d*)/i,
    /סה"כ[:\s]*([\d,]+\.?\d*)/,
    /סך הכל[:\s]*([\d,]+\.?\d*)/,
    /לתשלום[:\s]*([\d,]+\.?\d*)/,
    /total[:\s]*([\d,]+\.?\d*)/i,
    /amount due[:\s]*([\d,]+\.?\d*)/i,
  ]
  for (const pattern of ilsPatterns) {
    const m = text.match(pattern)
    if (m?.[1]) {
      const amount = parseFloat(m[1].replace(/,/g, ''))
      if (!isNaN(amount) && amount > 0 && amount < 100_000) {
        return { amount, currency: 'ILS' }
      }
    }
  }

  // USD
  const usdMatch = text.match(/\$\s*([\d,]+\.?\d*)/)
  if (usdMatch?.[1]) {
    const amount = parseFloat(usdMatch[1].replace(/,/g, ''))
    if (!isNaN(amount) && amount > 0) return { amount, currency: 'USD' }
  }

  // EUR
  const eurMatch = text.match(/€\s*([\d,]+\.?\d*)/)
  if (eurMatch?.[1]) {
    const amount = parseFloat(eurMatch[1].replace(/,/g, ''))
    if (!isNaN(amount) && amount > 0) return { amount, currency: 'EUR' }
  }

  return null
}

function extractDate(text: string): string | null {
  // ISO date
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (isoMatch) return isoMatch[1]

  // DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = text.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\b/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Hebrew month patterns
  const hebrewMonths: Record<string, string> = {
    'ינואר': '01', 'פברואר': '02', 'מרץ': '03', 'אפריל': '04',
    'מאי': '05', 'יוני': '06', 'יולי': '07', 'אוגוסט': '08',
    'ספטמבר': '09', 'אוקטובר': '10', 'נובמבר': '11', 'דצמבר': '12',
  }
  for (const [month, num] of Object.entries(hebrewMonths)) {
    const re = new RegExp(`(\\d{1,2})\\s+${month}\\s+(\\d{4})`)
    const m = text.match(re)
    if (m) return `${m[2]}-${num}-${m[1].padStart(2, '0')}`
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { body, subject, from } = await req.json() as {
      body: string
      subject: string
      from: string
    }

    const fullText = `${subject}\n${from}\n${body}`

    const vendor = detectVendor(fullText)
    const amountResult = extractAmount(fullText)
    const date = extractDate(fullText)

    // Confidence: each found field adds to confidence
    let confidence = 0
    if (vendor) confidence += 0.4
    if (amountResult) confidence += 0.4
    if (date) confidence += 0.2

    const result: ExtractResult = {
      vendor: vendor?.name ?? null,
      vendorId: vendor?.id ?? null,
      category: vendor?.category ?? null,
      amount: amountResult?.amount ?? null,
      currency: amountResult?.currency ?? null,
      date,
      confidence,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
