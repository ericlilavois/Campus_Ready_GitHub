export const config = {
  api: {
    bodyParser: false,
  },
};

// 2027 application window. Update these constants for future cycles.
// March 15, 2027 00:00 PT (PDT, UTC-7) → 2027-03-15T07:00:00Z
// End of May 15, 2027 = May 16, 2027 00:00 PT (PDT, UTC-7) → 2027-05-16T07:00:00Z
const WINDOW_OPEN_UTC = new Date('2027-03-15T07:00:00Z');
const WINDOW_CLOSE_UTC = new Date('2027-05-16T07:00:00Z');

function closedResponseHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Applications Closed — Campus Ready Foundation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 560px; margin: 80px auto; padding: 0 24px; color: #111827; line-height: 1.6; }
    h1 { font-size: 24px; margin: 0 0 24px; color: #0d9488; font-weight: 700; }
    p { margin: 0 0 16px; }
    a { color: #0d9488; }
  </style>
</head>
<body>
  <p>Thank you for your interest in Campus Ready Foundation.</p>
  <h1>Applications for 2026 Are Currently Closed</h1>
  <p>Applications for the 2027 grant cycle will be open on March 15 – May 15, 2027.</p>
  <p>To be notified when applications open, visit <a href="https://campusready.org/apply/start">campusready.org/apply/start</a> and add your email to our list.</p>
  <p>Questions? Email us at <a href="mailto:apply@campusready.foundation">apply@campusready.foundation</a>.</p>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const now = new Date();
  if (now < WINDOW_OPEN_UTC || now >= WINDOW_CLOSE_UTC) {
    console.log('Application submission blocked (outside window):', now.toISOString());
    res.setHeader('Content-Type', 'text/html');
    return res.status(403).send(closedResponseHtml());
  }

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

  if (!APPS_SCRIPT_URL) {
    console.error('APPS_SCRIPT_URL not configured');
    return res.status(500).send('Server configuration error');
  }

  try {
    // Read raw body and forward intact — avoids Vercel's parser altering URL-encoded data
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    console.log('Application submission received:', new Date().toISOString());

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded' },
      body: rawBody,
      redirect: 'follow',
    });

    const html = await response.text();
    console.log('Apps Script response status:', response.status);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send(`
      <html><body>
        <h2>Submission Error</h2>
        <p>We encountered an issue. Please try again or contact apply@campusready.foundation.</p>
        <p><a href="javascript:history.back()">Go Back</a></p>
      </body></html>
    `);
  }
}
