const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// రూట్ డైరెక్టరీ నుంచే ఫైల్స్ సర్వ్ చేయడానికి:
app.use(express.static(path.join(__dirname)));

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

// అడ్మిన్ లాగిన్ API
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

// ప్రొడక్ట్స్ పొందడానికి API
app.get('/api/products', (req, res) => {
    fs.readFile(path.join(__dirname, 'products.json'), 'utf8', (err, data) => {
        if (err) res.status(500).json({ error: 'Failed to read data' });
        else res.json(JSON.parse(data || '[]'));
    });
});

// కొత్త ప్రొడక్ట్ యాడ్ చేయడానికి API
app.post('/api/products', (req, res) => {
    const newProduct = { id: Date.now().toString(), ...req.body };
    const filePath = path.join(__dirname, 'products.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        let products = (!err && data) ? JSON.parse(data) : [];
        products.push(newProduct);
        fs.writeFile(filePath, JSON.stringify(products, null, 2), (err) => {
            if (err) res.status(500).json({ error: 'Failed to save' });
            else res.json({ success: true, product: newProduct });
        });
    });
});

// ప్రొడక్ట్ ఎడిట్ (Update) చేయడానికి API
app.put('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const updatedData = req.body;
    const filePath = path.join(__dirname, 'products.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read' });
        let products = JSON.parse(data || '[]');
        products = products.map(p => p.id === productId ? { ...p, ...updatedData } : p);

        fs.writeFile(filePath, JSON.stringify(products, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update' });
            res.json({ success: true });
        });
    });
});

// ప్రొడక్ట్ డిలీట్ చేయడానికి API
app.delete('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const filePath = path.join(__dirname, 'products.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read' });
        let products = JSON.parse(data || '[]');
        products = products.filter(p => p.id !== productId);

        fs.writeFile(filePath, JSON.stringify(products, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Failed to delete' });
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});