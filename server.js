import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES ---

// Get all inventory items
app.get('/api/inventory', (req, res) => {
    const sql = `
    SELECT inventory.id, products.name, products.brand, products.category, inventory.quantity, inventory.expiry_date 
    FROM inventory 
    JOIN products ON inventory.barcode = products.barcode 
    ORDER BY inventory.expiry_date ASC
  `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Lookup a product by barcode
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

// Search products by name
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

// Add or update inventory
app.post('/api/inventory', (req, res) => {
    const { barcode, quantity, expiry_date, name, brand, category } = req.body;

    // First, ensure the product exists in the products table
    const insertProductSql = `INSERT OR IGNORE INTO products (barcode, name, brand, category) VALUES (?, ?, ?, ?)`;
    db.run(insertProductSql, [barcode, name || 'Unknown Product', brand || '', category || 'Uncategorized'], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Then, add it to inventory
        // To keep it simple, we just insert a new row for each scan. 
        // In a more complex app, we'd SUM quantities for the same expiry date.
        const insertInventorySql = `INSERT INTO inventory (barcode, quantity, expiry_date) VALUES (?, ?, ?)`;
        db.run(insertInventorySql, [barcode, quantity, expiry_date], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Added to inventory', id: this.lastID });
        });
    });
});

// Delete an inventory item
app.delete('/api/inventory/:id', (req, res) => {
    const sql = `DELETE FROM inventory WHERE id = ?`;
    db.run(sql, [req.params.id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
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
