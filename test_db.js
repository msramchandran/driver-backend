const mongoose = require('mongoose');

const mongoURI = 'mongodb+srv://msramchandran2_db_user:LXruemGHHozPvaaF@ramachandrancluster.0jq4kie.mongodb.net/azhai_db?retryWrites=true&w=majority';

const rideSchema = new mongoose.Schema({
  rideId:      { type: String, unique: true },
  driverUid:   { type: String, default: '' },
  customerId:  { type: String, default: '' },
  status:      { type: String, default: 'requested' },
  rating:      { type: Number, default: 0 },
  ratingReason:{ type: String, default: '' }
}, { strict: false });

const Ride = mongoose.model('RideTest', rideSchema, 'rides');

async function test() {
  await mongoose.connect(mongoURI);
  console.log("Connected to MongoDB");
  
  const rides = await Ride.find({ rating: { $gt: 0 } });
  console.log(`Found ${rides.length} rides with rating > 0`);
  rides.forEach(r => {
    console.log(`Ride: ${r.rideId}, DriverUID: ${r.driverUid}, Rating: ${r.rating}, Reason: ${r.ratingReason}`);
  });
  
  const allRides = await Ride.find({});
  console.log(`Total rides in DB: ${allRides.length}`);
  if (allRides.length > 0) {
      console.log(`Sample ride fields:`, Object.keys(allRides[0].toObject()));
  }
  
  process.exit(0);
}

test().catch(console.error);
