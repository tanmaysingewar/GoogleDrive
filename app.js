const express = require('express')

const app = express()
const fs = require('fs')
const multer = require('multer')
const {google} =require('googleapis')
const OAuth2Data = require('./credentials.json')

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URI = OAuth2Data.web.redirect_uris[0];

const OAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
)

var authed = false;

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, "./images");
    },
    filename: function (req, file, callback) {
      callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
  });
  
  var upload = multer({
    storage: Storage,
  }).single("file"); //Field name and max count
  

const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";

app.set('view engine','ejs')

app.get('/',(req,res) => {
    if(!authed){
        var url = OAuth2Client.generateAuthUrl({
            access_type : 'offline',
            scope : SCOPES
        })
        console.log(url)
    
    res.render('index',{url : url})
}else{
    var OAuth2 = google.oauth2({
        auth : OAuth2Client,
        version : 'v2'
    })
    //User info

    OAuth2.userinfo.get(function(err,resp){
        if(err) throw err;
        console.log(resp.data)
        res.render('success', {name : resp.data.name, pic : resp.data.picture , success : false})
    })

}
})

app.get('/google/callback',(req,res) => {
    const code = req.query.code

    if(code){
        OAuth2Client.getToken(code, function(err, tokens){
            if(err){
                console.log("ERROR IN AUTH", err)
            }else{
                console.log("SUCCESSFULLY AUTH",tokens)
                OAuth2Client.setCredentials(tokens)

                authed = true

                res.redirect('/')
            }
        })
    }
})

app.post("/upload", (req, res) => {
    upload(req, res, function (err) {
      if (err) {
        console.log(err);
        return res.end("Something went wrong");
      } else {
        console.log(req.file.path);
        const drive = google.drive({ version: "v3",auth:OAuth2Client  });
        const fileMetadata = {
          name: req.file.filename,
        };
        const media = {
          mimeType: req.file.mimetype,
          body: fs.createReadStream(req.file.path),
        };
        drive.files.create(
          {
            resource: fileMetadata,
            media: media,
            fields: "id",
          },
          (err, file) => {
            if (err) {
              // Handle error
              console.error(err);
            } else {
                console.log(file)
              fs.unlinkSync(req.file.path)
              var OAuth2 = google.oauth2({
                auth : OAuth2Client,
                version : 'v2'
            })
            //User info
        
            OAuth2.userinfo.get(function(err,resp){
                if(err) throw err;
                console.log(resp.data)
                res.render('success', {name : resp.data.name, pic : resp.data.picture , success : true})
            })
            }
  
          }
        );
      }
    });
  });

app.listen(5000,()=>{
    console.log("App started on Port 5000")
})