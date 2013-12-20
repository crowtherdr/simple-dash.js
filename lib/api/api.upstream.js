/**
 * Module Dependencies
 */
var express = require('express')
  , Q = require('q')
  , debug = require('debug')('dash:api:upstream');

/**
 * Local Dependencies
 */
var Upstream = require('../../Models/Upstream');

/**
 * Local Vars
 */
var app = module.exports = express();

app.get('/', function (req, res) {
  Upstream.findCurrent(function(err, docs) {
    if (err) {
      debug('Index docs failure: ', err);
      return res.send(500, err);
    }
    debug('Index docs retrieved: ' + docs.length);
    return res.send(200, docs);
  });
});

app.get('/:upstream_name', function (req, res) {
  Upstream
    .find({
      name : req.params.upstream_name,
      created_at : {
        $lte : Date.now()
      }
    })
    .sort({
      created_at : -1
    })
    .exec(function(err, docs) {
      if (err) {
        debug('Upstream history failure: ', err);
        return res.send(500, err);
      }
      res.send(200, docs);
    });
});
