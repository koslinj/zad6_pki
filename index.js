const { google } = require('googleapis');
const express = require('express')
const OAuth2Data = require('./google_key.json')
const axios = require('axios')

const app = express()

const { Client } = require("pg")
const dotenv = require("dotenv")
dotenv.config()

const fetchUsers = async () => {
  try {
    const client = new Client({
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      port: process.env.PGPORT,
      ssl: true
    })

    await client.connect()
    const res = await client.query('SELECT * FROM users')
    await client.end()
    return res.rows
  } catch (error) {
    console.log(error)
    return null
  }
}

const gh_id = "Ov23lijRmGqTt8kc0iKK"
const gh_secret = "a18bf140fbe71c24ab823514ef5b44d116683d2e"
var access_token = "";

// Declare the callback route
app.get('/github/callback', (req, res) => {
  const requestToken = req.query.code

  axios({
    method: 'post',
    url: `https://github.com/login/oauth/access_token?client_id=${gh_id}&client_secret=${gh_secret}&code=${requestToken}`,
    // Set the content type header, so that we get the response in JSON
    headers: {
      accept: 'application/json'
    }
  }).then((response) => {
    access_token = response.data.access_token
    res.redirect('/success');
  })
})

app.get('/success', function (req, res) {

  axios({
    method: 'get',
    url: `https://api.github.com/user`,
    headers: {
      Authorization: 'token ' + access_token
    }
  }).then(async (resp) => {
    const rows = await fetchUsers();

    let userDataHTML = '<h2>User Data:</h2>';
    userDataHTML += '<ul>';
    rows.forEach(row => {
      userDataHTML += `<li>ID: ${row.id}, Name: ${row.name}, Joined: ${row.joined}, Last Visit: ${row.lastvisit}, Counter: ${row.counter}</li>`;
    });
    userDataHTML += '</ul>';

    res.send(`<h2>${resp.data.login}</h2>
    <h2>${resp.data.name}</h2>
    <h2>${resp.data.bio}</h2>
    <h2>FOLLOWERS: ${resp.data.followers}</h2>
    <br><a href="/ghsignout">Sign Out</a>
    ${userDataHTML}`);
  }).catch((error) => {
    res.redirect('/');
  });
});

app.get("/ghsignout", function (req, res) {
  access_token = ""
  res.redirect('/');
})

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

app.get('/', (req, res) => {
  res.send(
    '<h1>HOME PAGE</h1><a href="/signin">Sign In with Google</a><br/>'
    +
    `<a href="https://github.com/login/oauth/authorize?client_id=${gh_id}&prompt=consent">Github Login</a>`
  );
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
    oauth2.userinfo.v2.me.get(async function (err, result) {
      if (err) {
        console.log('BLAD!')
        console.log(err)
      } else {
        loggedUser = result.data.name
        console.log(loggedUser)
      }
      const rows = await fetchUsers();

      let userDataHTML = '<h2>User Data:</h2>';
      userDataHTML += '<ul>';
      rows.forEach(row => {
        userDataHTML += `<li>ID: ${row.id}, Name: ${row.name}, Joined: ${row.joined}, Last Visit: ${row.lastvisit}, Counter: ${row.counter}</li>`;
      });
      userDataHTML += '</ul>';

      const responseContent = `
    <p>Zalogowany: ${loggedUser}<img src="${result.data.picture}" height="23" width="23"></p>
    <p><a href="/signout">Sign Out</a></p>
    ${userDataHTML}`;

      // Send the response
      res.send(responseContent);

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