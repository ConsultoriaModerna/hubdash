// HubDash Tracking Endpoint — Vercel Serverless Function
// Tracks proposal opens via QR code scans and sends Slack notifications
//
// Usage: GET /api/track?id=COMPANY_ID&seg=SEGMENT_ID
// Returns: Landing page (HTML) or 1x1 tracking pixel (GIF)

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL || '';
const HS_PORTAL = '139994805';
const PIXEL_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

const SEG_NAMES = {
  // PMF segments
  agua_km0: 'Agua KM0', web_design: 'Web Design', booking: 'Reservas',
  social_media: 'Social Media', reputation: 'Reputacion', delivery: 'Delivery',
  pos: 'POS/TPV', supplier: 'Ingredientes', training: 'Formacion', launch_pkg: 'Pack Lanzamiento',
  // Hidden segments
  dark_premium: 'Dark Premium', slow_service: 'Servicio Lento', pricing_pain: 'Dolor de Precio',
  delivery_void: 'Sin Delivery', brunch_econ: 'Brunch Economy', terraza: 'Terraza Economy',
  sports_bar: 'Sports Bar', veg_wave: 'Vegetariano', family_gap: 'Familia sin Delivery',
  neg_crisis: 'Crisis Reputacion', premium_buy: 'Premium Buyers', no_reserv: 'Sin Reservas',
};

export default async function handler(req, res) {
  const { id, seg } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing company id' });
  }

  const ts = new Date().toISOString();
  const segName = SEG_NAMES[seg] || seg || 'Unknown';
  const hsUrl = `https://app-eu1.hubspot.com/contacts/${HS_PORTAL}/company/${id}`;

  // Send Slack notification (non-blocking)
  if (SLACK_WEBHOOK) {
    try {
      await fetch(SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `:eyes: *Propuesta abierta*\nSegmento: ${segName}\nCompany ID: ${id}\n<${hsUrl}|Ver en HubSpot>\nFecha: ${ts}`,
        }),
      });
    } catch (e) {
      console.error('Slack notification failed:', e.message);
    }
  }

  // Return landing page or tracking pixel
  const accept = req.headers.accept || '';
  if (accept.includes('text/html') || !accept.includes('image')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache');
    return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gracias por su interes</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0d1117; color: #e6edf3;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px;
            padding: 40px; max-width: 500px; text-align: center; }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { color: #8b949e; font-size: 14px; line-height: 1.6; }
    .badge { display: inline-block; background: rgba(63,185,80,0.15); color: #3fb950;
             padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Gracias por su interes</h1>
    <p>Hemos recibido su solicitud de informacion sobre <strong>${segName}</strong>.</p>
    <p>Nos pondremos en contacto con usted en breve.</p>
    <div class="badge">Ref: ${id}</div>
  </div>
  <img src="/api/track?id=${id}&seg=${seg}&px=1" width="1" height="1" style="position:absolute;opacity:0" />
</body>
</html>`);
  }

  // Tracking pixel response
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  return res.send(PIXEL_GIF);
}
