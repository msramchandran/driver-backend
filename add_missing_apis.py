import re

with open('server.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Add Multer if not exists
if "const multer = require('multer');" not in text:
    text = text.replace("const express = require('express');", "const express = require('express');\nconst multer = require('multer');\nconst path = require('path');")

# Add Multer config
multer_config = '''
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
'''
if "const upload = multer" not in text:
    text = text.replace("const app = express();", "const app = express();\n" + multer_config)

# Add routes
routes = '''

// --- AUTO CLICKER ADMIN APIS ---
app.post('/api/admin/clicker-users/:driverId/update-trips', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.driverId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.autoClickerTrips = req.body.trips;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/clicker-users/:driverId/toggle-payment', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.driverId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.hasPaidForClicker = !user.hasPaidForClicker;
    await user.save();
    io.to('clicker_' + user.autoClickerId).emit('clickerPaymentStatus', {
      status: user.hasPaidForClicker ? 'paid' : 'unpaid'
    });
    res.json({ success: true, hasPaidForClicker: user.hasPaidForClicker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clicker-payment/upload', upload.single('screenshot'), async (req, res) => {
  try {
    const { driver_id } = req.body;
    const user = await User.findOne({ autoClickerId: driver_id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.clickerPaymentScreenshot = req.file.path;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
'''

if "/api/admin/clicker-users/:driverId/update-trips" not in text:
    # Insert right before fix-wallet
    text = text.replace("app.get('/api/fix-wallet', async (req, res) => {", routes + "\napp.get('/api/fix-wallet', async (req, res) => {")

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(text)
