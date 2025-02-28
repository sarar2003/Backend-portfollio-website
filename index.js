// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const authMiddleware = require('./middleware/auth');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cookieParser());

// Check if MONGO_URI is loaded correctly from .env file
if (!process.env.MONGO_URI) {
  console.error("MongoDB URI is missing in .env file");
  process.exit(1); // Exit the process if MONGO_URI is missing
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Failed:', err));

// Define User Schema
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});
const User = mongoose.model('User', UserSchema);

// Define Portfolio Schema
const PortfolioSchema = new mongoose.Schema({
  title: String,
  description: String,
  img: String,
  codelink: String,
  livelink: String,
  userId: mongoose.Schema.Types.ObjectId
});
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

// Register User API
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed!', error });
  }
});

// User Login API
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true }).json({ message: 'Login successful!' });
  } catch (error) {
    res.status(500).json({ message: 'Login failed!', error });
  }
});

// Create Portfolio API
app.post('/portfolio', authMiddleware, async (req, res) => {
  try {
    const { title, description, img, codelink, livelink } = req.body;
    const portfolio = new Portfolio({
      title,
      description,
      img,
      codelink,
      livelink,
      userId: req.user.userId
    });
    await portfolio.save();
    res.status(201).json({ message: 'Portfolio created successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Portfolio creation failed!', error });
  }
});

// Get All Portfolios API
app.get('/portfolio', async (req, res) => {
  try {
    const portfolios = await Portfolio.find();
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve portfolios', error });
  }
});

// Update Portfolio API
app.put('/portfolio/:id', authMiddleware, async (req, res) => {
  try {
    await Portfolio.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, req.body);
    res.json({ message: 'Portfolio updated successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update portfolio', error });
  }
});

// Delete Portfolio API
app.delete('/portfolio/:id', authMiddleware, async (req, res) => {
  try {
    await Portfolio.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ message: 'Portfolio deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete portfolio', error });
  }
});

// Start Express Server
app.listen(5000, () => console.log('Server running on port 5000'));
