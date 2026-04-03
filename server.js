import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db/database.js';
import { hashPassword, comparePassword, generateToken, verifyToken } from './db/auth.js';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
    req.user = decoded;
    next();
};

// --- AUTH ROUTES ---

// Registration
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
    try {
        const passwordHash = await hashPassword(password);
        const sql = `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`;
        db.run(sql, [username, email, passwordHash], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Registered successfully', id: this.lastID });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    
    const sql = `SELECT * FROM users WHERE username = ?`;
    db.get(sql, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || !(await comparePassword(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const token = generateToken(user);
        res.cookie('token', token, { 
            httpOnly: true, 
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });
        res.json({ message: 'Logged in', user: { id: user.id, username: user.username } });
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

// Check auth status
app.get('/api/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Session expired' });
    res.json({ user: decoded });
});

// --- PROTECTED API ROUTES ---

// Get all inventory items for current user
app.get('/api/inventory', authenticate, (req, res) => {
    const sql = `
    SELECT inventory.id, products.name, products.brand, products.category, inventory.quantity, inventory.expiry_date 
    FROM inventory 
    JOIN products ON inventory.barcode = products.barcode 
    WHERE inventory.user_id = ?
    ORDER BY inventory.expiry_date ASC
  `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Lookup a product by barcode (publicly accessible for scanning)
app.get('/api/products/:barcode', (req, res) => {
    const sql = `SELECT * FROM products WHERE barcode = ?`;
    db.get(sql, [req.params.barcode], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.json(row);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    });
});

// Search products by name (publicly accessible for scanning)
app.get('/api/search-products', (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    const sql = `SELECT * FROM products WHERE name LIKE ? LIMIT 10`;
    db.all(sql, [`%${query}%`], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Add or update inventory for current user
app.post('/api/inventory', authenticate, (req, res) => {
    const { barcode, quantity, expiry_date, name, brand, category } = req.body;
    const userId = req.user.id;

    // First, ensure the product exists in the products table
    const insertProductSql = `INSERT OR IGNORE INTO products (barcode, name, brand, category) VALUES (?, ?, ?, ?)`;
    db.run(insertProductSql, [barcode, name || 'Unknown Product', brand || '', category || 'Uncategorized'], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Then, add it to inventory for this user
        const insertInventorySql = `INSERT INTO inventory (user_id, barcode, quantity, expiry_date) VALUES (?, ?, ?, ?)`;
        db.run(insertInventorySql, [userId, barcode, quantity, expiry_date], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Added to inventory', id: this.lastID });
        });
    });
});

// Delete an inventory item for current user
app.delete('/api/inventory/:id', authenticate, (req, res) => {
    const sql = `DELETE FROM inventory WHERE id = ? AND user_id = ?`;
    db.run(sql, [req.params.id, req.user.id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Item not found or unauthorized' });
        }
        res.json({ message: 'Deleted successfully', changes: this.changes });
    });
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server only if not running on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

export default app;
