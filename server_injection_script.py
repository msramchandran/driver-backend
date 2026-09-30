with open('src/pages/AutoClickerManagement.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n  const [editingTrips, setEditingTrips] = useState(null);\n  const [tripValue, setTripValue] = useState(0);')

functions = '''
  const togglePayment = async (driverId) => {
    try {
      await axios.post(`http://43.205.135.3:3000/api/admin/clicker-users/${driverId}/toggle-payment`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling payment', error);
      alert('Failed to update payment status');
    }
  };

  const updateTrips = async (driverId) => {
    try {
      await axios.post(`http://43.205.135.3:3000/api/admin/clicker-users/${driverId}/update-trips`, { trips: tripValue });
      setEditingTrips(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating trips', error);
      alert('Failed to update trips');
    }
  };
'''
text = text.replace('  const toggleBlock = async (driverId) => {', functions + '\n  const toggleBlock = async (driverId) => {')

th_search = '<th className="p-4 font-semibold text-gray-600 text-center">Accepted Trips</th>'
th_replace = '<th className="p-4 font-semibold text-gray-600 text-center">Accepted Trips</th>\n                <th className="p-4 font-semibold text-gray-600 text-center">Payment Status</th>'
text = text.replace(th_search, th_replace)

td_search = '''<td className="p-4 text-center">
                      <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg font-semibold">
                        {user.acceptedTrips}
                      </span>
                    </td>'''

td_replace = '''<td className="p-4 text-center">
                      {editingTrips === user.id ? (
                        <div className="flex items-center gap-2 justify-center">
                          <input type="number" value={tripValue} onChange={(e) => setTripValue(Number(e.target.value))} className="w-16 p-1 border rounded" />
                          <button onClick={() => updateTrips(user.id)} className="px-2 py-1 bg-green-500 text-white rounded text-xs">Save</button>
                          <button onClick={() => setEditingTrips(null)} className="px-2 py-1 bg-gray-500 text-white rounded text-xs">X</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg font-semibold">
                            {user.acceptedTrips}
                          </span>
                          <button onClick={() => { setEditingTrips(user.id); setTripValue(user.acceptedTrips); }} className="text-blue-500 text-xs">Edit</button>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => togglePayment(user.id)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            user.hasPaidForClicker 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          {user.hasPaidForClicker ? 'Paid' : 'Unpaid'}
                        </button>
                        {user.clickerPaymentScreenshot && (
                          <a href={user.clickerPaymentScreenshot} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">View Receipt</a>
                        )}
                      </div>
                    </td>'''
text = text.replace(td_search, td_replace)

with open('src/pages/AutoClickerManagement.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
