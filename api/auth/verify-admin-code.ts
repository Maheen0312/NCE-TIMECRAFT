export default function handler(req: any, res: any) {
  // Allow CORS if needed
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { secretCode } = req.body || {};
    if (!secretCode || typeof secretCode !== 'string') {
      return res.status(400).json({ success: false, message: 'Admin Secret Code is required.' });
    }

    const expectedCode = (process.env.ADMIN_SECRET_CODE || 'NCE9518').trim().toUpperCase();
    if (secretCode.trim().toUpperCase() !== expectedCode) {
      return res.status(401).json({ success: false, message: 'Invalid Admin Secret Code.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin Secret Code verified successfully.',
      verified: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server verification error' });
  }
}
