export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
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
