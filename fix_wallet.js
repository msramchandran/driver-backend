const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://msramchandran2_db_user:LXruemGHHozPvaaF@ramachandrancluster.0jq4kie.mongodb.net/azhai_db?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.useDb('azhai_db');
  const users = db.collection('users');
  const drivers = await users.find({ promoTripsPoints: { $gt: 0 } }).toArray();
  for (let d of drivers) {
    if (d.walletBalance < 100 + d.promoTripsPoints) {
      const expected = (d.hasReceivedSignupBonus ? 100 : 0) + (d.driverReferralCount || 0) * 10 + (d.customerReferralCount || 0) * 10 + d.promoTripsPoints;
      await users.updateOne({ _id: d._id }, { $set: { walletBalance: expected } });
      console.log('Updated UID:', d.uid, 'from', d.walletBalance, 'to', expected);
    }
  }
  console.log('Fixed historical wallet balances!');
  process.exit(0);
}).catch(console.error);
