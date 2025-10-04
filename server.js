// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const nodemailer = require('nodemailer');

const app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS: set CLIENT_ORIGIN in Render to your portfolio URL
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://kurisuthegallant.github.io';
app.use(cors({ origin: CLIENT_ORIGIN }));

// Basic rate limiter (adjust limits as you like)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max requests per IP per window
  message: { success: false, error: 'Too many requests, try again later.' }
});
app.use('/contact', limiter);

// Nodemailer transport (Gmail + App Password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,               // your gmail, e.g. you@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD        // app password (16 char)
  }
});

// Basic validation helper
function isEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

app.post('/contact', async (req, res) => {
  try {
    const { name, email, message, hp } = req.body;

    // Honeypot: if bot filled it, silently ignore
    if (hp) return res.status(200).json({ success: true }); 

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }
    if (message.length > 5000) {
      return res.status(400).json({ success: false, error: 'Message too long' });
    }

    const mailOptions = {
      from: `${process.env.SENDER_NAME || 'Portfolio Contact'} <${process.env.GMAIL_USER}>`,
      to: process.env.CONTACT_EMAIL || process.env.GMAIL_USER,
      subject: `Portfolio message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      replyTo: email
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Message sent' });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
