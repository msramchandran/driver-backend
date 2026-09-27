const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/driver_db')
  .then(async () => {
    const db = mongoose.connection.useDb('driver_db');
    const videos = await db.collection('tutorialvideos').find({}).toArray();
    console.log(JSON.stringify(videos, null, 2));
    process.exit(0);
  });
