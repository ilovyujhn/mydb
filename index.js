const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('@cyclic.sh/s3fs')(process.env.S3_BUCKET_NAME)
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Enable CORS
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Secret key for JWT
const secretKey = 'ilovyujhnforever';

// Dummy user data (in real application, this should be stored securely, like in a database)
const users = [
  { id: 1, username: 'gilangf3000', password: 'ilovyujhn' }
];

app.get('/', (req, res) => {
  // Calculate server uptime
  const uptimeSeconds = process.uptime();
  const uptime = formatUptime(uptimeSeconds);

  // Get memory usage
  const memoryUsage = process.memoryUsage();

  res.json({
    status: true,
    uptime: uptime,
    memoryUsage: memoryUsage
  });
});

// Authenticate user and generate token
const authenticateUser = (username, password) => {
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    // Generate JWT token
    return jwt.sign({ id: user.id, username: user.username }, secretKey);
  }
  return null;
};

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.user = decoded;
    next();
  });
};

// Read data from JSON file
const readData = () => {
  try {
    const data = fs.readFileSync('database.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Write data to JSON file
const writeData = (data) => {
  fs.writeFileSync('database.json', JSON.stringify(data, null, 4));
};

// CRUD operations
app.get('/api/data', verifyToken, (req, res) => {
  const data = readData();
  res.json(data);
});

app.get('/api/data/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const data = readData();
  const item = data.find(item => item.id === id);
  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ message: 'Data not found' });
  }
});

app.post('/api/data', verifyToken, (req, res) => {
  const newData = req.body;
  newData.id = uuidv4();
  const data = readData();
  data.push(newData);
  writeData(data);
  res.json({ message: 'Data created', data: newData });
});

app.put('/api/data/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const data = readData();
  const index = data.findIndex(item => item.id === id);
  if (index !== -1) {
    data[index] = { id, ...updatedData };
    writeData(data);
    res.json({ message: 'Data updated', data: data[index] });
  } else {
    res.status(404).json({ message: 'Data not found' });
  }
});

app.delete('/api/data/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const data = readData();
  const index = data.findIndex(item => item.id === id);
  if (index !== -1) {
    const deletedItem = data.splice(index, 1);
    writeData(data);
    res.json({ message: 'Data deleted', data: deletedItem[0] });
  } else {
    res.status(404).json({ message: 'Data not found' });
  }
});


// Authentication route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const token = authenticateUser(username, password);
  if (token) {
    res.json({ status: true, token }); // Menambahkan status true jika berhasil
  } else {
    res.status(401).json({ status: false, message: 'Invalid username or password' }); // Menambahkan status false jika gagal
  }
});

function formatUptime(uptimeSeconds) {
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
