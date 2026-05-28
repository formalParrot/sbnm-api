const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.resolve(__dirname, "./db/base.db"),
  (err) => {
    if (err) console.error("DB connection error:", err.message);
    else console.log("Connected to SQLite database.");
  },
);

db.serialize(() => {
  // foreign keys
  db.run("PRAGMA foreign_keys = ON");

  // users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      password_hash TEXT NOT NULL
    )
  `);

  // builds
  db.run(`
    CREATE TABLE IF NOT EXISTS builds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `);

  // assets
  db.run(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      build_id INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('schematic', 'image', 'world_file', 'reference')),
      file_url TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY(build_id) REFERENCES builds(id),
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    )
  `);
});

module.exports = db;
