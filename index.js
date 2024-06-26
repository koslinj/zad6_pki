const { google } = require('googleapis');
const express = require('express')
const OAuth2Data = require('./google_key.json')
const axios = require('axios')

const app = express()
const ejs = require('ejs');
app.set('view engine', 'ejs');

const { newUser, oldUser, findUserByName, fetchUsers, client } = require('./utils.js');

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
  console.log(access_token)
  axios({
    method: 'get',
    url: `https://api.github.com/user`,
    headers: {
      Authorization: 'token ' + access_token
    }
  }).then(async (resp) => {
    loggedUser = resp.data.login
    const user = await findUserByName(loggedUser)
    if (user) {
      const r = await oldUser(user.id)
      console.log("OLD_USER: ", r)
    } else {
      const r = await newUser(loggedUser)
      console.log("NEW_USER: ", r)
    }
    const userData = {
      login: resp.data.login,
      name: resp.data.name,
      bio: resp.data.bio,
      followers: resp.data.followers
    };
    const rows = await fetchUsers();

    res.render('github', { userData, rows });
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
// SET [0] FOR DEPLOY
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

// app.get('/', (req, res) => {
//   res.send(
//     '<h1>HOME PAGE</h1><a href="/signin">Sign In with Google</a><br/>'
//     +
//     `<a href="https://github.com/login/oauth/authorize?client_id=${gh_id}&prompt=consent">Github Login</a>`
//   );
// });
app.get('/', (req, res) => {
  // Pass any necessary data to the template
  res.render('home', { gh_id: gh_id });
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
        const user = await findUserByName(loggedUser)
        if (user) {
          const r = await oldUser(user.id)
          console.log("OLD_USER: ", r)
        } else {
          const r = await newUser(loggedUser)
          console.log("NEW_USER: ", r)
        }
      }
      const userData = {
        name: loggedUser,
        image: result.data.picture
      };
      const rows = await fetchUsers();

      res.render('google', { userData, rows });
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