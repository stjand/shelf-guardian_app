import db from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrate = async () => {
    // 1. Get existing users
    const users = await new Promise((resolve) => {
        db.all('SELECT * FROM users', (err, rows) => resolve(rows || []));
    });
    console.log(`Saving ${users.length} existing users...`);

    db.serialize(() => {
        console.log('Dropping old tables...');
        db.run('DROP TABLE IF EXISTS inventory');
        db.run('DROP TABLE IF EXISTS products');
        db.run('DROP TABLE IF EXISTS users');

        const schemaPath = path.resolve(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying schema.sql...');
        db.exec(schema, (err) => {
            if (err) {
                console.error('Schema application failed:', err);
                process.exit(1);
            }

            console.log('Restoring users...');
            const insertUser = 'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)';
            let suryaId = 1;
            users.forEach(u => {
                db.run(insertUser, [u.id, u.username, u.email, u.password_hash, u.created_at]);
                if (u.username === 'surya') suryaId = u.id;
            });

            console.log(`Inserting sample data for surya (ID: ${suryaId})...`);
            const d = (offset) => {
                const x = new Date();
                x.setDate(x.getDate() + offset);
                return x.toISOString().split('T')[0];
            };
            const insertInv = 'INSERT INTO inventory (user_id, barcode, quantity, expiry_date) VALUES (?, ?, ?, ?)';
            db.run(insertInv, [suryaId, '8901262060011', 1, d(90)]);
            db.run(insertInv, [suryaId, '8901719101038', 5, d(2)]);
            db.run(insertInv, [suryaId, '8904004400762', 2, d(-5)]);
            db.run(insertInv, [suryaId, '8901063093089', 3, d(30)]);

            console.log('Migration and data population successful.');
            setTimeout(() => process.exit(), 500);
        });
    });
};

migrate();
