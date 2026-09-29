const fs = require('fs');
const file = 'server.js';
let data = fs.readFileSync(file, 'utf8');

const oldAPI =     const formatted = users.map(user => ({
      id: user.uid,
      name: user.fullName || 'Unknown',
      phone: user.phone || 'N/A',
      clickerId: user.autoClickerId,
      acceptedTrips: user.autoClickerTrips || 0,
      isBlocked: user.isAutoClickerBlocked || false
    }));;

const newAPI =     const formatted = users.map(user => {
      const roomName = 'clicker_' + user.autoClickerId;
      const isOnline = io.sockets.adapter.rooms.has(roomName) && io.sockets.adapter.rooms.get(roomName).size > 0;
      return {
        id: user.uid,
        name: user.fullName || 'Unknown',
        phone: user.phone || 'N/A',
        clickerId: user.autoClickerId,
        acceptedTrips: user.autoClickerTrips || 0,
        isBlocked: user.isAutoClickerBlocked || false,
        isOnline: isOnline
      };
    });;

data = data.replace(oldAPI, newAPI);
fs.writeFileSync(file, data, 'utf8');
