var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var passport = require('passport');
var Counter = require("./models/counter");
var fs = require('fs');
//var forceSsl = require('express-force-ssl');


var api = require('./routes/api');

var app = express();

//app.set('forceSSLOptions', {
//  httpsPort: 8443
//});

//app.use(forceSsl);

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
var webSocketServer = require("ws").Server;

Object.assign = require('object-assign');

app.engine('html', require('ejs').renderFile);


if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'],
    rootWebServer = process.env['ROOT_WEB_SERVER'],
  mongoUser = process.env[mongoServiceName + '_USER'];

  if(rootWebServer == "localhost"){
    serverWss = serverHttps;
    rootWebServer = rootWebServer+ ":" + portHttps;
  }else{
    serverWss = serverHttp;
  }

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
    if (!db) {
    initDb(function(err) {});
  }
  if (db) {
    var col = db.collection('pageCount');
    // Create a document with request IP and current time of request
    col.insert({ // TODO modify
      ip: req.ip,
      date: Date.now()
    });
    col.count(function(err, count) {
      if (err) {
        console.log('Error running count. Message:\n' + err);
      }
      res.render('index.html', {
        pageCountMessage: count,
        dbInfo: dbDetails,
        rootWebServer: rootWebServer
      });
    });
  } else {
    res.render('index.html', {
      pageCountMessage: null
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
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ WebSocket @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

wss = new webSocketServer({
    server: serverWss,
    autoAcceptConnections: false
});
wss.on('connection', function(ws) {
  console.log("New connection");

  ws.on('message', message => {
    ws.send("Received: " + message);
  });

  ws.on('close', () => {
    console.log('WebSocket was closed')
  })

  ws.send('Welcome!');
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
  res.render('error');
});


// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ BroadCast WebSocket @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

setInterval(function() {
  wss.clients.forEach(function(client) {
    client.send('Ciao! Siamo in ' + wss.clients.size);
  });
}, 5000);

module.exports = app;