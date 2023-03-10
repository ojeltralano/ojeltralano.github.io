const fs = require('fs');
var request = require('request');
var { google } = require('googleapis');
var key = require('./key.json');

const jwtClient = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ['https://www.googleapis.com/auth/indexing'],
  null
);

const batch = fs
  .readFileSync('urls.txt')
  .toString()
  .split('\n');

jwtClient.authorize(function(err, tokens) {
  if (err) {
    console.log(err);
    return;
  }

  const items = batch.map(line => {
    return {
      'Content-Type': 'application/http',
      'Content-ID': '',
      body:
        'POST /v3/urlNotifications:publish HTTP/1.1\n' +
        'Content-Type: application/json\n\n' +
        JSON.stringify({
          url: line,
          type: 'URL_UPDATED'
        })
    };
  });

  const options = {
    url: 'https://indexing.googleapis.com/batch',
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/mixed'
    },
    auth: { bearer: tokens.access_token },
    multipart: items
  };
  request(options, (err, resp, body) => {
let success = [];
    let error = [];
    let logs = body.trim().split(/--batch_[a-zA-Z0-9\-_]+/)
    .map(a => a.trim()).filter(a => a)
    .map(a => a.split('\r\n\r\n')[2]).filter(a => a)
    .map(a => {
        try {
            let item = JSON.parse(a);
            if(item.error) {
                error.push(item.error.code+' '+item.error.status+': '+item.error.message);
                return item.error.code+' '+item.error.status+': '+item.error.message;
            } else {
                success.push('URL_UPDATED: '+item.urlNotificationMetadata.url);
                return 'URL_UPDATED: '+item.urlNotificationMetadata.url;
            }
        } catch (e) {
            return a;
        }
    });
    console.log(
        '===============================================================================\n'
        +key.client_email
        +'\n-------------------------------------------------------------------------------\n'
        +(success.length ? success[0]+'\n......\n......\n'+success.slice(-1)[0]
          +'\n-------------------------------------------------------------------------------\n' : '')
        +(error.length ? error.join('\n')
          +'\n-------------------------------------------------------------------------------\n' : '')
        +logs.length+' urls processed.\n'
        +success.length+' urls success.\n'
        +error.length+' urls error.\n'
        +'==============================================================================='
    );
  });
});
