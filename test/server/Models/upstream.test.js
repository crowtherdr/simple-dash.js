var expect = require('expect.js')
  , db = require('../../db')
  , Model = require('../../../Models/Upstream');


describe('Upstream interface:', function() {

  after(function(done) {
    db.dropDatabase(done);
  });

  describe('Heroku:', function() {
    describe('Given a "green" and "yellow" sample heroku fetch, fromHeroku', function() {
      var data = getMockData('heroku','greenYellow')
        , upstreams = {}
        , upstream = {};
      before(function(done) {
        Model.fromHeroku(data).then(function() {
          Model.find({ name : 'Heroku Production' }, function(err, docs) {
            if (err) return expect().fail();
            upstreams.prod = docs;
            upstream.prod = docs[0];
            Model.find({ name : 'Heroku Development' }, function(err, docs) {
              if (err) return expect().fail();
              upstreams.dev = docs;
              upstream.dev = docs[0];
              done();
            });
          });
        });
      });
      after(function(done) {
        Model.remove(done);
      });
      it('should create and save a Prod and Dev upstream status', function() {
        expect(upstreams.prod.length).to.be(1);
        expect(upstreams.dev.length).to.be(1);
      });
      it('should set the type as "heroku"', function() {
        expect(upstream.prod.type).to.be('heroku');
        expect(upstream.dev.type).to.be('heroku');
      });
      it('should set the names', function() {
        expect(upstream.prod.name).to.be('Heroku Production');
        expect(upstream.dev.name).to.be('Heroku Development');
      });
      it('should set the "green" and "yellow" statuses', function() {
        expect(upstream.prod.status).to.be('green');
        expect(upstream.dev.status).to.be('yellow');
      });
      it('should save the issues to both instances', function() {
        expect(upstream.prod.meta.issues).to.be.eql(data.issues);
        expect(upstream.dev.meta.issues).to.be.eql(data.issues);
      });
      it('should set created_at', function() {
        expect(upstream.prod.created_at).to.be.a(Date);
        expect(upstream.dev.created_at).to.be.a(Date);
      });
      it('should save the raw data as _raw', function() {
        expect(upstream.prod._raw).to.be.an(Object);
        expect(upstream.prod._raw).to.eql(data);
        expect(upstream.dev._raw).to.be.an(Object);
        expect(upstream.dev._raw).to.eql(data);
      });
    });
    describe('Given a "blue" sample heroku fetch, fromHeroku', function() {
      var data = getMockData('heroku','blue')
        , upstream;
      before(function(done) {
        Model.fromHeroku(data).then(function() {
          Model.findOne({ name : 'Heroku Development' }, function(err, doc) {
            if (err) return expect().fail();
            upstream = doc;
            done();
          });
        });
      });
      after(function(done) {
        Model.remove(done);
      });
      it('should set the status as "blue"', function() {
        expect(upstream.status).to.be('blue');
      });
    });
    describe('Given a "red" sample heroku fetch, fromHeroku', function() {
      var data = getMockData('heroku','red')
        , upstream;
      before(function(done) {
        Model.fromHeroku(data).then(function() {
          Model.findOne({ name : 'Heroku Development' }, function(err, doc) {
            if (err) return expect().fail();
            upstream = doc;
            done();
          });
        });
      });
      after(function(done) {
        Model.remove(done);
      });
      it('should set the status as "red"', function() {
        expect(upstream.status).to.be('red');
      });
    });
    describe('Given no data, haFromSplunk', function() {
      it('should reject with an error', function(done) {
        Model.fromHeroku().then(
          function doNotWant() {},
          function rejected(err) {
            expect(err).to.be.an(Error);
            done();
          });
      });
    });
  });

  describe('HA Proxy:', function() {
    describe('Given a "good" sample splunk mem_response, haFromSplunk', function() {
      var data = getMockData('haProxy','good')
        , upstreams, upstream;
      before(function(done) {
        Model.haFromSplunk(data).then(function() {
          Model.find(function(err, docs) {
            if (err) return expect().fail();
            upstreams = docs;
            upstream = docs[0];
            done();
          });
        });
      });
      after(function(done) {
        Model.remove(done);
      });
      it('should create and save', function() {
        expect(upstreams.length).to.be(1);
      });
      it('should set the type as "haProxy"', function() {
        expect(upstream.type).to.be('haProxy');
      });
      it('should set the name as "HA Proxy"', function() {
        expect(upstream.name).to.be('HA Proxy');
      });
      it('should set the status as "good"', function() {
        expect(upstream.status).to.be('good');
      });
      it('should set the meta.codes', function() {
        expect(upstream.meta.codes).to.be.an(Object);
        expect(upstream.meta.codes['2xx']).to.be(599);
        expect(upstream.meta.codes['3xx']).to.be(300);
        expect(upstream.meta.codes['4xx']).to.be(100);
        expect(upstream.meta.codes['5xx']).to.be(1);
        expect(upstream.meta.codes.total).to.be(1000);
      });
      it('should set and round the error rate to 2 decimal places', function() {
        expect(upstream.meta.error_rate).to.be(1);
      });
      it('should set created_at', function() {
        expect(upstream.created_at).to.be.a(Date);
      });
      it('should save the raw data as _raw', function() {
        expect(upstream._raw).to.be.an(Object);
        expect(upstream._raw).to.eql(data);
      });
    });
    describe('Given no data, haFromSplunk', function() {
      it('should reject with an error', function(done) {
        Model.haFromSplunk().then(
          function doNotWant() {},
          function rejected(err) {
            expect(err).to.be.an(Error);
            done();
          });
      });
    });

    describe('Given an almost-"warning" sample, haFromSplunk', function() {
      var data = getMockData('haProxy','almostWarning')
        , upstream;
      before(function(done) {
        Model.haFromSplunk(data).then(function() {
          Model.findOne(function(err, doc) {
            if (err) return expect().fail();
            upstream = doc;
            done();
          });
        });
      });
      after(function(done) {
        Model.remove(done);
      });
      it('should set the status as "good"', function() {
        expect(upstream.status).to.be('good');
      });
    });

    describe('Given a "warning" sample, haFromSplunk', function() {
      var data = getMockData('haProxy','warning')
        , upstream;
      before(function(done) {
        Model.haFromSplunk(data).then(function() {
          Model.findOne(function(err, doc) {
            if (err) return expect().fail();
            upstream = doc;
            done();
          });
        });
      });
      after(function(done) {
        Model.remove(done);
      });
      it('should set the status as "warning"', function() {
        expect(upstream.status).to.be('warning');
      });
    });

    describe('Given an almost-"down" sample, haFromSplunk', function() {
      var data = getMockData('haProxy','almostDown')
        , upstream;
      before(function(done) {
        Model.haFromSplunk(data).then(function() {
          Model.findOne(function(err, doc) {
            if (err) return expect().fail();
            upstream = doc;
            done();
          });
        });
      });
      after(function(done) {
        Model.remove(done);
      });
      it('should set the status as "warning"', function() {
        expect(upstream.status).to.be('warning');
      });
    });

    describe('Given an "down" sample, haFromSplunk', function() {
      var data = getMockData('haProxy','down')
        , upstream;
      before(function(done) {
        Model.haFromSplunk(data).then(function() {
          Model.findOne(function(err, doc) {
            if (err) return expect().fail();
            upstream = doc;
            done();
          });
        });
      });
      after(function(done) {
        Model.remove(done);
      });
      it('should set the status as "down"', function() {
        expect(upstream.status).to.be('down');
      });
    });
  });

  describe('To Test', function() {
    it('findCurrent');
  });

});

function getMockData(src, type) {
  var mocks = {
    heroku : {
      greenYellow : {
        "status": {
          "Production": "green",
          "Development": "yellow"
        },
        "issues": [
          {
            "created_at": "2013-11-13T18:17:11Z",
            "id": 566,
            "resolved": false,
            "status_dev": "yellow",
            "status_prod": "green",
            "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
            "upcoming": false,
            "updated_at": "2013-11-13T18:17:11Z",
            "href": "https://status.heroku.com/api/v3/issues/566",
            "updates": [
              {
                "contents": "The npmjs.org registry is intermittently down, effectively breaking deploys for any Node.js apps that don't have their node_modules checked into source control.\r\n\r\nNode.js apps already running on Heroku are NOT affected by this outage.",
                "created_at": "2013-11-13T18:17:11Z",
                "id": 1824,
                "incident_id": 566,
                "status_dev": "yellow",
                "status_prod": "green",
                "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
                "update_type": "issue",
                "updated_at": "2013-11-13T18:17:12Z"
              }
            ]
          }
        ]
      },
      blue : {
        "status": {
          "Production": "green",
          "Development": "blue"
        },
        "issues": [
          {
            "created_at": "2013-11-13T18:17:11Z",
            "id": 566,
            "resolved": false,
            "status_dev": "blue",
            "status_prod": "green",
            "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
            "upcoming": false,
            "updated_at": "2013-11-13T18:17:11Z",
            "href": "https://status.heroku.com/api/v3/issues/566",
            "updates": [
              {
                "contents": "The npmjs.org registry is intermittently down, effectively breaking deploys for any Node.js apps that don't have their node_modules checked into source control.\r\n\r\nNode.js apps already running on Heroku are NOT affected by this outage.",
                "created_at": "2013-11-13T18:17:11Z",
                "id": 1824,
                "incident_id": 566,
                "status_dev": "blue",
                "status_prod": "green",
                "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
                "update_type": "issue",
                "updated_at": "2013-11-13T18:17:12Z"
              }
            ]
          }
        ]
      },
      red : {
        "status": {
          "Production": "red",
          "Development": "red"
        },
        "issues": [
          {
            "created_at": "2013-11-13T18:17:11Z",
            "id": 566,
            "resolved": false,
            "status_dev": "red",
            "status_prod": "red",
            "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
            "upcoming": false,
            "updated_at": "2013-11-13T18:17:11Z",
            "href": "https://status.heroku.com/api/v3/issues/566",
            "updates": [
              {
                "contents": "The npmjs.org registry is intermittently down, effectively breaking deploys for any Node.js apps that don't have their node_modules checked into source control.\r\n\r\nNode.js apps already running on Heroku are NOT affected by this outage.",
                "created_at": "2013-11-13T18:17:11Z",
                "id": 1824,
                "incident_id": 566,
                "status_dev": "red",
                "status_prod": "red",
                "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
                "update_type": "issue",
                "updated_at": "2013-11-13T18:17:12Z"
              }
            ]
          }
        ]
      }
    },
    haProxy : {
      good : {
        "status:2xx": "599",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "1",
        "status:total": "1000"
      },
      almostWarning : {
        "status:2xx": "500",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "490",
        "status:total": "1000"
      },
      warning : {
        "status:2xx": "500",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "491",
        "status:total": "1000"
      },
      almostDown : {
        "status:2xx": "500",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "740",
        "status:total": "1000"
      },
      down : {
        "status:2xx": "500",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "741",
        "status:total": "1000"
      }
    }
  };
  return mocks[src][type];
}
