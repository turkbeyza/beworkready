const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK (lazy singleton)
let app;
function getFirebaseApp() {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return app;
}

/**
 * Express middleware: verifies Firebase ID token from Authorization header.
 * Sets req.user = decoded token payload on success.
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid Authorization header.' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    getFirebaseApp();
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    // Forward user info to downstream services
    req.headers['x-user-uid']   = decoded.uid;
    req.headers['x-user-email'] = decoded.email || '';
    next();
  } catch (err) {
    logger.warn(`Token verification failed: ${err.message}`);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

/**
 * Express middleware: optionally verifies Firebase ID token.
 * Does not block if missing or invalid, but populates x-user headers if valid.
 */
async function tryVerifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    try {
      getFirebaseApp();
      const decoded = await admin.auth().verifyIdToken(idToken);
      req.user = decoded;
      req.headers['x-user-uid']   = decoded.uid;
      req.headers['x-user-email'] = decoded.email || '';
    } catch (err) {
      logger.debug(`Optional token verification bypassed: ${err.message}`);
    }
  }
  next();
}

module.exports = { verifyFirebaseToken, tryVerifyFirebaseToken };
