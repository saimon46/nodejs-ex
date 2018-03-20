var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var config = require('./config/database');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');
var passport = require('passport');
var Counter = require("./models/counter");
var fs = require('fs');
var forceSsl = require('express-force-ssl');

var app = express();

var key = fs.readFileSync('./encryption/private.key');
var cert = fs.readFileSync( './encryption/primary.crt' );
var ca = fs.readFileSync( './encryption/intermediate.crt' );

var optionsSsl = {
  key: key,
  cert: cert,
  ca: ca
};

var portHttp = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  portHttps = process.env.PORTHTTPS || process.env.OPENSHIFT_NODEJS_PORT_HTTPS || 8443,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
  mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
  mongoURLLabel = "";

var serverHttp = require('http').createServer(app);
var serverHttps = require('https').createServer(optionsSsl, app);

app.set('forceSSLOptions', {
  httpsPort: portHttps
});

app.use(forceSsl);

Object.assign = require('object-assign');

app.engine('html', require('ejs').renderFile);


if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'],
  mongoUser = process.env[mongoServiceName + '_USER'];

  serverWss = serverHttps;

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;

  }
}
var db = null
var dbDetails = new Object();


// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ Schema DB @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var counterSchema = mongoose.Schema({
  count: Number
});

var initDb = function(callback) {
  if (mongoURL == null) return;
  if (mongoose == null) return;

  mongoose.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    Counter.count({}, function( err, count){
      if(count == 0){
        counter = new Counter();
        counter.count = 1;

        counter.markModified('object');
        
        counter.save();
      }

    console.log('Connected to MongoDB at: %s', mongoURL);
    });
  });
};

initDb(function(err) {
  console.log('Error connecting to Mongo. Message:\n' + err);
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('combined'));
app.use(passport.initialize());

app.get('/', function(req, res) {
  if(req.cookies.token){
    jwt.verify(decodeURI(req.cookies.token).substring(4), config.secret, function(err, decoded) {
      if (err) {
        console.log(err);
        
        res.render('index.html', {
          dbInfo: dbDetails,
          isAuthenticated: false
        });
      } else {
        res.render('index.html', {
          dbInfo: dbDetails,
          isAuthenticated: true
        });
        console.log("Autorizzato!!!");
      }
    });
  } else {
    res.render('index.html', {
      dbInfo: dbDetails,
      isAuthenticated: false
    });
  }

});

app.get('/pagecount', function(req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err) {});
  }
  if (db) {
    db.collection('pageCount').count(function(err, count) {
      res.json({ pageCount: count });
    });
  } else {
    res.json({ pageCount: -1 });
  }
});

var param = {};
param.app = app;
param.serverWss = serverWss;

var api = require('./routes/api')(param);

app.use('/api', api);


// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ Configuration start server @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

serverHttp.listen(portHttp, ip, function() {
  console.log("Server running @ http://" + ip + ":" + portHttp);
});

serverHttps.listen(portHttps, ip, function() {
  console.log("Server running @ https://" + ip + ":" + portHttps);
});


// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ Error Handling @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log(err);
  //res.render('error');
});

module.exports = app;