var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();
var User = require("../models/user");
var Counter = require("../models/counter");

router.post('/signup', function(req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({success: false, msg: 'Please pass username and password.'});
  } else {
    var newUser = new User({
      username: req.body.username,
      password: req.body.password
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Username already exists.'});
      }
      res.json({success: true, msg: 'Successful created new user.'});
    });
  }
});

router.post('/signin', function(req, res) {
  User.findOne({
    username: req.body.username
  }, function(err, user) {
    if (err) throw err;

    if (!user) {
      res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.sign(user, config.secret, { expiresIn: config.expiration});
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token});
        } else {
          res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});

router.post('/set', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    Counter.findOne(function (err, counter) {
      counter.count = req.body.counter

      counter.save(function(err,updatedCounter) {
        if (err) {
          return res.json({success: false, msg: 'Save counter failed.'});
        }
      });
      res.json(counter);

    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});

router.post('/increment', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    Counter.findOne(function (err, counter) {
      counter.count = counter.count + 1

      counter.save(function(err,updatedCounter) {
        if (err) {
          return res.json({success: false, msg: 'Save counter failed.'});
        }
      });
      res.json(counter);

    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});

router.post('/decrement', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    Counter.findOne(function (err, counter) {
      if(counter.count > 1)
        counter.count = counter.count - 1;

      counter.save(function(err,updatedCounter) {
        if (err) {
          return res.json({success: false, msg: 'Save counter failed.'});
        }
      });
      res.json(counter);

    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});

router.post('/reset', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    Counter.findOne(function (err, counter) {
      counter.count = 1

      counter.save(function(err,updatedCounter) {
        if (err) {
          return res.json({success: false, msg: 'Save counter failed.'});
        }
      });
      res.json(counter);

    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});

router.get('/get', function(req, res) {
  Counter.findOne(function (err, counter) {
    if (err) return next(err);
    res.json(counter);
  });
});

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = router;