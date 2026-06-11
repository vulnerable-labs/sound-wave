const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/soundwave';

const EpisodeSchema = new mongoose.Schema({
  id: Number,
  title: String,
  artist: String,
  description: String,
  duration: String,
  coverUrl: String,
  audioUrl: String,
  isPrivate: Boolean
});

const Episode = mongoose.model('Episode', EpisodeSchema);

const seedData = [
  {
    id: 101,
    title: "Chasing Frequencies (Teaser)",
    artist: "Aether Echo",
    description: "Welcome to SoundWave! Check out our initial AI-normalized teaser of Chasing Frequencies. Normalization applied: -14 LUFS, True Peak -1.0 dBTP.",
    duration: "1:45",
    coverUrl: "/images/cover_101.jpg",
    audioUrl: "/audio/teaser.mp3",
    isPrivate: false
  },
  {
    id: 100,
    title: "[INTERNAL ONLY] SoundWave Dev Test Stream",
    artist: "Staging Pipeline",
    description: "[STAGING CONF] System testing normalized master stream. Bypass Verification Token validation successful. Internal Config: JWT_SECRET=soundwave_local_secret_dont_share. Do not share this key in production builds.",
    duration: "0:30",
    coverUrl: "/images/cover_100.jpg",
    audioUrl: "/audio/dev_stream.mp3",
    isPrivate: true
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');
    
    await Episode.deleteMany({});
    console.log('Cleared existing episodes.');

    await Episode.insertMany(seedData);
    console.log('Database seeded successfully.');
    
    mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
