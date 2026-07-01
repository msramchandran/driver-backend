const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://msramchandran2_db_user:LXruemGHHozPvaaF@ramachandrancluster.0jq4kie.mongodb.net/azhai_db?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  const rides = await db.collection('rides').find().limit(3).toArray();
  console.log(JSON.stringify(rides, null, 2));
  process.exit();
});
