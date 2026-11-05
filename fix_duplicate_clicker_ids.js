const crypto = require('crypto');
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto;
}

const mongoose = require('mongoose');

const mongoURI = 'mongodb+srv://msramchandran2_db_user:LXruemGHHozPvaaF@ramachandrancluster.0jq4kie.mongodb.net/azhai_db?retryWrites=true&w=majority';

// Counter schema & model
const clickerCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 10000 },
});
const ClickerCounter = mongoose.model('ClickerCounter', clickerCounterSchema);

// Minimal User model
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  fullName: String,
  phone: String,
  status: String,
  autoClickerId: String,
  createdAt: { type: Date, default: Date.now },
}, { strict: false });
const User = mongoose.model('User', userSchema);

async function initCounter() {
  let counter = await ClickerCounter.findById('clicker_id_seq');
  if (!counter) {
    const users = await User.find(
      { autoClickerId: /^AZ-CLK-\d+$/i },
      { autoClickerId: 1 }
    ).lean();

    let maxNum = 10000;
    for (const u of users) {
      const match = u.autoClickerId && u.autoClickerId.match(/AZ-CLK-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }

    counter = await ClickerCounter.create({ _id: 'clicker_id_seq', seq: maxNum });
    console.log(`[Init] ClickerCounter initialized with seq: ${maxNum}`);
  } else if (counter.seq < 10000) {
    counter.seq = 10000;
    await counter.save();
    console.log(`[Init] ClickerCounter bumped to minimum 10000`);
  }
  return counter;
}

async function generateUniqueId() {
  let counter = await ClickerCounter.findOneAndUpdate(
    { _id: 'clicker_id_seq' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  if (counter.seq < 10000) {
    counter = await ClickerCounter.findOneAndUpdate(
      { _id: 'clicker_id_seq' },
      { $set: { seq: 10001 } },
      { new: true }
    );
  }

  let candidateId = `AZ-CLK-${counter.seq}`;

  let exists = await User.findOne({ autoClickerId: candidateId });
  while (exists) {
    counter = await ClickerCounter.findOneAndUpdate(
      { _id: 'clicker_id_seq' },
      { $inc: { seq: 1 } },
      { new: true }
    );
    candidateId = `AZ-CLK-${counter.seq}`;
    exists = await User.findOne({ autoClickerId: candidateId });
  }

  return candidateId;
}

async function runMigration() {
  const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

  console.log('='.repeat(70));
  console.log(`🚀 AUTO CLICKER ID MIGRATION TOOL ${isDryRun ? '(DRY RUN - NO CHANGES)' : '(LIVE MODE)'}`);
  console.log('='.repeat(70));

  await mongoose.connect(mongoURI);
  console.log('Connected to MongoDB Atlas successfully.');

  await initCounter();

  // Find all users with non-empty autoClickerId
  const users = await User.find(
    { autoClickerId: { $exists: true, $nin: ['', null] } }
  ).lean();

  console.log(`Fetched ${users.length} drivers with autoClickerId.`);

  // Group by autoClickerId
  const groups = new Map();
  for (const user of users) {
    const id = user.autoClickerId.trim();
    if (!groups.has(id)) {
      groups.set(id, []);
    }
    groups.get(id).push(user);
  }

  const duplicates = [];
  for (const [id, userList] of groups.entries()) {
    if (userList.length > 1) {
      duplicates.push({ id, userList });
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicate Auto Clicker IDs found in database! Everything is clean.');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n⚠️ Found ${duplicates.length} duplicate ID group(s):\n`);

  let totalUpdated = 0;
  const auditLog = [];

  for (const dup of duplicates) {
    console.log(`Duplicate ID: "${dup.id}" shared by ${dup.userList.length} drivers:`);

    // Sort by createdAt ascending (earliest registered driver keeps original ID)
    dup.userList.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    // Driver 0 keeps the ID
    const keeper = dup.userList[0];
    console.log(`  [KEEP]  UID: ${keeper.uid} | Name: ${keeper.fullName || 'N/A'} (keeps "${dup.id}")`);

    // Drivers 1..N get new unique IDs
    for (let i = 1; i < dup.userList.length; i++) {
      const driverToUpdate = dup.userList[i];
      const newId = await generateUniqueId();

      auditLog.push({
        uid: driverToUpdate.uid,
        name: driverToUpdate.fullName || 'N/A',
        phone: driverToUpdate.phone || 'N/A',
        oldId: dup.id,
        newId: newId,
      });

      if (!isDryRun) {
        // STRICTLY update ONLY the autoClickerId field:
        await User.updateOne(
          { uid: driverToUpdate.uid },
          { $set: { autoClickerId: newId } }
        );
        console.log(`  [FIXED] UID: ${driverToUpdate.uid} | Name: ${driverToUpdate.fullName || 'N/A'} | Old: "${dup.id}" -> New: "${newId}"`);
      } else {
        console.log(`  [PLANNED] UID: ${driverToUpdate.uid} | Name: ${driverToUpdate.fullName || 'N/A'} | Old: "${dup.id}" -> New: "${newId}" (dry-run)`);
      }
      totalUpdated++;
    }
    console.log('');
  }

  console.log('='.repeat(70));
  if (isDryRun) {
    console.log(`🔍 DRY RUN COMPLETE: ${totalUpdated} duplicate driver(s) would be updated.`);
    console.log('No database changes were made. Run without --dry-run to apply changes.');
  } else {
    console.log(`🎉 MIGRATION COMPLETE: Successfully updated ${totalUpdated} driver(s) with unique IDs.`);
    console.log('Verifying database uniqueness...');

    // Post-migration verification
    const verifyUsers = await User.find(
      { autoClickerId: { $exists: true, $nin: ['', null] } },
      { autoClickerId: 1 }
    ).lean();

    const verifyMap = new Map();
    let remainingDupes = 0;
    for (const u of verifyUsers) {
      verifyMap.set(u.autoClickerId, (verifyMap.get(u.autoClickerId) || 0) + 1);
      if (verifyMap.get(u.autoClickerId) > 1) {
        remainingDupes++;
      }
    }

    if (remainingDupes === 0) {
      console.log('✅ VERIFICATION PASSED: 0 duplicate IDs remain. All drivers now have 100% unique IDs!');
    } else {
      console.warn(`⚠️ Warning: ${remainingDupes} duplicate instances still found.`);
    }
  }
  console.log('='.repeat(70));

  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('Migration failed with error:', err);
  process.exit(1);
});
