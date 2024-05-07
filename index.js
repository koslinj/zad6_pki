const { google } = require('googleapis');
const express = require('express')
const OAuth2Data = require('./google_key.json')

const app = express()

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

app.get('/', (req, res) => {
  res.send('<h1>HOME PAGE</h1><a href="/signin">Sign In with Google</a>');
});

app.get('/signout', (req, res) => {
  authed = false;

  oAuth2Client.revokeCredentials()

  res.redirect('/');
});

app.get('/signin', (req, res) => {
  if (!authed) {
    // Generate an OAuth URL and redirect there
    const url = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/userinfo.profile'
    });
    console.log(url)
    res.redirect(url);
  } else {
    var loggedUser
    var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2' })
    oauth2.userinfo.v2.me.get(function (err, result) {
      if (err) {
        console.log('BLAD!')
        console.log(err)
      } else {
        loggedUser = result.data.name
        console.log(loggedUser)
      }
      res.send('Zalogowany: '
        .concat(loggedUser, '<img src="', result.data.picture, '"height="23" width="23">')
        + '<br><a href="/signout">Sign Out</a>')
    })
  }
})

app.get('/auth/google/callback', function (req, res) {
  const code = req.query.code
  if (code) {
    // Get an access token based on our OAuth code
    oAuth2Client.getToken(code, function (err, tokens) {
      if (err) {
        console.log('Error authenticating')
        console.log(err);
      } else {
        console.log('Successfully authenticated');
        oAuth2Client.setCredentials(tokens);
        authed = true;
        res.redirect('/signin')
      }
    });
  }
});

const port = process.env.PORT || 3001;

app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
});