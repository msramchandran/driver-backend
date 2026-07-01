const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://msramchandran2_db_user:LXruemGHHozPvaaF@ramachandrancluster.0jq4kie.mongodb.net/azhai_db?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  const distinctStatuses = await db.collection('rides').distinct('status');
  console.log("Distinct statuses:", JSON.stringify(distinctStatuses));
  
  // also get count of each
  const counts = await db.collection('rides').aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]).toArray();
  console.log("Counts:", JSON.stringify(counts, null, 2));
  
  process.exit();
});
