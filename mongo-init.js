// init.js
db = db.getSiblingDB('legacy');
db.createUser({
  user: 'legacyUser',
  pwd: 'legacyPassword',
  roles: [{ role: 'readWrite', db: 'legacy' }],
});
db.createCollection('users');
