const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Node version older aithe idi kavali, v18+ aithe direct ga fetch vadocchu

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Mee frontend files unna folder name batti marchukondi

const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// GitHub lo products.json ni auto-commit & update chese function
async function updateGitHubProductsJSON(productsData) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const filePath = 'products.json';

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    // 1. Get current SHA of products.json (GitHub requires SHA to update existing files)
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'NodeApp'
      }
    });

    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. Convert products JSON array to Base64
    const updatedContent = Buffer.from(JSON.stringify(productsData, null, 2)).toString('base64');

    // 3. Commit the new products.json directly to GitHub repository
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'NodeApp'
      },
      body: JSON.stringify({
        message: 'Update products.json automatically from live server',
        content: updatedContent,
        sha: sha
      })
    });

    if (putRes.ok) {
      console.log('GitHub products.json updated successfully!');
      return true;
    } else {
      const errRes = await putRes.json();
      console.error('Failed to commit to GitHub:', errRes);
      return false;
    }
  } catch (err) {
    console.error('Error syncing with GitHub:', err);
    return false;
  }
}

// 1. Get Products API
app.get('/api/products', (req, res) => {
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read products file' });
    }
    res.json(JSON.parse(data));
  });
});

// 2. Add Product API (Example)
app.post('/api/products', async (req, res) => {
  try {
    const newProduct = req.body;
    
    // Read existing products
    const fileData = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    let products = JSON.parse(fileData);

    // Add new product
    products.push(newProduct);

    // Write locally to server temporary storage
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));

    // Sync changes to GitHub so it stays permanent across Render redeploys
    await updateGitHubProductsJSON(products);

    res.json({ success: true, message: 'Product added successfully and synced!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error while adding product' });
  }
});

// 3. Delete Product API (Example)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    // Read existing products
    const fileData = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    let products = JSON.parse(fileData);

    // Filter out the product to delete
    products = products.filter(p => p.id !== productId);

    // Write locally
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));

    // Sync changes to GitHub
    await updateGitHubProductsJSON(products);

    res.json({ success: true, message: 'Product deleted successfully and synced!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error while deleting product' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});