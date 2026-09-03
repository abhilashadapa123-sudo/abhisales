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

// Root route updated to support WhatsApp Rich Previews (Open Graph Meta Tags)
app.get('/', (req, res) => {
  const productName = req.query.product;
  
  if (productName) {
    try {
      const products = getProducts();
      // కేవలం టైటిల్ సరిపోల్చడం (మ్యాచింగ్) ద్వారా ప్రొడక్ట్ వెతకడం
      const product = products.find(p => p.title.toLowerCase() === decodeURIComponent(productName).toLowerCase());
      
      if (product) {
        // వాట్సాప్ లేదా సోషల్ మీడియా బాట్ కోసం Open Graph మెటా ట్యాగ్స్‌తో రెస్పాన్స్ పంపడం
        return res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${product.title} - abhisales.in</title>
              
              <!-- Open Graph Meta Tags for WhatsApp & Social Media Preview -->
              <meta property="property" content="og:title" content="${product.title}" />
              <meta property="og:description" content="Price: ${product.price} | Buy now on abhisales.in" />
              <meta property="og:image" content="${product.image}" />
              <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}" />
              <meta property="og:type" content="website" />

              <!-- Automatic redirect to the main index page with product query so frontend modal opens -->
              <meta http-equiv="refresh" content="0;url=/?product=${encodeURIComponent(product.title)}">
          </head>
          <body>
              <p>Redirecting to product details...</p>
              <script>
                  window.location.href = "/?product=${encodeURIComponent(product.title)}";
              </script>
          </body>
          </html>
        `);
      }
    } catch (err) {
      console.error("Error serving Open Graph preview:", err);
    }
  }

  // సాధారణంగా హోమ్‌పేజీ ఓపెన్ అయినప్పుడు index.html ఫైల్ పంపడం
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
    const newProduct = { 
      id: Date.now().toString(), 
      title: req.body.title,
      price: req.body.price,
      category: req.body.category,
      image: req.body.image,
      link: req.body.link,
      videoUrl: req.body.videoUrl || '' // ఇది వీడియో లింక్‌ని సేవ్ చేస్తుంది
    };
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

    products[index] = { 
      id: productId, 
      title: req.body.title,
      price: req.body.price,
      category: req.body.category,
      image: req.body.image,
      link: req.body.link,
      videoUrl: req.body.videoUrl || '' // ఇది ఎడిట్ చేసినప్పుడు వీడియో లింక్‌ని అప్‌డేట్ చేస్తుంది
    };
    
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
    const newSlider = { 
      id: Date.now().toString(), 
      title: req.body.title,
      description: req.body.description,
      videoUrl: req.body.videoUrl 
    };
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

    sliders[index] = { 
      id: sliderId, 
      title: req.body.title,
      description: req.body.description,
      videoUrl: req.body.videoUrl 
    };
    
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
    
    The filteredSliders = sliders.filter(s => s.id != sliderId);
    
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
