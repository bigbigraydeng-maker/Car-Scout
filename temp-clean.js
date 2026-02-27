const fs = require('fs');
const path = require('path');
const authFile = path.join(__dirname, 'auth', 'facebook_auth.json');
if (fs.existsSync(authFile)) {
  fs.unlinkSync(authFile);
  console.log('Removed old auth');
}