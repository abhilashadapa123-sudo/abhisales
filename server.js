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
  
  if (username === 'AHTIJAR@1997' && password === 'ahtijar@1997') {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const SLIDERS_FILE = path.join(__dirname, 'sliders.json');

// Helper function to read products safely
function getProducts() {
  if (fs.existsSync(PRODUCTS_FILE)) {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  }
  return [];
}

// Helper function to read sliders safely
function getSliders() {
  if (fs.existsSync(SLIDERS_FILE)) {
    const data = fs.readFileSync(SLIDERS_FILE, 'utf8');
    return JSON.parse(data);
  }
  return [];
}

// Generic GitHub auto-commit & update function
async function updateGitHubFile(filePath, fileData) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

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

    const resJson = await getRes.json();
    const sha = resJson.sha;
    const contentEncoded = Buffer.from(JSON.stringify(fileData, null, 2)).toString('base64');

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js-Server'
      },
      body: JSON.stringify({
        message: `Auto-update ${filePath} from live server`,
        content: contentEncoded,
        sha: sha
      })
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`Failed to update GitHub: ${errText}`);
    }

    console.log(`Successfully synced ${filePath} to GitHub!`);
  } catch (error) {
    console.error(`Error updating GitHub ${filePath}:`, error.message);
  }
}

// --- Product APIs ---
app.get('/api/products', (req, res) => {
  try {
    const products = getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const products = getProducts();
    const newProduct = { id: Date.now().toString(), ...req.body };
    products.push(newProduct);
    
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    await updateGitHubFile('products.json', products);

    res.json({ success: true, message: 'Product added successfully', product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    await updateGitHubFile('products.json', products);

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    let products = getProducts();
    
    const filteredProducts = products.filter(p => p.id != productId);
    
    if (filteredProducts.length === products.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(filteredProducts, null, 2));
    await updateGitHubFile('products.json', filteredProducts);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Slider APIs ---
app.get('/api/sliders', (req, res) => {
  try {
    const sliders = getSliders();
    res.json(sliders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sliders', async (req, res) => {
  try {
    const sliders = getSliders();
    const newSlider = { id: Date.now().toString(), ...req.body };
    sliders.push(newSlider);
    
    fs.writeFileSync(SLIDERS_FILE, JSON.stringify(sliders, null, 2));
    await updateGitHubFile('sliders.json', sliders);

    res.json({ success: true, message: 'Slider added successfully', slider: newSlider });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/sliders/:id', async (req, res) => {
  try {
    const sliderId = req.params.id;
    let sliders = getSliders();
    
    const index = sliders.findIndex(s => s.id == sliderId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Slider not found' });
    }

    sliders[index] = { ...sliders[index], ...req.body, id: sliderId };
    
    fs.writeFileSync(SLIDERS_FILE, JSON.stringify(sliders, null, 2));
    await updateGitHubFile('sliders.json', sliders);

    res.json({ success: true, message: 'Slider updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/sliders/:id', async (req, res) => {
  try {
    const sliderId = req.params.id;
    let sliders = getSliders();
    
    const filteredSliders = sliders.filter(s => s.id != sliderId);
    
    if (filteredSliders.length === sliders.length) {
      return res.status(404).json({ success: false, message: 'Slider not found' });
    }

    fs.writeFileSync(SLIDERS_FILE, JSON.stringify(filteredSliders, null, 2));
    await updateGitHubFile('sliders.json', filteredSliders);

    res.json({ success: true, message: 'Slider deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});