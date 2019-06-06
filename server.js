'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/
// mongoose.connect(process.env.MONGOLAB_URI);
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use("/", bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// mongo stuff
var Schema = mongoose.Schema;

var urlSchema = new Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true
  }
});

var Link = mongoose.model('Link', urlSchema);

// checking db for present links
let urlCounter = 1;

let checkDB = function(done) {
  Link.find().sort({ short_url: -1 }).exec(function (err, data) {
    if (err) {
      done(err);
    };
    if (typeof data[0] != "undefined") {
      urlCounter = data[0].short_url + 1;
    } else {
      urlCounter = 1;
    }
  });
};

// API endpoint
app.post("/api/shorturl/new", function (request, response) {
  let myUrl = request.body.url;
  let myPath = "";
  let firstIndex = myUrl.indexOf('//');
  if (firstIndex != -1) {
    myUrl = myUrl.substring(firstIndex + 2, myUrl.length);
  };
  let secondIndex = myUrl.indexOf('/');
  if (secondIndex != -1) {
    myPath = myUrl.substring(secondIndex, myUrl.length);
    myUrl = myUrl.substring(0, secondIndex);
  }
  dns.lookup(myUrl, { path: myPath }, function (err, address) {
    if (err) {
      console.error(err);
    }
    if (typeof address != "undefined") {
      checkDB();
      setTimeout(function(){
        Link.create({"original_url":request.body.url, "short_url":urlCounter}, function (err) {
          if (err) {
            return err;
          }
        });
        response.json({"original_url":request.body.url, "short_url":urlCounter});
      }, 500);
    } else {
      response.json({"error":"invalid URL"});
    }
  });
});

app.get("/api/shorturl/:number", function (request, response) {
  Link.findOne({ short_url: request.params.number }, function (err, data) {
    if (err) {
      return err;
    }
    if (data != null) {
      response.status(301).redirect("http://" + data.original_url);
    } else {
      response.json({"error":"invalid URL"});
    }
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});