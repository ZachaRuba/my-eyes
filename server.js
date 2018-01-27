/*
=====================================================================
  Purpose: Creates a server application for the backend of my-eyes.
=====================================================================
*/

require('dotenv').load();
const crypto = require("crypto");
const mime = require("mime");
const express = require("express");
const cfenv = require("cfenv");
const bodyParser = require('body-parser')
const vision = require('@google-cloud/vision');
const TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');
const fs = require('fs');
const multer  = require('multer')

/*
=====================================================================
     SETUP
       - Create Client for google Vision
       - Create text param IBM text-to-Speech
       - Define directories for multer to save files
         - Image uploads
         - Text audio
=====================================================================
*/

// Setup for Goolge Vision API - Create a client from my-eyes .json file
const client = new vision.ImageAnnotatorClient();

// Setup for IBM text-to-speech - Create text_params with user and password
const text_to_speech = new TextToSpeechV1({
    username: process.env.USERNAME_WAT,
    password: process.env.PASSWORD_WAT
});

const text_params = (text_to_speech) => {
    return {
    text: text_to_speech,
    voice: 'en-US_AllisonVoice',
    accept: 'audio/mp3'
}};

//Set up for Storing Images under upload folder
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      cb(null, raw.toString('hex') + Date.now() + '.' + mime.getExtension(file.mimetype));
    });
  }
});

var upload = multer({ storage: storage,
    limits: { fileSize: 1024 * 1024 * 50}
});

/*
=====================================================================
     FUNCTIONS
=====================================================================
*/

// Performs text detection on the local file
const convert_image_to_text = (fileName, audioFile, res) => {
    client
        .documentTextDetection("uploads/"+fileName) //Call google vision api on a file.
        .then(results => {
            var transcript = text_to_speech.synthesize(text_params(results[0].fullTextAnnotation.text)); //Once we have the text, call ibm text-to-speech and pass the text
            transcript.pipe(audioFile.stream); //pipe the stream from ibm into our res variable (AKA, sends an audio stream)
            transcript.pipe(res);
            transcript.on('end', ()=>{
              console.log(`Transcript stream for ${audioFile.fileName} has ended.`);
              audioFile.stream.end();
              res.end();
              });
            fs.writeFile('text/'+fileName+'.json',JSON.stringify(results),(err)=>{
                if(err) throw err;
                console.log(`The text file ${fileName}.txt was saved!`);
              });
        })
        .catch(err => {
            console.error('ERROR:', err);
        });
}

/*
=====================================================================
    APPLICATION
=====================================================================
*/
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(express.static(__dirname + '/views'));

//When we get a post request with action upload, save the file, then respond with the audio: filename
app.post('/upload', upload.single('file_input'), function (req, res, next) {
    console.log(req.file.filename);
    res.json({'audio': req.file.filename});
})

//On a get request with action audio/:img, convert the image to audio
app.get('/audio/:img',
  function(req, res, next) {
    const myFileName = req.params.img + ".mp3";
    var audioFile = {
      stream: fs.createWriteStream("audio/"+myFileName),
      fileName: myFileName};
    audioFile.stream.on('finish',()=>{console.log(`Audio file ${myFileName} has been saved.`);});
    convert_image_to_text(req.params.img, audioFile, res);
});

var port = process.env.PORT || 3000;

app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
