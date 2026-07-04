const crypto = require('crypto');
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto;
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Enable CORS manual headers middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
      return res.status(200).json({});
  }
  next();
});

app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

app.use((req, res, next) => {
  console.log(`${req.method} request to: ${req.url}`);
  next();
});

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const mongoURI = 'mongodb+srv://msramchandran2_db_user:LXruemGHHozPvaaF@ramachandrancluster.0jq4kie.mongodb.net/azhai_db?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB Atlas Successfully!"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  fullName: String,
  dob: String,
  gender: String,
  selectedVehicle: String,
  vehicleNumber: String,
  dlNumber: String,
  idType: String,
  idNumber: String,
  profileImageUrl: String,
  dlFrontUrl: String,
  dlBackUrl: String,
  rcFrontUrl: String,
  rcBackUrl: String,
  idFrontUrl: String,
  idBackUrl: String,
  isRegistered: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'active', 'rejected', 'blocked'], default: 'pending' },
  forceUpdate: { type: Boolean, default: false },
  appVersion: { type: String, default: '1.0.0' },
  createdAt: { type: Date, default: Date.now },
  // 💰 Wallet & Referrals
  walletBalance: { type: Number, default: 0 },
  hasReceivedSignupBonus: { type: Boolean, default: false },
  referralCode: { type: String },
  driverReferralCount: { type: Number, default: 0 },
  customerReferralCount: { type: Number, default: 0 },
  promoTripsPoints: { type: Number, default: 0 },
  usedReferralCodes: [{ type: String }],
  walletTransactions: [
    {
      amount: Number,
      description: String,
      date: { type: Date, default: Date.now }
    }
  ],
  lastAutoPassDate: { type: String },
  // 🗑️ Account Deletion Tracking
  isDeleted: { type: Boolean, default: false },
  deleteReason: { type: String, default: '' },
  deletedAt: { type: Date },
  dutyHistory: [
    {
      startedAt: { type: Date },
      endedAt: { type: Date },
      durationSeconds: { type: Number },
    }
  ],
  // 💰 Driver Trip History for Earnings
  tripHistory: [
    {
      rideId:      { type: String },
      customerId:  { type: String },
      pickup:      { type: String },
      drop:        { type: String },
      fare:        { type: String },
      distance:    { type: String },
      vehicleType: { type: String },
      completedAt: { type: Date, default: Date.now },
    }
  ],
});

const User = mongoose.model('User', userSchema);

// =====================================================
// 🆕 APK RELEASE SCHEMA — Persist upload version history
// =====================================================
const apkReleaseSchema = new mongoose.Schema({
  versionName: { type: String, required: true },
  fileName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  sizeBytes: { type: Number },
});

const ApkRelease = mongoose.model('ApkRelease', apkReleaseSchema);

// =====================================================
// 🚖 RIDE SCHEMA — Persist every ride lifecycle
// =====================================================
const rideSchema = new mongoose.Schema({
  rideId:         { type: String, required: true, unique: true },
  customerId:     { type: String, default: '' },
  customerName:   { type: String, default: '' },
  customerPhone:  { type: String, default: '' },
  driverUid:      { type: String, default: '' },
  driverSocketId: { type: String, default: '' },
  driverName:     { type: String, default: '' },
  vehicleNumber:  { type: String, default: '' },
  pickup:         { type: String, default: '' },
  drop:           { type: String, default: '' },
  fare:           { type: String, default: '₹0' },
  promoApplied:   { type: Boolean, default: false },
  promoDiscount:  { type: Number, default: 0 },
  distance:       { type: String, default: '' },
  lat:            { type: Number, default: 0 },  // Customer pickup latitude
  lng:            { type: Number, default: 0 },  // Customer pickup longitude
  dropLat:        { type: Number, default: 0 },  // ✅ FIX: Customer drop latitude
  dropLng:        { type: Number, default: 0 },  // ✅ FIX: Customer drop longitude
  otp:            { type: String, default: '' },
  vehicleType:    { type: String, default: '' },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'started', 'finished', 'canceled', 'timeout'],
    default: 'requested'
  },
  cancelReason:   { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
  acceptedAt:  { type: Date },
  startedAt:   { type: Date },
  finishedAt:  { type: Date },
  canceledAt:  { type: Date },
  isCustomerRated: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  ratingReason: { type: String, default: '' },
});

const Ride = mongoose.model('Ride', rideSchema);

const rides = {};
const activeDrivers = {};
const activePublicDrivers = {}; // 🆕 Memory store for dashboard public sharing drivers


app.get('/', (req, res) => {
  res.send('✅ Azhai Partner Backend is running!');
});

// 🔴 Updated Register API with Safety Checks and pending status reset
app.post('/register', upload.any(), async (req, res) => {
  console.log("Saving registration data...");
  try {
    let userData;
    if (req.body.userData) {
      userData = JSON.parse(req.body.userData);
    } else {
      userData = req.body;
    }

    if (!userData || !userData.uid) {
      console.log("Error: userData or uid is missing");
      return res.status(400).json({ error: "userData or uid is missing from request" });
    }

    const baseUrl = "https://plow-strangle-edition.ngrok-free.dev"; 

    if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
            if (file.fieldname === 'profileImage') userData.profileImageUrl = `${baseUrl}/uploads/${file.filename}`;
            if (file.fieldname === 'dlFront') userData.dlFrontUrl = `${baseUrl}/uploads/${file.filename}`;
            if (file.fieldname === 'dlBack') userData.dlBackUrl = `${baseUrl}/uploads/${file.filename}`;
            if (file.fieldname === 'rcFront') userData.rcFrontUrl = `${baseUrl}/uploads/${file.filename}`;
            if (file.fieldname === 'rcBack') userData.rcBackUrl = `${baseUrl}/uploads/${file.filename}`;
            if (file.fieldname === 'idFront') userData.idFrontUrl = `${baseUrl}/uploads/${file.filename}`;
            if (file.fieldname === 'idBack') userData.idBackUrl = `${baseUrl}/uploads/${file.filename}`;
        });
    }

    let user = await User.findOne({ uid: userData.uid });
    const isNewRegistration = !user || !user.hasReceivedSignupBonus;

    let updateData = { ...userData, isRegistered: true, status: 'pending' };

    if (isNewRegistration) {
      // Generate Referral Code: First 3 letters of name + last 3 of phone + 2 random digits to prevent collisions
      const namePart = (userData.fullName || 'DRI').substring(0, 3).toUpperCase();
      const phonePart = (userData.phone || '000').slice(-3);
      const referralCode = `${namePart}${phonePart}${Math.floor(10 + Math.random() * 90)}`;
      
      updateData.referralCode = referralCode;
      updateData.hasReceivedSignupBonus = true;
      updateData.walletBalance = 100;
      updateData.walletTransactions = [
        {
          amount: 100,
          description: "100 point credited your wallet",
          date: new Date()
        }
      ];
    }

    user = await User.findOneAndUpdate(
      { uid: userData.uid },
      updateData,
      { upsert: true, new: true }
    );
    console.log("✅ Registration Successful for UID:", userData.uid);
    res.status(200).json({ message: "Success!", user });
  } catch (error) {
    console.error("❌ Register Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/user/:uid', async (req, res) => {
  try {
    const { phone, appVersion } = req.query;
    let user = await User.findOne({ uid: req.params.uid });
    
    // Fallback: If not found by UID, search by phone number (since UID can change on reinstall)
    if (!user && phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const last10Digits = cleanPhone.slice(-10);
      
      user = await User.findOne({
        $or: [
          { phone: phone },
          { phone: new RegExp(last10Digits + '$') }
        ]
      });
      
      if (user) {
        user.uid = req.params.uid;
        console.log(`[Self-Healing] Updated driver UID for phone ${phone} to ${req.params.uid}`);
      }
    }

    if (user) {
      // Update app version if sent
      if (appVersion) {
        user.appVersion = appVersion;
        // If driver was blocked by forceUpdate and has opened the updated app (version not 1.0.0), clear block
        if (user.forceUpdate && appVersion !== '1.0.0') {
          user.forceUpdate = false;
          console.log(`[Auto-Update] Driver ${user.uid} updated to version ${appVersion}. Force update cleared!`);
        }
      }
      // Self-healing: if phone is in query and empty/missing/N/A in DB, update it
      if (phone && (!user.phone || user.phone === 'N/A' || user.phone === '')) {
        user.phone = phone;
        console.log(`[Self-Healing] Restored phone number for driver ${user.uid} to ${phone}`);
      }
      await user.save();
      const completedRidesCount = await Ride.countDocuments({ driverUid: req.params.uid, status: 'finished' });
      const userObj = user.toObject();
      userObj.completedRidesCount = completedRidesCount;
      res.status(200).json(userObj);
    } else {
      res.status(200).json({ isRegistered: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Reset Driver Registration Status (on Rejection Re-upload)
app.post('/user/:uid/reset', async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { isRegistered: false, status: 'pending' },
      { new: true }
    );
    if (user) {
      res.status(200).json({ message: "Reset successful", user });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("❌ Reset Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 💰 Driver Apply Referral API
app.post('/api/driver/:uid/apply-referral', async (req, res) => {
  try {
    const { uid } = req.params;
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ error: "Referral code is required" });
    }

    // Find current driver
    const currentDriver = await User.findOne({ uid });
    if (!currentDriver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // 1. Check if driver is trying to use their own referral code
    if (currentDriver.referralCode === referralCode) {
      return res.status(400).json({ error: "You cannot apply your own referral code" });
    }

    // 2. Check if driver already used this specific referral code
    if (currentDriver.usedReferralCodes && currentDriver.usedReferralCodes.includes(referralCode)) {
      return res.status(400).json({ error: "Referral ID already used" });
    }

    // 3. Find the owner of the referral code
    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({ error: "Invalid Referral ID" });
    }

    // Success! Update current driver
    currentDriver.walletBalance = (currentDriver.walletBalance || 0) + 10;
    if (!currentDriver.usedReferralCodes) currentDriver.usedReferralCodes = [];
    currentDriver.usedReferralCodes.push(referralCode);
    if (!currentDriver.walletTransactions) currentDriver.walletTransactions = [];
    currentDriver.walletTransactions.push({
      amount: 10,
      description: `10 points earned using referral code ${referralCode}`,
      date: new Date()
    });
    await currentDriver.save();

    // Update referrer
    referrer.driverReferralCount = (referrer.driverReferralCount || 0) + 1;
    // Optional: give referrer 10 points too (not strictly requested but usually done)
    referrer.walletBalance = (referrer.walletBalance || 0) + 10;
    if (!referrer.walletTransactions) referrer.walletTransactions = [];
    referrer.walletTransactions.push({
      amount: 10,
      description: `10 points earned from driver signup (${currentDriver.fullName})`,
      date: new Date()
    });
    await referrer.save();

    res.status(200).json({ 
      message: "Referral applied successfully!", 
      walletBalance: currentDriver.walletBalance,
      transactions: currentDriver.walletTransactions
    });

  } catch (error) {
    console.error("❌ Apply Referral Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🎁 Driver apply customer's referral code
app.post('/api/driver/:uid/apply-customer-referral', async (req, res) => {
  try {
    const { uid } = req.params;
    const { customerReferralCode } = req.body;

    if (!customerReferralCode) {
      return res.status(400).json({ error: "Customer Referral code is required" });
    }

    const currentDriver = await User.findOne({ uid });
    if (!currentDriver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Check if driver has already used this code
    if (currentDriver.usedReferralCodes && currentDriver.usedReferralCodes.includes(customerReferralCode)) {
      return res.status(400).json({ error: "You have already used this referral code!" });
    }

    // Find the customer with this code
    const customer = await Customer.findOne({ referralCode: customerReferralCode });
    if (!customer) {
      return res.status(404).json({ error: "Invalid customer referral code!" });
    }

    // Check if customer code is already used
    if (customer.isReferralUsed) {
      return res.status(400).json({ error: "This customer referral code has already been used." });
    }

    // Give the driver 10 points
    currentDriver.walletBalance = (currentDriver.walletBalance || 0) + 10;
    if (!currentDriver.usedReferralCodes) currentDriver.usedReferralCodes = [];
    currentDriver.usedReferralCodes.push(customerReferralCode);
    
    // Increment customer referral count for the driver
    currentDriver.customerReferralCount = (currentDriver.customerReferralCount || 0) + 1;
    
    if (!currentDriver.walletTransactions) currentDriver.walletTransactions = [];
    currentDriver.walletTransactions.push({
      amount: 10,
      description: `10 points earned using customer referral code ${customerReferralCode}`,
      date: new Date()
    });
    
    await currentDriver.save();

    // Mark customer's code as used and award them 100 promo points
    customer.isReferralUsed = true;
    customer.promoPoints = 100; // Customer gets 100 promo points (5 trips * 20 points)
    await customer.save();

    res.status(200).json({ 
      message: "Customer Referral applied successfully!", 
      walletBalance: currentDriver.walletBalance,
      transactions: currentDriver.walletTransactions
    });

  } catch (error) {
    console.error("❌ Apply Customer Referral Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🌟 Admin API - Get dashboard summary statistics
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const completedRides = await Ride.countDocuments({ status: 'finished' });
    const pendingApprovals = await User.countDocuments({ isRegistered: true, status: 'pending' });
    
    const finishedRides = await Ride.find({ status: 'finished' });
    const totalEarnings = finishedRides.reduce((acc, r) => {
      const fareNum = parseFloat(r.fare.toString().replace(/[^0-9.]/g, '')) || 0;
      return acc + fareNum;
    }, 0);

    res.status(200).json({
      totalEarnings,
      completedRides,
      pendingApprovals
    });
  } catch (error) {
    console.error("❌ Dashboard API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Driver Dashboard Stats API
app.get('/api/driver-dashboard/stats', async (req, res) => {
  try {
    const totalJoined = await User.countDocuments({ isRegistered: true });
    const activeSharing = Object.keys(activePublicDrivers).length;
    res.status(200).json({
      totalJoined,
      activeSharing
    });
  } catch (err) {
    console.error('❌ Error fetching dashboard stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});
// 🆕 Admin API - Get all registered customers
app.get('/api/admin/customers', async (req, res) => {
  try {
    const customers = await Customer.find({ isRegistered: true }).sort({ createdAt: -1 });
    
    const formatted = customers.map(c => {
      return {
        id: c.uid,
        name: c.fullName || 'Unknown Customer',
        phone: c.phone || 'N/A',
        profileImage: c.profileImageUrl || 'https://via.placeholder.com/150',
        referralCode: c.referralCode || 'N/A',
        isDeleted: c.isDeleted || false,
        tripCount: c.tripHistory ? c.tripHistory.length : 0,
        savedLocationsCount: c.savedLocations ? c.savedLocations.length : 0,
        createdAt: c.createdAt
      };
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error('❌ Error fetching customers:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Block Customer
app.post('/api/admin/customers/:customerId/block', async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { uid: req.params.customerId },
      { isDeleted: true, deleteReason: 'Blocked by Admin', deletedAt: new Date() },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.status(200).json({ message: 'Customer blocked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Unblock Customer
app.post('/api/admin/customers/:customerId/unblock', async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { uid: req.params.customerId },
      { isDeleted: false, deleteReason: '', $unset: { deletedAt: "" } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.status(200).json({ message: 'Customer unblocked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Get all registered drivers
app.get('/api/admin/drivers', async (req, res) => {
  try {
    const users = await User.find({ isRegistered: true });
    
    const formatted = await Promise.all(users.map(async (user) => {
      const duplicates = {
        vehicleNumber: false,
        dlNumber: false,
        idNumber: false,
      };

      // Check duplicate vehicleNumber
      if (user.vehicleNumber && user.vehicleNumber !== 'N/A') {
        const count = await User.countDocuments({
          uid: { $ne: user.uid },
          vehicleNumber: user.vehicleNumber,
          isRegistered: true,
        });
        if (count > 0) duplicates.vehicleNumber = true;
      }

      // Check duplicate dlNumber
      if (user.dlNumber && user.dlNumber !== 'N/A') {
        const count = await User.countDocuments({
          uid: { $ne: user.uid },
          dlNumber: user.dlNumber,
          isRegistered: true,
        });
        if (count > 0) duplicates.dlNumber = true;
      }

      // Check duplicate idNumber (Aadhaar/PAN)
      if (user.idNumber && user.idNumber !== 'N/A') {
        const count = await User.countDocuments({
          uid: { $ne: user.uid },
          idNumber: user.idNumber,
          isRegistered: true,
        });
        if (count > 0) duplicates.idNumber = true;
      }

      // Fetch driver ratings from Ride collection
      const driverRides = await Ride.find({ driverUid: user.uid, rating: { $gt: 0 } });
      let totalRatings = driverRides.length;
      let averageRating = 0;
      let goodReasons = [];
      let badReasons = [];
      let goodReasonCounts = {};
      let badReasonCounts = {};

      if (totalRatings > 0) {
        let sum = 0;
        driverRides.forEach(r => {
          sum += r.rating;
          if (r.ratingReason) {
            const reasons = r.ratingReason.split(',').map(s => s.trim()).filter(s => s);
            reasons.forEach(reason => {
              if (r.rating < 3) {
                badReasonCounts[reason] = (badReasonCounts[reason] || 0) + 1;
              } else {
                goodReasonCounts[reason] = (goodReasonCounts[reason] || 0) + 1;
              }
            });
          }
        });
        averageRating = Number((sum / totalRatings).toFixed(1));
        
        // Convert to array of objects
        goodReasons = Object.entries(goodReasonCounts).map(([reason, count]) => ({ reason, count }));
        badReasons = Object.entries(badReasonCounts).map(([reason, count]) => ({ reason, count }));
      }

      return {
        id: user.uid,
        name: user.fullName || 'Unknown Driver',
        phone: user.phone || 'N/A',
        autoVariant: user.selectedVehicle || 'Auto',
        regNumber: user.vehicleNumber || 'N/A',
        status: user.status || 'pending',
        forceUpdate: user.forceUpdate || false,
        appVersion: user.appVersion || '1.0.0',
        profileImage: user.profileImageUrl || 'https://via.placeholder.com/150',
        licensePath: user.dlNumber || 'N/A',
        aadharNumber: user.idNumber || 'N/A',
        dlFront: user.dlFrontUrl || '',
        dlBack: user.dlBackUrl || '',
        rcFront: user.rcFrontUrl || '',
        rcBack: user.rcBackUrl || '',
        idFront: user.idFrontUrl || '',
        idBack: user.idBackUrl || '',
        duplicates,
        averageRating,
        totalRatings,
        goodReasons,
        badReasons,
      };
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("❌ Get Drivers API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Update driver approval status
app.put('/api/admin/drivers/:driverId/status', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body;
    if (!['active', 'rejected', 'pending', 'blocked'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const user = await User.findOneAndUpdate(
      { uid: driverId },
      { status },
      { new: true }
    );
    if (user) {
      // Emit socket event if status changed to block/unblock real-time
      const activeList = Object.entries(activeDrivers);
      const matches = activeList.filter(([socketId, active]) => active.driverUid === driverId);
      if (status === 'blocked') {
        matches.forEach(([socketId]) => {
          io.to(socketId).emit('driverBlocked', { message: "You are blocked" });
        });
      } else if (status === 'active') {
        matches.forEach(([socketId]) => {
          io.to(socketId).emit('driverUnblocked', { message: "You are unblocked" });
        });
      }
      res.status(200).json({ message: "Status updated successfully", user });
    } else {
      res.status(404).json({ error: "Driver not found" });
    }
  } catch (error) {
    console.error("❌ Update Driver Status API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Block a driver
app.post('/api/admin/drivers/:driverId/block', async (req, res) => {
  try {
    const { driverId } = req.params;
    const user = await User.findOneAndUpdate({ uid: driverId }, { status: 'blocked' }, { new: true });
    if (user) {
      const activeList = Object.entries(activeDrivers);
      const matches = activeList.filter(([socketId, active]) => active.driverUid === driverId);
      matches.forEach(([socketId]) => {
        io.to(socketId).emit('driverBlocked', { message: "You are blocked" });
      });
      res.status(200).json({ message: "Driver blocked successfully", user });
    } else {
      res.status(404).json({ error: "Driver not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Unblock a driver
app.post('/api/admin/drivers/:driverId/unblock', async (req, res) => {
  try {
    const { driverId } = req.params;
    const user = await User.findOneAndUpdate({ uid: driverId }, { status: 'active' }, { new: true });
    if (user) {
      const activeList = Object.entries(activeDrivers);
      const matches = activeList.filter(([socketId, active]) => active.driverUid === driverId);
      matches.forEach(([socketId]) => {
        io.to(socketId).emit('driverUnblocked', { message: "You are unblocked" });
      });
      res.status(200).json({ message: "Driver unblocked successfully", user });
    } else {
      res.status(404).json({ error: "Driver not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Force app update on a driver
app.post('/api/admin/drivers/:driverId/force-update', async (req, res) => {
  try {
    const { driverId } = req.params;
    const user = await User.findOneAndUpdate({ uid: driverId }, { forceUpdate: true }, { new: true });
    if (user) {
      const activeList = Object.entries(activeDrivers);
      const matches = activeList.filter(([socketId, active]) => active.driverUid === driverId);
      matches.forEach(([socketId]) => {
        io.to(socketId).emit('forceUpdate', { message: "Please update the app" });
      });
      res.status(200).json({ message: "Force update sent successfully", user });
    } else {
      res.status(404).json({ error: "Driver not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Remove force app update on a driver
app.post('/api/admin/drivers/:driverId/remove-force-update', async (req, res) => {
  try {
    const { driverId } = req.params;
    const user = await User.findOneAndUpdate({ uid: driverId }, { forceUpdate: false }, { new: true });
    if (user) {
      const activeList = Object.entries(activeDrivers);
      const matches = activeList.filter(([socketId, active]) => active.driverUid === driverId);
      matches.forEach(([socketId]) => {
        io.to(socketId).emit('forceUpdateRemoved', { message: "Force update removed" });
      });
      res.status(200).json({ message: "Force update removed successfully", user });
    } else {
      res.status(404).json({ error: "Driver not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Force app update on ALL outdated drivers
app.post('/api/admin/drivers/force-update-all', async (req, res) => {
  try {
    // Find all registered users whose appVersion is not '1.0.1'
    const result = await User.updateMany(
      { isRegistered: true, appVersion: { $ne: '1.0.1' } },
      { forceUpdate: true }
    );
    
    // Emit 'forceUpdate' to all connected sockets of outdated drivers
    const outdatedDrivers = await User.find({ isRegistered: true, appVersion: { $ne: '1.0.1' } });
    const outdatedUids = new Set(outdatedDrivers.map(d => d.uid));
    
    const activeList = Object.entries(activeDrivers);
    activeList.forEach(([socketId, active]) => {
      if (outdatedUids.has(active.driverUid)) {
        io.to(socketId).emit('forceUpdate', { message: "Please update the app" });
      }
    });

    res.status(200).json({ 
      message: "Force update triggered for all outdated drivers", 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Get all ride history logs
app.get('/api/admin/rides', async (req, res) => {
  try {
    const dbRides = await Ride.find().sort({ createdAt: -1 });
    
    const drivers = await User.find({}, 'uid phone');
    const driverPhoneMap = {};
    drivers.forEach(d => driverPhoneMap[d.uid] = d.phone || 'N/A');

    const formatted = dbRides.map(ride => {
      let dateStr = 'N/A';
      if (ride.createdAt) {
        const d = new Date(ride.createdAt);
        dateStr = d.toISOString().replace('T', ' ').substring(0, 16);
      }
      
      let statusStr = ride.status || 'requested';
      
      const fareNum = parseFloat(ride.fare.toString().replace(/[^0-9.]/g, '')) || 0;

      return {
        id: ride.rideId,
        date: dateStr,
        customerName: ride.customerName || 'Customer',
        customerPhone: ride.customerPhone || 'N/A',
        driverName: ride.driverName || 'N/A',
        driverPhone: driverPhoneMap[ride.driverUid] || 'N/A',
        autoVariant: ride.vehicleType || 'Auto',
        pickup: ride.pickup || 'N/A',
        drop: ride.drop || 'N/A',
        fare: fareNum,
        status: statusStr
      };
    });
    res.status(200).json(formatted);
  } catch (error) {
    console.error("❌ Get Rides API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Update ride status manually
app.put('/api/admin/rides/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['requested', 'accepted', 'started', 'finished', 'canceled', 'timeout'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedRide = await Ride.findOneAndUpdate(
      { rideId: id },
      { status },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Update in-memory rides if it exists
    if (rides[id]) {
      rides[id].status = status;
    }

    // Broadcast Socket.IO events to sync customer and driver apps
    io.emit('rideStatusUpdated', { rideId: id, status }); // Generic event
    if (status === 'finished') {
      io.emit('rideFinished', { rideId: id, status: 'finished' });
      delete rides[id];
    } else if (status === 'canceled' || status === 'timeout') {
      io.emit('rideCanceled', { rideId: id, status, reason: 'Canceled by Admin' });
      delete rides[id];
    } else if (status === 'started') {
      io.emit('rideStartedNotification', { rideId: id });
    }

    res.status(200).json({ message: 'Status updated successfully', ride: updatedRide });
  } catch (error) {
    console.error("❌ Update Ride Status API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Get all active/live rides in the system
app.get('/api/admin/live-rides', async (req, res) => {
  try {
    const activeRides = await Ride.find({
      status: { $in: ['requested', 'accepted', 'started'] }
    }).sort({ createdAt: -1 });

    const formatted = activeRides.map(ride => {
      let dateStr = 'N/A';
      if (ride.createdAt) {
        const d = new Date(ride.createdAt);
        dateStr = d.toISOString().replace('T', ' ').substring(0, 16);
      }
      return {
        id: ride.rideId,
        date: dateStr,
        customerId: ride.customerId || '',
        customerName: ride.customerName || 'Customer',
        customerPhone: ride.customerPhone || 'N/A',
        driverUid: ride.driverUid || 'N/A',
        driverName: ride.driverName || 'N/A',
        vehicleNumber: ride.vehicleNumber || 'N/A',
        pickup: ride.pickup || 'N/A',
        drop: ride.drop || 'N/A',
        fare: ride.fare || '₹0',
        distance: ride.distance || '0 Km',
        status: ride.status,
      };
    });
    res.status(200).json(formatted);
  } catch (error) {
    console.error("❌ Live Rides API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Upload new Driver App APK file with Version Name
app.post('/api/admin/upload-apk', upload.single('apk'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const tempPath = req.file.path;
    const versionName = req.body.versionName ? req.body.versionName.trim() : '';

    if (!versionName) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(400).json({ error: "Version name is required" });
    }

    const versionedFileName = `app-release-${versionName}.apk`;
    const versionedPath = path.join(__dirname, 'uploads', versionedFileName);
    const latestPath = path.join(__dirname, 'uploads', 'app-release.apk');

    // Save the versioned file
    fs.renameSync(tempPath, versionedPath);

    // Copy to the active release (app-release.apk)
    fs.copyFileSync(versionedPath, latestPath);

    // Save to the upload history database collection
    const release = new ApkRelease({
      versionName,
      fileName: versionedFileName,
      sizeBytes: req.file.size,
      uploadedAt: new Date(),
    });
    await release.save();

    console.log(`✅ New APK v${versionName} uploaded. Copied to uploads/app-release.apk`);
    res.status(200).json({ 
      message: `APK version ${versionName} uploaded and published successfully!`, 
      release,
      url: `https://plow-strangle-edition.ngrok-free.dev/uploads/${versionedFileName}` 
    });
  } catch (error) {
    console.error("❌ APK Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Get APK upload history list
app.get('/api/admin/apk-releases', async (req, res) => {
  try {
    const releases = await ApkRelease.find().sort({ uploadedAt: -1 });
    res.status(200).json(releases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Admin API - Get all live drivers for admin panel
app.get('/api/admin/live-drivers', async (req, res) => {
  try {
    const activeList = Object.values(activeDrivers);
    
    if (activeList.length === 0) {
      // FALLBACK: Return registered approved drivers with random coordinates
      const registeredDrivers = await User.find({ isRegistered: true, status: 'active' }).limit(10);
      const mockFormatted = registeredDrivers.map((driver) => ({
        id: driver.uid,
        name: driver.fullName || 'Unknown Driver',
        autoVariant: driver.selectedVehicle || 'Auto',
        lat: 12.9500 + (Math.random() - 0.5) * 0.1,
        lng: 80.1000 + (Math.random() - 0.5) * 0.1,
        profileImage: driver.profileImageUrl || 'https://via.placeholder.com/150'
      }));
      return res.status(200).json(mockFormatted);
    }

    const formattedDrivers = [];
    for (const active of activeList) {
      if (active.driverUid) {
        const driver = await User.findOne({ uid: active.driverUid });
        formattedDrivers.push({
          id: active.driverUid,
          name: driver?.fullName || 'Unknown Driver',
          autoVariant: driver?.selectedVehicle || 'Auto',
          lat: active.lat,
          lng: active.lng,
          profileImage: driver?.profileImageUrl || 'https://via.placeholder.com/150'
        });
      }
    }
    res.status(200).json(formattedDrivers);
  } catch (error) {
    console.error('Error fetching live drivers:', error);
    res.status(500).json({ error: error.message });
  }
});



function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// =====================================================
// 🚗 VEHICLE HIERARCHY — Driver can accept which ride types?
// compact auto  → compact auto only
// maxima auto   → compact auto + maxima auto
// XL Auto       → compact auto + maxima auto + XL Auto (all)
// =====================================================
function canDriverAcceptRide(driverVehicleType, rideVehicleType) {
  const d = (driverVehicleType || 'compact auto').toLowerCase().trim();
  const r = (rideVehicleType  || 'compact auto').toLowerCase().trim();
  if (d === 'xl auto')     return true;                                   // XL accepts all
  if (d === 'maxima auto') return r === 'compact auto' || r === 'maxima auto'; // maxima accepts 2
  if (d === 'compact auto') return r === 'compact auto';                  // compact accepts only compact
  return d === r; // fallback: exact match
}

// =====================================================
// 📊 NEARBY VARIANTS API — Customer ride selection screen
// GET /api/nearby-variants?lat=X&lng=Y
// Returns per-variant: count of available drivers + nearest driver distance (km) + ETA (mins)
// =====================================================
app.get('/api/nearby-variants', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng required' });
  }

  // Variant buckets: count + nearest distance per variant
  const buckets = {
    'compact auto': { count: 0, nearestKm: null },
    'maxima auto':  { count: 0, nearestKm: null },
    'XL Auto':      { count: 0, nearestKm: null },
  };

  Object.values(activeDrivers).forEach(driver => {
    if (!driver.lat || !driver.lng) return;
    const dist = getDistance(lat, lng, driver.lat, driver.lng);
    if (dist > 2.0) return; // outside 2km radius

    const rawType = driver.vehicleType || 'compact auto';
    const typeLower = rawType.toLowerCase().trim();

    // Each driver is counted for ALL ride types they can accept (hierarchy)
    // compact auto driver → adds to compact auto bucket only
    // maxima auto driver  → adds to compact auto + maxima auto buckets
    // XL Auto driver      → adds to all 3 buckets
    const addToBucket = (bucketKey) => {
      buckets[bucketKey].count++;
      if (buckets[bucketKey].nearestKm === null || dist < buckets[bucketKey].nearestKm) {
        buckets[bucketKey].nearestKm = dist;
      }
    };

    if (typeLower === 'compact auto') {
      addToBucket('compact auto');
    } else if (typeLower === 'maxima auto') {
      addToBucket('compact auto');
      addToBucket('maxima auto');
    } else if (typeLower === 'xl auto') {
      addToBucket('compact auto');
      addToBucket('maxima auto');
      addToBucket('XL Auto');
    }
  });

  // Calculate ETA: avg auto city speed ≈ 20 km/h → 1km = 3 mins
  // etaMins = ceil(nearestKm / 20 * 60) = ceil(nearestKm * 3)
  const result = {};
  for (const [key, val] of Object.entries(buckets)) {
    const etaMins = val.nearestKm !== null
      ? Math.max(1, Math.ceil(val.nearestKm * 3))
      : null;
    result[key] = {
      count:      val.count,
      nearestKm:  val.nearestKm !== null ? parseFloat(val.nearestKm.toFixed(2)) : null,
      etaMins:    etaMins,   // null if no driver available
    };
  }

  console.log(`📊 /api/nearby-variants at (${lat.toFixed(4)}, ${lng.toFixed(4)}):`, JSON.stringify(result));
  res.status(200).json({ variants: result });
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Identify driver — preserve existing lat/lng if already tracked
  socket.on('identifyDriver', (data) => {
    const driverUid = data?.driverUid || data?.driverId || '';
    const isOffDuty = data?.isOffDuty ?? false;

    if (isOffDuty) {
      delete activeDrivers[socket.id];
      console.log(`✅ Driver identified (OFF DUTY, skipped active list): ${socket.id} uid=${driverUid}`);
      return;
    }

    const existing = activeDrivers[socket.id];
    // Preserve existing location if already tracked, otherwise use coordinates from data, falling back to 0
    activeDrivers[socket.id] = {
      lat:         (existing?.lat !== undefined && existing?.lat !== 0) ? existing.lat : (data?.lat || 0),
      lng:         (existing?.lng !== undefined && existing?.lng !== 0) ? existing.lng : (data?.lng || 0),
      driverUid,
      vehicleType: data?.vehicleType || existing?.vehicleType || 'compact auto', // 🆕 Store vehicle type
      startedAt:   (existing?.startedAt) ? existing.startedAt : new Date(),
    };
    console.log(`✅ Driver identified (ON DUTY): ${socket.id} uid=${driverUid} type=${activeDrivers[socket.id].vehicleType} lat=${activeDrivers[socket.id].lat} lng=${activeDrivers[socket.id].lng}`);
  });

  socket.on('goOffDuty', async () => {
    const active = activeDrivers[socket.id];
    if (active && active.startedAt && active.driverUid) {
      const endedAt = new Date();
      const durationSeconds = Math.round((endedAt - active.startedAt) / 1000);
      try {
        await User.findOneAndUpdate(
          { uid: active.driverUid },
          {
            $push: {
              dutyHistory: {
                startedAt: active.startedAt,
                endedAt: endedAt,
                durationSeconds: durationSeconds
              }
            }
          }
        );
        console.log(`Saved duty session for driver ${active.driverUid}: ${durationSeconds} seconds`);
      } catch (err) {
        console.error("Error saving duty history:", err.message);
      }
    }
    delete activeDrivers[socket.id];
    console.log(`🔴 Driver OFF DUTY: ${socket.id}`);
  });

  // ── Public Driver Dashboard Socket Events ──
  socket.on('joinPublicDashboard', () => {
    const drivers = Object.values(activePublicDrivers);
    socket.emit('publicDriversList', drivers);
    console.log(`Socket ${socket.id} joined public dashboard. Sent ${drivers.length} drivers.`);
  });

  socket.on('updatePublicDriverLocation', (locationData) => {
    const driverUid = locationData.driverUid || '';
    const lat = locationData.lat;
    const lng = locationData.lng;
    if (!driverUid) return;

    activePublicDrivers[driverUid] = {
      driverUid,
      lat,
      lng,
      socketId: socket.id,
      updatedAt: Date.now()
    };

    io.emit('publicDriverLocationUpdate', { driverUid, lat, lng });
    io.emit('publicDriversCount', Object.keys(activePublicDrivers).length);
    console.log(`📍 Public Driver location: ${driverUid} → ${lat}, ${lng}`);
  });

  socket.on('goPublicOffline', (data) => {
    const driverUid = data?.driverUid;
    if (driverUid && activePublicDrivers[driverUid]) {
      delete activePublicDrivers[driverUid];
      io.emit('publicDriverOffline', { driverUid });
      io.emit('publicDriversCount', Object.keys(activePublicDrivers).length);
      console.log(`🔴 Public Driver OFFLINE: ${driverUid}`);
    }
  });

  socket.on('updateDriverLocation', (locationData) => {
    const lat = locationData.lat;
    const lng = locationData.lng;
    // Always update — create entry if missing (handles reconnect case)
    if (activeDrivers[socket.id]) {
      activeDrivers[socket.id].lat = lat;
      activeDrivers[socket.id].lng = lng;
      if (locationData.vehicleType) {
        activeDrivers[socket.id].vehicleType = locationData.vehicleType; // 🆕 Keep type fresh
      }
    } else {
      // Driver sent location but identifyDriver wasn't called yet — register them
      activeDrivers[socket.id] = {
        lat, lng,
        driverUid:   locationData.driverUid || '',
        vehicleType: locationData.vehicleType || 'compact auto', // 🆕
      };
    }
    console.log(`📍 Driver location: ${socket.id} → ${lat}, ${lng} type=${activeDrivers[socket.id]?.vehicleType}`);
    locationData.socketId    = socket.id;
    locationData.vehicleType = activeDrivers[socket.id]?.vehicleType || 'compact auto'; // 🆕 Broadcast type
    socket.broadcast.emit('driverLocationUpdate', locationData);
  });

  // =====================================================
  // GET NEARBY DRIVERS (For initial map load / camera move)
  // =====================================================
  socket.on('getNearbyDrivers', (data) => {
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    Object.keys(activeDrivers).forEach(id => {
      const driver = activeDrivers[id];
      if (driver.lat && driver.lng) {
        const dist = getDistance(lat, lng, driver.lat, driver.lng);
        if (dist <= 3.0) { // 3km radius
          socket.emit('driverLocationUpdate', {
            socketId: id,
            lat: driver.lat,
            lng: driver.lng,
            vehicleType: driver.vehicleType || 'compact auto',
            driverUid: driver.driverUid || ''
          });
        }
      }
    });
  });

  // ── requestRide ──────────────────────────────────────────────────────────────
  socket.on('requestRide', async (rideData) => {
    const rideId = rideData.rideId || rideData.id;
    if (!rideId) return;

    // Fetch customer details from MongoDB
    let customerName = 'Customer';
    let customerPhone = '';
    try {
      const custId = rideData.userId || rideData.customerId || '';
      if (custId) {
        const customer = await Customer.findOne({ uid: custId });
        if (customer) {
          customerName = customer.fullName || 'Customer';
          customerPhone = customer.phone || '';
        }
      }
    } catch (err) {
      console.error('❌ Error fetching customer details in requestRide:', err.message);
    }

    // Attach details to rideData
    rideData.customerName = customerName;
    rideData.customerPhone = customerPhone;

    // Track search sessions to prevent overlapping retry loops
    const isRetry = !!rides[rideId];
    if (!rides[rideId]) {
      rides[rideId] = { status: 'requested', searchId: 0, ...rideData };
    } else {
      rides[rideId] = { ...rides[rideId], ...rideData, status: 'requested' };
      rides[rideId].searchId = (rides[rideId].searchId || 0) + 1;
    }
    const currentSearchId = rides[rideId].searchId;

    // Persist to MongoDB
    try {
      await Ride.findOneAndUpdate(
        { rideId },
        {
          rideId,
          customerId:   rideData.userId || rideData.customerId || '',
          customerName: customerName,
          customerPhone: customerPhone,
          pickup:       rideData.pickup || '',
          drop:         rideData.drop || '',
          fare:         rideData.fare || '₹0',
          distance:     rideData.distance || '',
          lat:          rideData.lat     || 0,
          lng:          rideData.lng     || 0,
          dropLat:      rideData.dropLat || 0,
          dropLng:      rideData.dropLng || 0,
          otp:          rideData.otp || '',
          vehicleType:  rideData.vehicleType || '',
          promoApplied: rideData.promoApplied || false,
          promoDiscount: rideData.promoDiscount || 0,
          status:       'requested',
          createdAt:    new Date(),
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Ride ${rideId} saved to DB (requested, searchId: ${currentSearchId}) dropLat=${rideData.dropLat} dropLng=${rideData.dropLng}`);
    } catch (err) {
      console.error('❌ DB save requestRide error:', err.message);
    }

    const pLat = rideData.lat;
    const pLng = rideData.lng;
    const requestedVehicleType = rideData.vehicleType || 'compact auto';

    // 🆕 Filter by: distance ≤ 2km AND driver can accept this ride type (hierarchy logic)
    let nearby = Object.keys(activeDrivers)
      .map(id => ({
        id:          id,
        dist:        getDistance(pLat, pLng, activeDrivers[id].lat, activeDrivers[id].lng),
        vehicleType: activeDrivers[id].vehicleType || 'compact auto',
      }))
      .filter(d =>
        d.dist <= 2.0 &&
        canDriverAcceptRide(d.vehicleType, requestedVehicleType)
      )
      .sort((a, b) => a.dist - b.dist);

    console.log(`[Ride ${rideId}] vehicleType="${requestedVehicleType}" | eligible drivers within 2km: ${nearby.length}`);

    let index = 0;
    function sendToNext() {
      if (!rides[rideId] || rides[rideId].status !== 'requested') {
        console.log(`[Ride ${rideId}] sendToNext stopped: status=${rides[rideId]?.status || 'undefined'}`);
        return;
      }
      if (rides[rideId].searchId !== currentSearchId) {
        console.log(`[Ride ${rideId}] sendToNext stopped: searchId mismatch`);
        return;
      }
      if (index >= nearby.length) {
        console.log(`[Ride ${rideId}] sendToNext finished: sent to all ${nearby.length} eligible drivers`);
        return;
      }
      const driverId = nearby[index].id;
      console.log(`[Ride ${rideId}] 🚀 Sending to driver ${driverId} (${index + 1}/${nearby.length}, ${nearby[index].dist.toFixed(2)} km, type=${nearby[index].vehicleType})`);
      io.to(driverId).emit('newRideRequest', rideData);
      index++;
      setTimeout(sendToNext, 2000); // 2 seconds between drivers
    }
    if (nearby.length > 0) sendToNext();

    // Automatic 1-minute server-side timeout from the start (only on first request)
    if (!isRetry) {
      setTimeout(async () => {
        if (rides[rideId] && rides[rideId].status === 'requested') {
          rides[rideId].status = 'timeout';
          io.emit('rideTimedOut', { rideId, status: 'timeout' });
          io.emit('rideCanceled', { rideId, status: 'timeout' }); // notify driver apps to clear
          delete rides[rideId];
          try {
            await Ride.findOneAndUpdate(
              { rideId },
              { status: 'timeout', canceledAt: new Date() }
            );
            console.log(`⏱️ Ride ${rideId} status → timeout (server-side automatic after 60s)`);
          } catch (err) {
            console.error('❌ DB update auto-timeout error:', err.message);
          }
        }
      }, 60000);
    }
    
    // Log for debugging
    console.log(`🔍 requestRide: ${nearby.length} drivers found within 2km for ride ${rideId}`);
    console.log(`📋 All active drivers:`, JSON.stringify(Object.keys(activeDrivers).map(id => ({
      id, lat: activeDrivers[id].lat, lng: activeDrivers[id].lng, uid: activeDrivers[id].driverUid
    }))));
  });

  // ── acceptRide ───────────────────────────────────────────────────────────────
  socket.on('acceptRide', async (data) => {
    const rideId = data.rideId || data.id;
    
    // Check local memory first to fail fast
    if (!rides[rideId] || rides[rideId].status !== 'requested') {
      socket.emit('rideAcceptedByOther', { rideId });
      return;
    }

    try {
      // Atomic database update using query constraints to prevent race conditions
      const updatedRide = await Ride.findOneAndUpdate(
        { rideId, status: 'requested' },
        {
          status:         'accepted',
          driverUid:      data.driverUid || '',
          driverSocketId: socket.id,
          driverName:     data.driverName || '',
          vehicleNumber:  data.vehicleNumber || '',
          customerName:   (rides[rideId] && rides[rideId].customerName) || 'Customer',
          customerPhone:  (rides[rideId] && rides[rideId].customerPhone) || '',
          acceptedAt:     new Date(),
        },
        { new: true }
      );

      // If updatedRide is null, it means another driver's request completed the update first
      if (!updatedRide) {
        console.log(`⚠️ Race condition: Driver ${data.driverName} tried to accept ride ${rideId} but it was already taken.`);
        if (rides[rideId]) rides[rideId].status = 'accepted';
        socket.emit('rideAcceptedByOther', { rideId });
        return;
      }

      // STRICT DB CHECK: Query the database and verify the write was successful
      if (updatedRide.status === 'accepted' && updatedRide.driverUid === data.driverUid) {
        console.log(`🔍 Database Verified: Ride ${rideId} successfully assigned to driver ${data.driverName} in DB.`);
        
        // ✅ FIX: Include ALL ride data (coordinates + drop info) in confirmationData
        // This ensures TripDetailsScreen and DropLocationScreen get the correct locations
        const rideCache = rides[rideId];
        const driverData = await User.findOne({ uid: updatedRide.driverUid });
        
        const confirmationData = {
          // Identity
          id:            rideId,
          rideId:        rideId,
          driverUid:     updatedRide.driverUid,
          driverName:    updatedRide.driverName,
          vehicleNumber: updatedRide.vehicleNumber,
          profileImageUrl: driverData ? driverData.profileImageUrl : '',
          phone:         driverData ? driverData.phone : '',
          // Customer info
          customerId:    rideCache.userId || rideCache.customerId || '',
          userId:        rideCache.userId || rideCache.customerId || '',
          customerName:  rideCache.customerName  || 'Customer',
          customerPhone: rideCache.customerPhone || '',
          // Pickup info (for TripDetailsScreen map & navigation)
          pickup:        rideCache.pickup  || '',
          lat:           rideCache.lat     || updatedRide.lat     || 0,
          lng:           rideCache.lng     || updatedRide.lng     || 0,
          // Drop info (for DropLocationScreen map & navigation) ✅
          drop:          rideCache.drop    || '',
          dropLat:       rideCache.dropLat || updatedRide.dropLat || 0,
          dropLng:       rideCache.dropLng || updatedRide.dropLng || 0,
          // Trip details
          fare:          rideCache.fare     || updatedRide.fare     || '₹0',
          distance:      rideCache.distance || updatedRide.distance || '',
          otp:           rideCache.otp      || updatedRide.otp      || '',
          vehicleType:   rideCache.vehicleType || updatedRide.vehicleType || (driverData ? driverData.selectedVehicle : ''),
          promoApplied:  rideCache.promoApplied || false,
          promoDiscount: rideCache.promoDiscount || 0,
        };

        rides[rideId].status = 'accepted';
        io.emit('rideAccepted', confirmationData);
        socket.broadcast.emit('rideAcceptedByOther', { rideId });
        console.log(`✅ Ride ${rideId} → accepted by ${data.driverName} | pickup=(${confirmationData.lat},${confirmationData.lng}) drop=(${confirmationData.dropLat},${confirmationData.dropLng})`);
      } else {
        console.log(`❌ Database Verification Failed for ride ${rideId}. Mismatch detected.`);
        socket.emit('rideAcceptedByOther', { rideId });
      }
    } catch (err) {
      console.error('❌ DB update acceptRide error:', err.message);
    }
  });

  // ── rideStarted ──────────────────────────────────────────────────────────────
  socket.on('rideStarted', async (data) => {
    const rideId = data.rideId;
    if (rides[rideId]) rides[rideId].status = 'started';
    socket.broadcast.emit('rideStartedNotification', data);

    try {
      await Ride.findOneAndUpdate(
        { rideId },
        { status: 'started', startedAt: new Date() }
      );
      console.log(`✅ Ride ${rideId} status → started`);
    } catch (err) {
      console.error('❌ DB update rideStarted error:', err.message);
    }
  });

  // ── rideFinished ─────────────────────────────────────────────────────────────
  socket.on('rideFinished', async (data) => {
    const rideId = data.rideId;
    if (rides[rideId]) rides[rideId].status = 'finished';
    io.emit('rideFinished', { rideId, status: 'finished' });
    delete rides[rideId];

    try {
      const ride = await Ride.findOneAndUpdate(
        { rideId },
        { status: 'finished', finishedAt: new Date() },
        { new: true }
      );
      console.log(`✅ Ride ${rideId} status → finished`);

      // Save earnings to driver's trip history in User collection
      if (ride && ride.driverUid) {
        let driver = await User.findOneAndUpdate(
          { uid: ride.driverUid },
          {
            $push: {
              tripHistory: {
                $each: [{
                  rideId:        rideId,
                  customerId:    ride.customerId,
                  pickup:        ride.pickup,
                  drop:          ride.drop,
                  fare:          ride.fare,
                  distance:      ride.distance,
                  vehicleType:   ride.vehicleType,
                  completedAt:   new Date(),
                }],
                $slice: -100,  // keep last 100 trips
              }
            }
          },
          { new: true }
        );
        console.log(`✅ Earnings saved for driver ${ride.driverUid}`);

        // --- Azhai Auto Pass Logic ---
        if (driver) {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          
          const todaysTrips = await Ride.countDocuments({
             driverUid: driver.uid,
             status: 'finished',
             finishedAt: { $gte: startOfToday }
          });

          const todayDateString = startOfToday.toISOString().split('T')[0];

          if (todaysTrips > 3 && driver.lastAutoPassDate !== todayDateString) {
             driver.walletBalance = (driver.walletBalance || 0) - 10;
             driver.lastAutoPassDate = todayDateString;
             if (!driver.walletTransactions) driver.walletTransactions = [];
             driver.walletTransactions.push({
               amount: -10,
               description: "Azhai Auto Pass: 10 points deducted for >3 trips today",
               date: new Date()
             });
             await driver.save();
             console.log(`📉 Azhai Auto Pass applied for driver ${driver.uid} (Trip #${todaysTrips} today)`);
          }
        }
        
        // --- Promo Earn Logic ---
        if (driver && ride.promoApplied) {
           const pointsToAdd = parseInt(ride.promoDiscount, 10) || 20;
           driver.promoTripsPoints = (driver.promoTripsPoints || 0) + pointsToAdd;
           driver.walletBalance = (driver.walletBalance || 0) + pointsToAdd;
           if (!driver.walletTransactions) driver.walletTransactions = [];
           driver.walletTransactions.push({
             amount: ride.promoDiscount || 20,
             description: `Earned ${ride.promoDiscount || 20} points from Customer Promo on Ride ${ride.rideId}`,
             date: new Date()
           });
           await driver.save();
           console.log(`💰 Driver ${driver.uid} earned ${ride.promoDiscount || 20} points from customer promo.`);
        }
      }

      // --- Customer Promo Deduction Logic ---
      if (ride && ride.promoApplied) {
        const custId = ride.customerId || ride.userId;
        if (custId) {
          const cust = await Customer.findOne({ uid: custId });
          const discountToApply = ride.promoDiscount || 20;
          if (cust && cust.promoPoints >= discountToApply) {
            cust.promoPoints -= discountToApply;
            cust.promoTripsUsed = (cust.promoTripsUsed || 0) + 1;
            await cust.save();
            console.log(`⭐ Customer ${custId} deducted ${discountToApply} promo points for completed Ride ${rideId}. Remaining: ${cust.promoPoints}`);
          }
        }
      }
    } catch (err) {
      console.error('❌ DB update rideFinished error:', err.message);
    }
  });

  // ── cancelRide ───────────────────────────────────────────────────────────────
  socket.on('cancelRide', async (data) => {
    const rideId = data.rideId;
    const reason = data.reason || '';
    const source = data.source || 'admin';
    if (rides[rideId]) {
      rides[rideId].status = 'canceled';
      rides[rideId].cancelReason = reason;
    }
    io.emit('rideCanceled', { rideId, status: 'canceled', reason, source });
    delete rides[rideId];

    try {
      await Ride.findOneAndUpdate(
        { rideId },
        { 
          status: 'canceled', 
          canceledAt: new Date(),
          cancelReason: reason
        }
      );
      console.log(`✅ Ride ${rideId} status → canceled (Reason: ${reason})`);
    } catch (err) {
      console.error('❌ DB update cancelRide error:', err.message);
    }
  });

  // ── timeoutRide ──────────────────────────────────────────────────────────────
  socket.on('timeoutRide', async (data) => {
    const rideId = data.rideId;
    if (rides[rideId]) {
      rides[rideId].status = 'timeout';
      delete rides[rideId];
    }
    io.emit('rideTimedOut', { rideId, status: 'timeout' });
    io.emit('rideCanceled', { rideId, status: 'timeout' }); // notify driver app
    try {
      await Ride.findOneAndUpdate(
        { rideId, status: 'requested' }, // only update if currently requested
        { status: 'timeout', canceledAt: new Date() }
      );
      console.log(`✅ Ride ${rideId} status → timeout (client-initiated)`);
    } catch (err) {
      console.error('❌ DB update timeoutRide error:', err.message);
    }
  });

  socket.on('driverArrived', (data) => {
    socket.broadcast.emit('driverArrivedAtPickup', data);
  });

  // =====================================================
  // CHAT EVENTS (In-memory for active rides)
  // =====================================================
  socket.on('sendMessage', (data) => {
    const { rideId, sender, text, timestamp } = data;
    if (rides[rideId]) {
      if (!rides[rideId].chat) rides[rideId].chat = [];
      const msgId = Date.now().toString(); // unique ID
      const message = { id: msgId, sender, text, timestamp: timestamp || new Date(), status: 'sent' };
      rides[rideId].chat.push(message);
      
      // Emit to the other party (customer or driver app)
      io.emit('receiveMessage', { rideId, message }); // simple broadcast, client filters by rideId
    }
  });

  socket.on('getChatHistory', (data) => {
    const { rideId } = data;
    if (rides[rideId] && rides[rideId].chat) {
      socket.emit('chatHistory', { rideId, chat: rides[rideId].chat });
    }
  });

  socket.on('messageRead', (data) => {
    const { rideId, messageId } = data;
    if (rides[rideId] && rides[rideId].chat) {
      const msg = rides[rideId].chat.find(m => m.id === messageId);
      if (msg) {
        msg.status = 'read';
        io.emit('messageStatusUpdated', { rideId, messageId, status: 'read' });
      }
    }
  });

  socket.on('disconnect', async () => {
    const active = activeDrivers[socket.id];
    if (active && active.startedAt && active.driverUid) {
      const endedAt = new Date();
      const durationSeconds = Math.round((endedAt - active.startedAt) / 1000);
      try {
        await User.findOneAndUpdate(
          { uid: active.driverUid },
          {
            $push: {
              dutyHistory: {
                startedAt: active.startedAt,
                endedAt: endedAt,
                durationSeconds: durationSeconds
              }
            }
          }
        );
        console.log(`Saved duty session on disconnect for driver ${active.driverUid}: ${durationSeconds} seconds`);
      } catch (err) {
        console.error("Error saving duty history on disconnect:", err.message);
      }
    }
    delete activeDrivers[socket.id];
    
    // Clean up from activePublicDrivers
    for (const [driverUid, driverData] of Object.entries(activePublicDrivers)) {
      if (driverData.socketId === socket.id) {
        delete activePublicDrivers[driverUid];
        io.emit('publicDriverOffline', { driverUid });
        io.emit('publicDriversCount', Object.keys(activePublicDrivers).length);
        console.log(`Cleaned up public driver on disconnect: ${driverUid}`);
      }
    }
    
    io.emit('driverOffline', { socketId: socket.id });
    console.log('Client disconnected:', socket.id);
  });
});

// =====================================================
// 🚖 ACTIVE RIDE QUERY — App restart recovery
// =====================================================

// Customer: get their active ride
app.get('/ride/active-customer/:uid', async (req, res) => {
  try {
    const ride = await Ride.findOne({
      customerId: req.params.uid,
      $or: [
        { status: { $in: ['requested', 'accepted', 'started'] } },
        { status: 'finished', isCustomerRated: { $ne: true } }
      ]
    }).sort({ createdAt: -1 });
    res.status(200).json({ ride: ride || null });
  } catch (err) {
    console.error('❌ active-customer error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Customer: rate a finished ride
app.post('/ride/:rideId/rate', async (req, res) => {
  try {
    const { rating, ratingReason } = req.body;
    const ride = await Ride.findOneAndUpdate(
      { rideId: req.params.rideId },
      { 
        isCustomerRated: true,
        rating: rating || 0,
        ratingReason: ratingReason || ''
      },
      { new: true }
    );
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    res.status(200).json({ message: 'Rating saved successfully', ride });
  } catch (err) {
    console.error('❌ rate-ride error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Driver: get their active ride
app.get('/ride/active-driver/:uid', async (req, res) => {
  try {
    const ride = await Ride.findOne({
      driverUid: req.params.uid,
      status: { $in: ['accepted', 'started'] }
    }).sort({ acceptedAt: -1 });
    
    if (ride) {
      let customerName = ride.customerName || 'Customer';
      let customerPhone = ride.customerPhone || '';
      if ((!customerPhone || customerName === 'Customer') && ride.customerId) {
        const customer = await Customer.findOne({ uid: ride.customerId });
        if (customer) {
          customerName = customer.fullName || 'Customer';
          customerPhone = customer.phone || '';
        }
      }
      
      const rideObj = ride.toObject();
      rideObj.customerName = customerName;
      rideObj.customerPhone = customerPhone;
      return res.status(200).json({ ride: rideObj });
    }
    
    res.status(200).json({ ride: null });
  } catch (err) {
    console.error('❌ active-driver error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// 💰 DRIVER EARNINGS API
// =====================================================
app.get('/driver/:uid/earnings', async (req, res) => {
  try {
    const { uid } = req.params;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const parseFare = (fare) => {
      if (!fare) return 0;
      return parseFloat(fare.toString().replace(/[^0-9.]/g, '')) || 0;
    };

    // Fetch finished rides for this driver
    const allRides = await Ride.find({
      driverUid: uid,
      status: 'finished',
    }).sort({ finishedAt: -1 });

    const todayRides   = allRides.filter(r => r.finishedAt >= todayStart);
    const weekRides    = allRides.filter(r => r.finishedAt >= weekStart);
    const monthRides   = allRides.filter(r => r.finishedAt >= monthStart);

    const sum = (arr) => arr.reduce((acc, r) => acc + parseFare(r.fare), 0);

    // Sum up online hours
    const user = await User.findOne({ uid });
    let totalOnlineSeconds = 0;
    let todayOnlineSeconds = 0;
    if (user && user.dutyHistory) {
      totalOnlineSeconds = user.dutyHistory.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
      todayOnlineSeconds = user.dutyHistory
        .filter(s => s.startedAt >= todayStart)
        .reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    }

    res.status(200).json({
      totalTrips: allRides.length,
      today:  { trips: todayRides.length,  earnings: sum(todayRides)  },
      week:   { trips: weekRides.length,   earnings: sum(weekRides)   },
      month:  { trips: monthRides.length,  earnings: sum(monthRides)  },
      totalOnlineSeconds,
      todayOnlineSeconds,
      recent: allRides.slice(0, 20).map(r => ({
        rideId:      r.rideId,
        pickup:      r.pickup,
        drop:        r.drop,
        fare:        r.fare,
        distance:    r.distance,
        completedAt: r.finishedAt,
      })),
    });
  } catch (err) {
    console.error('❌ earnings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// 🟢 CUSTOMER ROUTES - Driver code-ஐ தொடவில்லை!
// =====================================================

// Customer Schema - 'customers' என்ற தனி collection-ல் save ஆகும்
const customerSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  fullName: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  profileImageUrl: { type: String, default: '' },
  isRegistered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  referralCode: { type: String, unique: true, sparse: true },
  isReferralUsed: { type: Boolean, default: false },
  promoPoints: { type: Number, default: 0 },
  promoTripsUsed: { type: Number, default: 0 },
  // 🚖 Trip History - max 10, oldest auto-deleted
  tripHistory: [
    {
      driverUid:    { type: String },
      driverName:   { type: String },
      vehicleNumber:{ type: String },
      autoType:     { type: String },
      driverPhone:  { type: String },
      pickup:       { type: String },
      drop:         { type: String },
      fare:         { type: String },
      distance:     { type: String },
      completedAt:  { type: Date, default: Date.now }
    }
  ],
  // 📍 Pickup Location History - max 10, oldest auto-deleted
  pickupHistory: [
    {
      address:  { type: String },
      lat:      { type: Number },
      lng:      { type: Number },
      savedAt:  { type: Date, default: Date.now }
    }
  ],
  // 🏠 Saved Locations (Home, Work, Gym, custom)
  savedLocations: [
    {
      label:     { type: String },   // 'Home', 'Work', 'Gym', or custom
      icon:      { type: String },   // icon name string for Flutter
      address:   { type: String },
      lat:       { type: Number },
      lng:       { type: Number },
      updatedAt: { type: Date, default: Date.now }
    }
  ],
  // 🗑️ Account Deletion Tracking (soft-delete, like Rapido)
  isDeleted:    { type: Boolean, default: false },
  deleteReason: { type: String, default: '' },
  deletedAt:    { type: Date },
});

const Customer = mongoose.model('Customer', customerSchema);

// 🟢 Customer Register / Update API
// Flutter app இருந்து POST /customer/register என்று call செய்யும்
app.post('/customer/register', async (req, res) => {
  console.log("📥 Customer registration data received...");
  try {
    const { uid, fullName, phone, email } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }

    let existingCustomer = await Customer.findOne({ uid: uid });
    let referralCode = existingCustomer?.referralCode;

    if (!referralCode) {
      const namePart = (fullName || 'CUS').substring(0, 3).toUpperCase();
      const phonePart = (phone || '000').slice(-3);
      referralCode = `${namePart}${phonePart}${Math.floor(10 + Math.random() * 90)}`;
    }

    const customer = await Customer.findOneAndUpdate(
      { uid: uid },
      { 
        uid, fullName, phone, email, isRegistered: true, isDeleted: false,
        referralCode: referralCode // ALWAYS SET IT SO OLD USERS GET IT TOO
      },
      { upsert: true, new: true }
    );

    console.log("✅ Customer registered successfully! UID:", uid);
    res.status(200).json({ message: "Customer registered successfully!", customer });
  } catch (error) {
    console.error("❌ Customer Register Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🟢 Customer Profile Fetch API
// Flutter app இருந்து GET /customer/:uid என்று call செய்யும்
app.get('/customer/:uid', async (req, res) => {
  try {
    const customer = await Customer.findOne({ uid: req.params.uid });
    if (customer) {
      res.status(200).json(customer);
    } else {
      res.status(200).json({ isRegistered: false });
    }
  } catch (error) {
    console.error("❌ Customer Fetch Error:", error);
    res.status(500).json({ error: error.message }); 
  }
});

// 🟢 Customer Profile Update API (பெயர், email மாற்ற)
// Flutter app இருந்து PUT /customer/:uid என்று call செய்யும்
app.put('/customer/:uid', async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { uid: req.params.uid },
      { fullName, email },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    console.log("✅ Customer updated! UID:", req.params.uid);
    res.status(200).json({ message: "Customer updated successfully!", customer });
  } catch (error) {
    console.error("❌ Customer Update Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// 🚖 DRIVER DETAILS API — Customer app fetches driver info
// =====================================================
// GET /driver-details/:uid — Driver UID கொண்டு driver details fetch செய்யும்
app.get('/driver-details/:uid', async (req, res) => {
  try {
    const driver = await User.findOne({ uid: req.params.uid })
      .select('uid fullName phone selectedVehicle vehicleNumber profileImageUrl');
    if (driver) {
      res.status(200).json(driver);
    } else {
      res.status(404).json({ error: 'Driver not found' });
    }
  } catch (error) {
    console.error('❌ Driver Details Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// 📦 SAVE TRIP HISTORY — Trip finish ஆனால் call ஆகும்
// =====================================================
// POST /customer/:uid/save-trip
app.post('/customer/:uid/save-trip', async (req, res) => {
  try {
    const { uid } = req.params;
    const { tripData, pickupData } = req.body;

    const customer = await Customer.findOne({ uid });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // --- Trip History: add new, keep max 10 ---
    if (tripData) {
      customer.tripHistory.push({ ...tripData, completedAt: new Date() });
      if (customer.tripHistory.length > 10) {
        // Oldest first — remove from beginning
        customer.tripHistory = customer.tripHistory.slice(-10);
      }
    }

    // --- Pickup History: add new if not duplicate, keep max 10 ---
    if (pickupData && pickupData.address) {
      // Duplicate check — same address already in last 10?
      const isDuplicate = customer.pickupHistory.some(
        h => h.address === pickupData.address
      );
      if (!isDuplicate) {
        customer.pickupHistory.push({ ...pickupData, savedAt: new Date() });
        if (customer.pickupHistory.length > 10) {
          customer.pickupHistory = customer.pickupHistory.slice(-10);
        }
      }
    }

    await customer.save();
    console.log(`✅ Trip & Pickup history saved for UID: ${uid}`);
    res.status(200).json({
      message: 'History saved!',
      tripCount: customer.tripHistory.length,
      pickupCount: customer.pickupHistory.length
    });
  } catch (error) {
    console.error('❌ Save Trip Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// 📋 GET HISTORY — Profile & Booking page-க்கு
// =====================================================
// GET /customer/:uid/history
app.get('/customer/:uid/history', async (req, res) => {
  try {
    const customer = await Customer.findOne(
      { uid: req.params.uid },
      { tripHistory: 1, pickupHistory: 1 }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Latest first
    const trips   = [...(customer.tripHistory   || [])].reverse();
    const pickups = [...(customer.pickupHistory || [])].reverse();

    res.status(200).json({ tripHistory: trips, pickupHistory: pickups });
  } catch (error) {
    console.error('❌ Get History Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// 🏠 SAVE LOCATION — Home / Work / Gym / Custom
// =====================================================
// POST /customer/:uid/save-location
app.post('/customer/:uid/save-location', async (req, res) => {
  try {
    const { uid } = req.params;
    const { label, icon, address, lat, lng } = req.body;

    if (!label || !address) {
      return res.status(400).json({ error: 'label and address are required' });
    }

    let customer = await Customer.findOne({ uid });
    if (!customer) {
      // Auto-create customer if they don't exist yet
      customer = new Customer({ uid, isRegistered: true, savedLocations: [] });
    }

    // Fallback: if savedLocations is undefined, initialize it
    if (!customer.savedLocations) {
      customer.savedLocations = [];
    }

    // Upsert by label — same label already exists? update it
    const existingIndex = customer.savedLocations.findIndex(
      l => l.label && l.label.toLowerCase() === label.toLowerCase()
    );

    const locationData = { label, icon: icon || 'place', address, lat, lng, updatedAt: new Date() };

    if (existingIndex >= 0) {
      customer.savedLocations[existingIndex] = locationData;
    } else {
      customer.savedLocations.push(locationData);
    }

    await customer.save();
    console.log(`✅ Saved location "${label}" for UID: ${uid}`);
    res.status(200).json({ message: 'Location saved!', savedLocations: customer.savedLocations });
  } catch (error) {
    console.error('❌ Save Location Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /customer/:uid/saved-locations
app.get('/customer/:uid/saved-locations', async (req, res) => {
  try {
    const customer = await Customer.findOne(
      { uid: req.params.uid },
      { savedLocations: 1 }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.status(200).json({ savedLocations: customer.savedLocations || [] });
  } catch (error) {
    console.error('❌ Get Saved Locations Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /customer/:uid/delete-location/:label
app.delete('/customer/:uid/delete-location/:label', async (req, res) => {
  try {
    const { uid, label } = req.params;
    
    // We update the document by pulling the location with the exact case-insensitive label
    // or we can just fetch, filter and save to ensure exact match logic
    const customer = await Customer.findOne({ uid });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    if (customer.savedLocations) {
      customer.savedLocations = customer.savedLocations.filter(
        loc => loc.label.toLowerCase() !== label.toLowerCase()
      );
      await customer.save();
    }
    
    console.log(`✅ Deleted location "${label}" for UID: ${uid}`);
    res.status(200).json({ message: 'Location deleted', savedLocations: customer.savedLocations });
  } catch (error) {
    console.error('❌ Delete Location Error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =====================================================
// 🗑️ DELETE ACCOUNT API — Driver account soft-delete
// =====================================================
// DELETE /driver/:uid/delete-account
app.delete('/driver/:uid/delete-account', async (req, res) => {
  const { uid } = req.params;
  const { reason } = req.body;

  console.log(`🗑️ Delete Account request (Driver): UID=${uid}, Reason="${reason}"`);

  if (!uid) {
    return res.status(400).json({ error: 'uid is required' });
  }

  try {
    // 1️⃣ Soft-delete Driver document
    const driver = await User.findOneAndUpdate(
      { uid },
      {
        isDeleted:    true,
        deleteReason: reason || 'Not specified',
        deletedAt:    new Date(),
      },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // 2️⃣ Cancel driver's active rides (if any)
    const activeRide = await Ride.findOne({
      driverUid: uid,
      status: { $in: ['accepted', 'arrived', 'started'] }
    });

    if (activeRide) {
      activeRide.status = 'canceled';
      activeRide.cancelReason = 'Driver deleted account';
      await activeRide.save();
      
      // Notify customer socket if possible
      io.to(activeRide.rideId).emit('ride_canceled', {
        rideId: activeRide.rideId,
        reason: 'Driver deleted account',
        by: 'driver'
      });
      
      if (rides[activeRide.rideId]) delete rides[activeRide.rideId];
      console.log(`🚗 Active ride ${activeRide.rideId} canceled - driver account deleted`);
    }

    // 3️⃣ Remove from active sockets
    // Find socket.id for this driverUid
    for (const [socketId, activeUid] of Object.entries(activeDrivers)) {
      if (activeUid === uid) {
        delete activeDrivers[socketId];
      }
    }
    if (activePublicDrivers[uid]) {
      delete activePublicDrivers[uid];
    }

    console.log(`✅ Driver Account soft-deleted: UID=${uid}, Reason="${reason}"`);
    
    res.status(200).json({
      message: 'Account deleted successfully',
      deletedAt: driver.deletedAt,
      reason: driver.deleteReason,
    });
  } catch (error) {
    console.error('❌ Delete Account Error (Driver):', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// 🗑️ DELETE ACCOUNT API — Customer account soft-delete
// =====================================================
// DELETE /customer/:uid/delete-account
// Body: { reason: "..." }
// Actions:
//   1. Customer document-ல் isDeleted: true, deleteReason, deletedAt set
//   2. Customer-ன் active rides cancel பண்ணும்
app.delete('/customer/:uid/delete-account', async (req, res) => {
  const { uid } = req.params;
  const { reason } = req.body;

  console.log(`🗑️ Delete Account request: UID=${uid}, Reason="${reason}"`);

  if (!uid) {
    return res.status(400).json({ error: 'uid is required' });
  }

  try {
    // 1️⃣ Soft-delete Customer document
    const customer = await Customer.findOneAndUpdate(
      { uid },
      {
        isDeleted:    true,
        deleteReason: reason || 'Not specified',
        deletedAt:    new Date(),
      },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // 2️⃣ Cancel any active rides belonging to this customer
    const activeRides = await Ride.find({
      customerId: uid,
      status: { $in: ['requested', 'accepted', 'started'] },
    });

    for (const ride of activeRides) {
      await Ride.findOneAndUpdate(
        { rideId: ride.rideId },
        { status: 'canceled', canceledAt: new Date(), cancelReason: 'Customer deleted account' }
      );
      // Notify driver via socket
      io.emit('rideCanceled', {
        rideId: ride.rideId,
        status: 'canceled',
        reason: 'Customer deleted account',
        source: 'customer',
      });
      // Remove from in-memory store
      if (rides[ride.rideId]) delete rides[ride.rideId];
      console.log(`🚫 Active ride ${ride.rideId} canceled — customer account deleted`);
    }

    console.log(`✅ Account soft-deleted: UID=${uid}, Reason="${reason}"`);
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      deletedAt: customer.deletedAt,
      reason: customer.deleteReason,
    });
  } catch (error) {
    console.error('❌ Delete Account Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// 🔚 SERVER START
// =====================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

app.get('/api/fix-wallet', async (req, res) => {
  try {
    const drivers = await User.find({ promoTripsPoints: { $gt: 0 } });
    let fixed = 0;
    for (let d of drivers) {
      const expected = (d.hasReceivedSignupBonus ? 100 : 0) + (d.driverReferralCount || 0) * 10 + (d.customerReferralCount || 0) * 10 + d.promoTripsPoints;
      if (d.walletBalance < expected) {
        d.walletBalance = expected;
        await d.save();
        fixed++;
      }
    }
    res.json({ message: "Fixed " + fixed + " drivers' wallet balances!" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
