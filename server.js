const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(__dirname));

// Root route to serve index.html explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Login API Route
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// Helper function to read products safely
function getProducts() {
  if (fs.existsSync(PRODUCTS_FILE)) {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  }
  return [];
}

// GitHub lo products.json ni auto-commit & update chese function
async function updateGitHubProductsJSON(productsData) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const filePath = 'products.json';

  if (!token || !owner || !repo) {
    console.log('GitHub environment variables are missing. Skipping GitHub sync.');
    return;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Node.js-Server'
      }
    });

    if (!getRes.ok) {
      throw new Error(`Failed to fetch file SHA from GitHub: ${getRes.statusText}`);
    }

    const fileData = await getRes.json();
    const sha = fileData.sha;
    const contentEncoded = Buffer.from(JSON.stringify(productsData, null, 2)).toString('base64');

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js-Server'
      },
      body: JSON.stringify({
        message: 'Auto-update products.json from live server',
        content: contentEncoded,
        sha: sha
      })
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`Failed to update GitHub: ${errText}`);
    }

    console.log('Successfully synced products.json to GitHub!');
  } catch (error) {
    console.error('Error updating GitHub products.json:', error.message);
  }
}

// Get all products (GET)
app.get('/api/products', (req, res) => {
  try {
    const products = getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new product (POST)
app.post('/api/products', async (req, res) => {
  try {
    const products = getProducts();
    const newProduct = { id: Date.now().toString(), ...req.body };
    products.push(newProduct);
    
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    await updateGitHubProductsJSON(products);

    res.json({ success: true, message: 'Product added successfully', product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update product by ID (PUT)
app.put('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    let products = getProducts();
    
    const index = products.findIndex(p => p.id == productId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    products[index] = { ...products[index], ...req.body, id: productId };
    
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    await updateGitHubProductsJSON(products);

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete product by ID (DELETE)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    let products = getProducts();
    
    const filteredProducts = products.filter(p => p.id != productId);
    
    if (filteredProducts.length === products.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(filteredProducts, null, 2));
    await updateGitHubProductsJSON(filteredProducts);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});