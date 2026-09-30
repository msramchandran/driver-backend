import re

with open('lib/main.dart', 'r', encoding='utf-8') as f:
    text = f.read()

anchor = '  Future<void> _checkServiceStatus() async {'
new_methods = '''
  Future<void> _fetchAcceptedTripsFromDB() async {
    if (_driverId == null) return;
    try {
      final response = await http.post(
        Uri.parse('http://43.205.135.3:3000/api/clicker-profile'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'driver_id': _driverId, 'device_id': 'flutter_app'}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          setState(() {
            _totalAccepted = data['profile']['acceptedTrips'] ?? 0;
            _isAppPurchased = data['profile']['hasPaidForClicker'] ?? false;
          });
          _enforcePaywallIfNeeded();
        }
      }
    } catch (_) {}
  }

  void _enforcePaywallIfNeeded() {
    if (_totalAccepted >= 20 && !_isAppPurchased) {
      for (final app in kApps) {
        if (_appEnabled[app.id] == true) {
          _setAppEnabled(app.id, false);
        }
      }
      
      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) {
          bool isUploading = false;
          return StatefulBuilder(
            builder: (context, setDialogState) {
              return WillPopScope(
                onWillPop: () async => false,
                child: AlertDialog(
                  backgroundColor: const Color(0xFF1E1E1E),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  title: const Text('Free Trial Ended', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  content: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'You have completed 20 accepted trips.\\n\\nPlease pay ₹100 via UPI to continue using AutoClicker.\\n',
                          style: TextStyle(color: Colors.white70),
                          textAlign: TextAlign.center,
                        ),
                        Container(
                          decoration: BoxDecoration(border: Border.all(color: Colors.white24, width: 2)),
                          child: Image.asset('assets/images/qr_code.jpg', width: 200, height: 200, fit: BoxFit.cover),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'After paying, upload the screenshot of the success page below for Admin verification.',
                          style: TextStyle(color: Colors.yellow, fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  actions: [
                    isUploading 
                    ? const Padding(
                        padding: EdgeInsets.all(8.0),
                        child: CircularProgressIndicator(),
                      )
                    : ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () async {
                        final picker = ImagePicker();
                        final XFile? image = await picker.pickImage(source: ImageSource.gallery);
                        if (image != null) {
                           setDialogState(() => isUploading = true);
                           try {
                             var request = http.MultipartRequest('POST', Uri.parse('http://43.205.135.3:3000/api/clicker-payment/upload'));
                             request.fields['driver_id'] = _driverId ?? '';
                             request.files.add(await http.MultipartFile.fromPath('screenshot', image.path));
                             var res = await request.send();
                             if (res.statusCode == 200) {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Screenshot sent! Please wait for Admin approval.')));
                             } else {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to upload screenshot.')));
                             }
                           } catch (e) {
                             ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ' + str(e))));
                           }
                           setDialogState(() => isUploading = false);
                        }
                      },
                      icon: const Icon(Icons.upload_file),
                      label: const Text('Upload Screenshot'),
                    ),
                  ],
                ),
              );
            }
          );
        },
      );
    }
  }

  void _unlockApp() async {
    setState(() => _isAppPurchased = true);
    await _channel.invokeMethod('setAppPurchased', {'purchased': true});
    if (mounted && Navigator.canPop(context)) {
      Navigator.pop(context); // Close the dialog
    }
  }

  Future<void> _checkServiceStatus() async {'''

text = text.replace(anchor, new_methods)

with open('lib/main.dart', 'w', encoding='utf-8') as f:
    f.write(text)
