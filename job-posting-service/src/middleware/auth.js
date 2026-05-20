const admin  = require('firebase-admin');
const logger = require('../utils/logger');

let initialized = false;
function initFirebase() {
  if (!initialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    initialized = true;
  }
}

async function auth(req, res, next) {
  // If request already passed through gateway, trust the x-user-uid header
  if (req.headers['x-user-uid']) return next();

  // Direct call: verify token
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    initFirebase();
    const decoded = await admin.auth().verifyIdToken(header.split('Bearer ')[1]);
    req.headers['x-user-uid']   = decoded.uid;
    req.headers['x-user-email'] = decoded.email || '';
    next();
  } catch (e) {
    logger.warn(`Auth failed: ${e.message}`);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = auth;
