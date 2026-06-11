const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/soundwave';

app.use(cors());
app.use(express.json());

// MongoDB Schema
const EpisodeSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  artist: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String, required: true },
  coverUrl: { type: String, required: true },
  audioUrl: { type: String, required: true },
  isPrivate: { type: Boolean, default: false }
});

const Episode = mongoose.model('Episode', EpisodeSchema);

// DB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
// 1. List public episodes
app.get('/api/v1/episodes/list', async (req, res) => {
  try {
    const episodes = await Episode.find({ isPrivate: false }).sort({ id: 1 });
    res.json(episodes);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. View specific episode detail (Vulnerable to IDOR & Weak Auth Bypass Token)
app.get('/api/v1/episodes/view', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing episode id parameter' });
  }

  try {
    const episodeId = parseInt(id, 10);
    const episode = await Episode.findOne({ id: episodeId });

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // If the episode is private (e.g. ID 100), check for the staging token bypass header
    if (episode.isPrivate) {
      const bypassToken = req.headers['x-bypass-token'];
      if (!bypassToken || bypassToken !== 'AudioM@ster2026') {
        return res.status(403).json({
          error: 'Access Denied',
          message: 'This episode is private. Staging/dev bypass token required.'
        });
      }
    }

    res.json(episode);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. JWT verification endpoint (used by Next.js frontend to render admin panel)
app.post('/api/v1/admin/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.body && req.body.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // The JWT Secret recovered from IDOR is 'soundwave_local_secret_dont_share'
  const secret = 'soundwave_local_secret_dont_share';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (decoded.role !== 'editor') {
      return res.status(403).json({ error: 'Forbidden: Requires editor role' });
    }

    res.json({
      status: 'success',
      user: decoded.username || 'admin',
      role: decoded.role,
      flag: 'VulnOS{s0und_w4v3_s0urc3map_1d0r_jwt_3xpl01t}'
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SoundWave API Backend running on port ${PORT}`);
});
