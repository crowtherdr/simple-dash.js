(function(angular, jQuery) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard')
    , reload;

  function getGlyph(status) {
    var map = {
      "good" : "ok-sign",
      "slow" : "warning-sign",
      "down" : "minus-sign",
      "unknown" : "question-sign"
    };
    return "glyphicon-" + map[status] || 'question-sign';
  }

  function statusToBS(status) {
    var map = {
      'good' : 'success',
      'slow' : 'warning',
      'down' : 'danger'
    };
    return map[status] || 'default';
  }

  app.controller('IndexCtrl', [
    '$rootScope',
    '$scope',
    '$q',
    'dashService',

    function IndexCtrl($rootScope, $scope, $q, service) {
      window.clearTimeout(reload);
      $rootScope.bodyClass = '';
      $scope.loading = {
        'upstream': true,
        'app': true,
        'api': true
      };
      $scope.upstreamList = [];
      $scope.appList = [];
      $scope.apiList = [];

      $scope.btnClass = function(status) {
        if (! status) return;
        return 'btn-' + statusToBS(status);
      };

      $scope.clean = function(appName) {
        if (! appName) return;
        return escape(appName);
      };

      $scope.getGlyph = function(status) {
        if (! status) return;
        return getGlyph(status);
      };

      function load() {
        var dfds = [
          service.upstream.index(),
          service.app.index(),
          service.api.index()
        ];

        // Load all Upstream data
        dfds[0].then(function(upstreamList) {
          $scope.upstreamList = upstreamList;
          $scope.loading.upstream = false;
        });

        // Load all app data
        dfds[1].then(function(appList) {
          $scope.appList = appList;
          $scope.loading.app = false;
        });

        // Load all API data
        dfds[2].then(function(apiList) {
          $scope.apiList = apiList;
          $scope.loading.api = false;
        });

        // Ready reload of data after 60s
        $q.all(dfds).then(function() {
          reload = window.setTimeout(load, 60000);
        });
      }

      load();
    }
  ]);

  app.controller('UpstreamDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    'dashService',

    function UpstreamDetailsCtrl($rootScope, $scope, $routeParams, service) {
      var name = $routeParams.name;
      window.clearTimeout(reload);
      window.$bindHistory($scope);
      $rootScope.bodyClass = '';
      $scope.pageType = 'upstream';
      $scope.pageTitle = name + ' Status';
      $scope.loading = {
        'main' : true
      };

      $scope.labelStatus = function(item) {
        return 'label-' + statusToBS(item.stats.status);
      };

      $scope.setCurrent = setCurrent;

      function load() {
        service.upstream.details(name).then(function(upstreamList) {
          var current = upstreamList[0];
          setCurrent(current);
          $rootScope.updated = {
            formatted: moment(current.created_at).format('h:mm a')
          };
          $scope.history = upstreamList;
          $scope.loading.main = false;
          reload = window.setTimeout(load, 60000);
        });
      }
      load();

      function setCurrent(current) {
        var updated = moment(current.created_at)
          , status = current.stats.status;
        $scope.current = current;
        $scope.updated = {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };

        $scope.status = status;
        $scope.statusClass = statusToBS(status);
        $scope.glyph = getGlyph(status);
      }
    }
  ]);

  app.controller('AppDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    '$location',
    '$q',
    'dashService',

    function AppDetailsCtrl($rootScope, $scope, $routeParams, $location, $q, service) {
      var name = $routeParams.name;
      window.clearTimeout(reload);
      window.$bindHistory($scope);
      $rootScope.bodyClass = '';
      $scope.pageType = 'app';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, ['hasThroughput','hasRespTime','hasMemory','hasErrorRate','hasStatus','isHeroku','hasApis', 'hasEvents']);
      $scope.loading = {
        'main' : true,
        'apis' : true,
        'events' : true
      };

      $scope.labelStatus = function(item) {
        return 'label-' + statusToBS(item.stats.uptime_status);
      };

      $scope.setCurrent = setCurrent;

      $scope.apiBtnClass = function(status) {
        return 'btn-' + statusToBS(status);
      };

      $scope.goToApi = function(name) {
        $location.path('/api/' + escape(name));
      };

      $scope.clean = function(name) {
        if (! name) return;
        return escape(name);
      };


      function load() {
        var dfds = [
          service.app.details(name),
          service.api.app(name),
          service.event.app(name)
        ];

        // Load all of the app data
        dfds[0].then(function(appList) {
          var current = appList[0];
          setCurrent(current);
          $rootScope.updated = getTime(current.stats.timestamp);
          $scope.history = appList;
          $scope.loading.main = false;
        });

        // Load the dependent apis
        dfds[1].then(function(apiList) {
          $scope.apis = apiList;
          $scope.loading.apis = false;
        });

        // Load the events
        dfds[2].then(function(eventList) {
          $scope.events = eventList;
          $scope.loading.events = false;
        });

        // Trigger reload of data after 60s
        $q.all(dfds).then(function() {
          reload = window.setTimeout(load, 60000);
        });
      }

      load();

      function setCurrent(current) {
        var status = current.stats.uptime_status;
        $scope.current = current;
        $scope.updated = getTime(current.stats.timestamp);

        $scope.status = status;
        $scope.statusClass = statusToBS(status);
        $scope.glyph = getGlyph(status);
      }

      function getTime(timestamp) {
        var updated = moment.unix(timestamp);
        return {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };
      }
    }
  ]);

  app.controller('ApiDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    'dashService',

    function ApiDetailsCtrl($rootScope, $scope, $routeParams, service) {
      var name = $routeParams.name;
      window.clearTimeout(reload);
      window.$bindHistory($scope);
      $rootScope.bodyClass = '';
      $scope.pageType = 'app';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, ['hasThroughput','hasRespTime','hasErrorRate','hasStatus']);
      $scope.loading = {
        'main' : true
      };

      $scope.labelStatus = function(item) {
        return 'label-' + statusToBS(item.stats.uptime_status);
      };

      $scope.setCurrent = setCurrent;

      function load() {
        service.api.details(name).then(function(apiList) {
          var current = apiList[0];
          setCurrent(current);
          $rootScope.updated = getTime(current.stats.timestamp);
          $scope.history = apiList;
          $scope.loading.main = false;
          reload = window.setTimeout(load, 60000);
        });
      }
      load();

      function setCurrent(current) {
        var status = current.stats.uptime_status;
        $scope.current = current;
        $scope.updated = getTime(current.stats.timestamp);

        $scope.status = status;
        $scope.statusClass = statusToBS(status);
        $scope.glyph = getGlyph(status);
      }

      function getTime(timestamp) {
        var updated = moment.unix(timestamp);
        return {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };
      }
    }
  ]);

  app.controller('ChangeLogCtrl', [
    '$rootScope',
    '$scope',
    'dashService',

    function ChangeLogCtrl($rootScope, $scope, service) {
      window.clearTimeout(reload);
      $rootScope.bodyClass = 'change_log';
      $scope.loading = {
        'main' : true,
        'more' : false
      };
      var last_id;

      $scope.checkMore = function() {
        $scope.loading.more = true;
        service.event.more(last_id).then(function(eventList) {
          $scope.events = $scope.events.concat(eventList);
          $scope.loading.more = false;
          last_id = eventList[eventList.length - 1]._id;
        });
      };

      function load() {
        service.event.index().then(function(eventList) {
          $scope.events = eventList;
          $scope.loading.events = false;
          last_id = eventList[eventList.length - 1]._id;
          reload = window.setTimeout(load, 60000);
        });
      }

      load();
    }
  ]);

  function setFeatures($scope, list) {
    var i, l;
    for (i=0, l=list.length; i<l; i++) {
      $scope[list[i]] = true;
    }
  }

})(window.angular, window.jQuery);
