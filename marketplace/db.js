const Database = require("better-sqlite3")

const db = new Database("./database.db")

db.exec (`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, 
    role TEXT DEFAULT "user",
    createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    imageUrl TEXT,
    userId INTEGER NOT NULL,
    username TEXT NOT NULL,
    status TEXT DEFAULT "active",
    highestBid REAL,
    bidCount INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datatime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    username TEXT NOT NULL,
    amount REAL NOT NULL, 
    createdAt TEXT DEFAULT (datatime('now')),
    FOREIGN KEY (itemId) REFERENCES items(id),
    FOREIGN KEY (userId) REFERENCES users(id)
    );
`)
module.exports = db