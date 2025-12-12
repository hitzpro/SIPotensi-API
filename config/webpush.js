// config/webpush.js
const webpush = require('web-push');

// Ganti dengan key yang kamu generate tadi
const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

// Ganti email dengan email admin kamu
webpush.setVapidDetails(
  'mailto:guru@sekolah.id',
  publicVapidKey,
  privateVapidKey
);

module.exports = webpush;