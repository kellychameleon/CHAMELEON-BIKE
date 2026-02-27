const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions }   = require('firebase-functions/v2');
const { initializeApp }      = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

// Limit concurrent instances to control costs
setGlobalOptions({ maxInstances: 10 });

// === submitScore ===
// The ONLY way scores can be written to Firestore.
// Firestore rules deny all direct client writes, so faking scores via curl is blocked.
exports.submitScore = onCall(async (request) => {
  const { name, score } = request.data;

  // Validate score — must be a real positive number under a generous ceiling
  if (typeof score !== 'number' || !isFinite(score) || score <= 0 || score > 999999) {
    throw new HttpsError('invalid-argument', 'Invalid score.');
  }

  // Validate name — required, max 20 chars, letters/numbers/spaces/@ only
  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 20) {
    throw new HttpsError('invalid-argument', 'Invalid name.');
  }
  if (!/^[a-zA-Z0-9 @]+$/.test(name.trim())) {
    throw new HttpsError('invalid-argument', 'Name contains invalid characters.');
  }

  const db = getFirestore();
  await db.collection('leaderboard').add({
    name:      name.trim(),
    score:     Math.floor(score),
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
