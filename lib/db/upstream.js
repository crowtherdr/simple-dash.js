/**********************
 *
 * Api-specific Stuff
 *
 *********************/

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var Q = require('q')
  , request = require('superagent')
  , debug = require('debug')('db:upstream');

// If we rename db collections, I don't want to have to keep changing that everywhere
var db = require('./mongo').upstream_status
  , config = require('../config');

module.exports = {
  log: log,
  current: getCurrent,
  history: getHistory,
  haProxy: logHaProxyStatus
};


function getCurrent() {
  var dfd = Q.defer();

  // Get all (200 most recent) time buckets for all apis
  db.find()
    .sort({
      "created_at" : -1
    })
    .limit(200, function(err, docs) {
      if (err) return errHandler(['getCurrent err: ', err], dfd, err);
      var upstreamNames = [];
      debug('getCurrent results: ', docs.length);
      // Remove all duplicate upstreamNames
      docs = docs.filter(function(el) {
        if (upstreamNames.indexOf(el.name) === -1) {
          upstreamNames.push(el.name);
          return true;
        }
        return false;
      });
      debug('getCurrent filtered results: ', docs.length);
      dfd.resolve(docs);
    });

  return dfd.promise;
}

function getHistory(upstream) {
  var dfd = Q.defer()
    , begin = new Date();

  begin.setDate(begin.getDate() - config.detailsDayCount);
  db.find({
      "name" : upstream,
      "created_at": {
        $gte: begin
      }
    })
    .sort({ "created_at" : -1 }, function(err, docs) {
      if (err) return errHandler(['getHistory err: ', err], dfd, err);
      debug('getHistory results: ', docs.length);
      dfd.resolve(docs);
    });
  return dfd.promise;
}

function errHandler(logs, dfd, err) {
  debug.apply(debug, logs);
  dfd.reject(err);
}

/**
 * Log all upstreams that we know/care about
 * @return {promise} Q.promise
 */
function log() {
  var dfd = Q.defer();
  logHerokuStatus().then(dfd.resolve);
  return dfd.promise;
}


/**
 * Get and log Heroku Status
 * @return {promise} Q.promise
 */
function logHerokuStatus() {
  var dfd = Q.defer();

  request
    .get('https://status.heroku.com/api/v3/current-status')
    .set('Accept', 'application/json')
    .end(function(res){
      var docs
        , _raw = res.body
        , created = new Date()
        , statuses = {
        "green": "good",
        "orange": "slow",
        "red": "down"
      };
      // if any errors, abort.
      if (!res.ok) {
        console.log('Oh no! error checking for heroku status: ' + res.text);
        return dfd.reject();
      }

      // hit heroku with the status
      docs = [
        {
          name: "Heroku Production",
          src: "heroku_status_api",
          created_at: created,
          stats: {
            status: statuses[_raw.status.Production]
          },
          _raw: res.body
        },
        {
          name: "Heroku Development",
          src: "heroku_status_api",
          created_at: created,
          stats: {
            status: statuses[_raw.status.Development]
          },
          _raw: res.body
        }
      ];
      debug('Logging Heroku Statuses', docs);

      //save the status to mongo
      db.insert(docs, function(err, resp) {
        if (err) return errHandler(['logHerokuStatus err: ', err], dfd, err);
        debug('logHerokuStatus success');
        dfd.resolve(resp);
      });

    });

  return dfd.promise;

}

function logHaProxyStatus(data) {
  var dfd = Q.defer()
    , status = 'good'
    , codes = data.data[0]
    , errorRate = codes['status:5xx'] / codes['status:total']
    , errorPct = Math.floor(errorRate * 100)
    , doc = {
      name: "HA Proxy",
      src: 'splunk',
      created_at: new Date(),
      error_rate: errorPct,
      _raw: data
    };

  if (errorRate >= config.haWarningRatio) {
    status = 'slow';
  }
  if (errorRate >= config.haErrorRatio) {
    status = 'down';
  }

  doc.stats = {
    error_rate: errorPct,
    status : status,
    status_2xx: codes['status:2xx'],
    status_3xx: codes['status:3xx'],
    status_4xx: codes['status:4xx'],
    status_5xx: codes['status:5xx'],
    status_total: codes['status:total']
  };
  debug('Logging HAProxy status', doc);

  //save the status to mongo
  db.insert(doc, function(err, resp) {
    if (err) return errHandler(['logHaProxyStatus err: ', err], dfd, err);
    debug('logHaProxyStatus success');
    dfd.resolve(resp);
  });

  return dfd.promise;
}
