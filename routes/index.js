var express = require('express');
var router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
    if (!db) {
    initDb(function(err) {});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ // TODO modify
      ip: req.ip,
      date: Date.now()
    });
    col.count(function(err, count) {
      if (err) {
        console.log('Error running count. Message:\n' + err);
      }
      console.log(rootWebServer)
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

module.exports = router;