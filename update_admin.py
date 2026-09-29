import sys

file = 'server.js'
with open(file, 'r', encoding='utf-8') as f:
    data = f.read()

old_api = '''    const formatted = users.map(user => ({
      id: user.uid,
      name: user.fullName || 'Unknown',
      phone: user.phone || 'N/A',
      clickerId: user.autoClickerId,
      acceptedTrips: user.autoClickerTrips || 0,
      isBlocked: user.isAutoClickerBlocked || false
    }));'''

new_api = '''    const formatted = users.map(user => {
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
    });'''

data = data.replace(old_api, new_api)

with open(file, 'w', encoding='utf-8') as f:
    f.write(data)
