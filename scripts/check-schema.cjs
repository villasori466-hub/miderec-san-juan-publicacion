const db = require('better-sqlite3')('db/local.sqlite');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='activity_submissions'").get());
