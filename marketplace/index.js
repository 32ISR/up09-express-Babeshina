const express = require("express")
const db = require("./db")
const bcr = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())
const SECRET = "hfbgfgurkkcnlkjopw"

const PORT = 3000

const auth = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" })
    }
    const token = authHeader.split(" ")[1]
    if (!token) {
        return res.status(401).json({ error: "Invalid token format" })
    }
    try {
        const decoded = jwt.verify(token, SECRET)
        req.user = decoded
        next()
    }
    catch (error) {
        return res.status(403).json({ error: "Invalid or expired token" })
    }
}

app.get("/", (req, res) => {
    return res.status(200).json({ text: "hello world" })
})

app.post("/auth/signin", (req, res) => {
    try {
        const { username, password } = req.body
        if (!username || !password) {
            return res.status(400).json({ error: "Нужно ввести логин или пароль" })
        }
        
        const user = db.prepare("SELECT * FROM users WHERE username=?").get(username)
        if (!user) {
            return res.status(401).json({ error: "Неправильный логин или пароль" })
        }
        
        const valid = bcr.compareSync(password, user.password)
        if (!valid) {
            return res.status(401).json({ error: "Неправильный логин или пароль" })
        }
        
        const { password: _, ...safeUser } = user
        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(200).json({ success: true, token, user: safeUser })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Something went wrong" })
    }
})

app.post("/auth/signup", (req, res) => {
    try {
        const { username, password, email } = req.body
        if (!username || !password) {
            return res.status(400).json({ error: "Нужно ввести логин или пароль" })
        }
        if (username.length < 3) {
            return res.status(400).json({ error: "Логин должен быть больше 3 символов" })
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Пароль должен быть больше 6 символов" })
        }
        
        const existing = db.prepare("SELECT id FROM users WHERE username=?").get(username)
        if (existing) {
            return res.status(409).json({ error: "Такой пользователь уже есть" })
        }
        
        const salt = bcr.genSaltSync(10)
        const hash = bcr.hashSync(password, salt)
        
        const user = db.prepare(`
            INSERT INTO users(username, email, password, role)
            VALUES(?, ?, ?, 'user')
        `).run(username.trim(), email?.trim() || null, hash)
        
        const newUser = db.prepare(`SELECT * FROM users WHERE id=?`).get(user.lastInsertRowid)
        const { password: _, ...safeUser } = newUser
        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(201).json({ success: true, token, user: safeUser })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Server failed" })
    }
})

app.get("/api/items", (req, res) => {
    try {
        const items = db.prepare("SELECT * FROM items ORDER BY createdAt DESC").all()
        return res.status(200).json(items)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Failed to fetch" })
    }
})

app.post("/api/items", auth, (req, res) => {
    console.log(req.body)
    try {
        const { title, description, price, imageURL } = req.body
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Нужно название" })
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ error: "Нужно описание" })
        }
        if (!price || price <= 0) {
            return res.status(400).json({ error: "Нужна цена" })
        }
        
        const info = db.prepare(`
            INSERT INTO items(title, description, price, imageURL, userId, username, status, highestBid, bidCount)
            VALUES(?, ?, ?, ?, ?, ?, 'active', NULL, 0)
        `).run(title.trim(), description.trim(), parseFloat(price), imageURL || null, req.user.id, req.user.username)
        
        const newItem = db.prepare("SELECT * FROM items WHERE id = ?").get(info.lastInsertRowid)
        return res.status(201).json(newItem)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Failed error" })
    }
})

app.delete("/api/items/:id", auth, (req, res) => {
    try {
        const { id } = req.params
        const item = db.prepare(`SELECT * FROM items WHERE id = ?`).get(id)
        
        if (!item) {
            return res.status(404).json({ error: "Item not found" })
        }
        
        if (item.userId !== req.user.id) {
            return res.status(403).json({ error: "You can only delete your own items" })
        }
        
        const delItems = db.prepare(`DELETE FROM items WHERE id = ?`).run(id)
        return res.status(200).json({ success: true, message: "Item deleted successfully" })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Something went wrong" })
    }
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})