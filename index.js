// server/index.js
require('dotenv').config(); // Load environment variables first

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

const app = express();

app.use(cors());
app.use(express.json());


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to DB:', err));

app.use('/auth', authRoutes);
app.use('/profiles', profileRoutes);
app.use('/media', mediaRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});
