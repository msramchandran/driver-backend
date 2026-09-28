const crypto = require('crypto');
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto;
}

const mongoose = require('mongoose');

const mongoURI = 'mongodb+srv://msramchandran2_db_user:LXruemGHHozPvaaF@ramachandrancluster.0jq4kie.mongodb.net/azhai_db?retryWrites=true&w=majority';

mongoose.connect(mongoURI).then(async () => {
  console.log('✅ Connected to MongoDB Atlas');

  // Use strict:false so we can read/write any field without a strict schema
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

  const drivers = await User.find({ status: 'active' });
  console.log('Total active drivers found:', drivers.length);

  let updated = 0;
  for (const driver of drivers) {
    const hasId = driver.autoClickerId && driver.autoClickerId !== '';
    if (!hasId) {
      const newId = 'AZ-CLK-' + Math.floor(1000 + Math.random() * 9000);
      await User.updateOne(
        { _id: driver._id },
        { $set: { autoClickerId: newId, autoClickerTrips: 0, isAutoClickerBlocked: false } }
      );
      console.log('✅ Generated:', newId, '→', driver.fullName || driver.uid);
      updated++;
    } else {
      console.log('⏭️  Already has ID:', driver.autoClickerId, '→', driver.fullName || driver.uid);
    }
  }

  console.log('\n🎉 Migration Complete! Updated:', updated, 'drivers.');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
