/**
 * Send handoff doc to Feishu
 */
var https = require('https');
var fs = require('fs');
var path = require('path');

var APP_ID = 'cli_a917a9e3af391cbb';
var APP_SECRET = 'JbyS6Xdb1ZuMe6BmXbi9XbGByUkzW7HU';
var USER_OPEN_ID = 'ou_0d858408be4697d6e84aa225ed758373';

function req(options, body) {
  return new Promise(function(resolve, reject) {
    var r = https.request(options, function(res) {
      var d = [];
      res.on('data', function(c) { d.push(c); });
      res.on('end', function() {
        try { resolve(JSON.parse(Buffer.concat(d).toString())); }
        catch(e) { resolve(Buffer.concat(d).toString()); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function send(token, text) {
  var MAX = 4000;
  var parts = [];
  if (text.length <= MAX) {
    parts.push(text);
  } else {
    var lines = text.split('\n');
    var cur = '';
    for (var i = 0; i < lines.length; i++) {
      if (cur.length + lines[i].length + 1 > MAX && cur.length > 0) {
        parts.push(cur);
        cur = lines[i];
      } else {
        cur = cur ? cur + '\n' + lines[i] : lines[i];
      }
    }
    if (cur) parts.push(cur);
  }

  for (var p = 0; p < parts.length; p++) {
    var res = await req({
      hostname: 'open.feishu.cn',
      path: '/open-apis/im/v1/messages?receive_id_type=open_id',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    }, {
      receive_id: USER_OPEN_ID,
      msg_type: 'text',
      content: JSON.stringify({ text: parts[p] })
    });
    console.log('Part', p + 1 + '/' + parts.length, res.code === 0 ? 'OK' : 'ERROR ' + res.msg);
    if (p < parts.length - 1) await new Promise(function(r) { setTimeout(r, 1500); });
  }
}

async function run() {
  var tokenRes = await req({
    hostname: 'open.feishu.cn',
    path: '/open-apis/auth/v3/tenant_access_token/internal',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { app_id: APP_ID, app_secret: APP_SECRET });

  if (tokenRes.code !== 0) { console.error('Token failed'); return; }
  var token = tokenRes.tenant_access_token;

  var handoff = fs.readFileSync(path.join(__dirname, '..', 'HANDOFF_TO_TRAE.md'), 'utf8');
  await send(token, handoff);
  console.log('Done');
}

run().catch(function(e) { console.error(e); });
