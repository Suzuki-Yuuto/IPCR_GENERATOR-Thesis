const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'ipcr.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'professor',
      department TEXT,
      profile_image TEXT,
      google_drive_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating users table:', err);
    else console.log('✅ Users table ready');
  });

  // IPCR Targets table
  db.run(`
    CREATE TABLE IF NOT EXISTS ipcr_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      target INTEGER DEFAULT 0,
      academic_year TEXT DEFAULT '2023-2024',
      semester TEXT DEFAULT '1st',
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, category, academic_year, semester)
    )
  `, (err) => {
    if (err) console.error('Error creating ipcr_targets table:', err);
    else console.log('✅ IPCR Targets table ready');
  });

  // Documents table
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_size INTEGER,
      category TEXT NOT NULL,
      confidence REAL,
      google_drive_id TEXT,
      google_drive_link TEXT,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      academic_year TEXT DEFAULT '2023-2024',
      semester TEXT DEFAULT '1st',
      status TEXT DEFAULT 'processed',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating documents table:', err);
    else console.log('✅ Documents table ready');
  });

  // IPCR Records table
  db.run(`
    CREATE TABLE IF NOT EXISTS ipcr_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      target INTEGER DEFAULT 0,
      accomplished INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      submission_date DATE,
      completion_date DATE,
      remarks TEXT,
      academic_year TEXT DEFAULT '2023-2024',
      semester TEXT DEFAULT '1st',
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, category, academic_year, semester)
    )
  `, (err) => {
    if (err) console.error('Error creating ipcr_records table:', err);
    else console.log('✅ IPCR Records table ready');
  });

  console.log('✅ Database initialization complete');
});

module.exports = db;