(function(angular, moment, $) {

  'use strict';

  var TOTAL_SECONDS = 432000;

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard')
    , statusToClass = function(status) {
      return {
        'green' : 'success',
        'good' : 'success',
        'yellow' : 'warning',
        'warning' : 'warning',
        'slow' : 'warning',
        'red' : 'danger',
        'blue' : 'danger',
        'down' : 'danger'
      }[status] || 'default';
    };

  app.directive('historyItem', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var item = scope.item;

        scope.mouseIn = function() {
          scope.$parent.mouseIn(item);
        };
        scope.clack = function() {
          scope.$parent.clickCurrent(item);
        };
        scope.mouseGone = function() {
          scope.$parent.mouseGone();
        };

        scope.className = 'label-' + statusToClass(item.status);
      }
    };
  });

  app.directive('eventItem', function() {
    return {
      restrict: 'A',
      template: ''+
      '<div class="item cf">' +
      '  <span class="icon {{ event.type }}"></span>' +
      '  <div class="change_detail">' +
      '    <span class="commit_msg">' +
      '      <span class="repo_name">{{ event.name }}</span>' +
      '      <a target="_blank" data-ng-show="msg" class="commit_link" data-ng-href="{{ event.meta.url }}">{{ msg }}</a>' +
      '    </span>' +
      '  </div>' +
      '  <div class="change_meta">' +
      '    <span title="{{ time.formatted }}" data-ng-show="time.formatted">{{ time.delta }}</span>' +
      '    <span data-ng-show="event.meta.author">by {{ event.meta.author.name }}</span>' +
      '  </div>' +
      '</div>',
      replace: true,
      link: function(scope, element, attrs) {
        var event = scope.event
          , action = event.action
          , msgMap = {
            'build' : 'Successfully built and deployed.',
            'merge' : event.meta && event.meta.message || '',
            'restart' : event.meta && 'Auto-restarted: ' + event.meta.reason,
            'restart.not_configured' : event.meta && 'Auto-restarted: ' + event.meta.reason,
            'status.change' : event.meta && event.meta.reason
          }
          , date = moment(event.created_at);

        scope.src = event.src;
        scope.msg = msgMap[action];
        scope.time = {
          delta: date.fromNow(),
          formatted: date.format('h:mm a [on] MMM Do YYYY')
        };
      }
    };
  });

  app.directive('statusBtn', [
    '$location',

    function($location) {
      return {
        restrict: 'A',
        replace: true,
        scope: true,
        template: '' +
          '<a class="app_link btn col-xs-12">'+
          ' <span'+
          '   class="glyphicon {{ glyph }}"></span>' +
          '   <span>{{ name }}</span>' +
          '</a>',
        link: function(scope, element, attrs) {
          var item = scope.item
            , type = attrs.statusType
            , name = getName()
            , status = getStatus()
            , glyphs = {
              "success" : "ok-sign",
              "warning" : "warning-sign",
              "danger" : "minus-sign",
              "default" : "question-sign"
            };
          element
            .addClass('col-sm-' + (Math.ceil(name.length/7) + 1))
            .addClass('col-md-' + (Math.ceil(name.length/10) + 1))
            .addClass('btn-' + status)
            .bind('click', goTo);

          scope.name = name;
          scope.glyph = 'glyphicon-' + glyphs[status] || 'question-sign';

          function getName() {
            if (item.repo_name) return item.repo_name;
            if (item.app && item.app.repo_name) return item.app.repo_name;
            if (item.app_errors && item.app_errors.repo_name) return item.app_errors.repo_name;
            return item.name;
          }

          function getStatus() {
            return statusToClass(item.status);
          }

          function goTo() {
            scope.$apply(function() {
              $location.path('/' + type + '/' + name);
            });
          }
        }
      };
    }
  ]);

  app.directive('uptimeGraph', [
    '$window',
    'd3Service',

    function($window, d3Service) {
      return {
        link: link
      };

      function link(scope, element, attrs) {
        if (! $(element).is(':visible')) return;

        scope.$parent.showHorizons = false;

        var horizons = [];

        if (scope.hasThroughput) {
          horizons.push('req');
        }
        if (scope.hasRespTime) {
          horizons.push('time');
        }
        if (scope.hasMemory) {
          horizons.push('mem');
        }

        if (! horizons.length) return;

        scope.$parent.showHorizons = true;

        var context;

        d3Service.d3().then(d3Handler);

        function d3Handler(libs) {
          var d3 = libs[0]
            , cubism = libs[1];

          scope.$watch('history.length', render);

          function render() {
            if (! scope.history) return;
            var $el = d3.select(element[0])
              , height = 60
              , width = $el.node().offsetWidth
                // first half of colors arrays are for negative numbers (we have none)
              , colors = {
                // 1 band for memory (no warning level)
                mem : [null, '#BAE4B3'],
                // 4 bands for response time: blue at 5s, red at 10s, black at 15s
                time : [null, null, null, null, '#BAE4B3', '#bdd7e7', 'red', 'black' ]
              }
              , maxes = {
                mem : 250,
                time : 20000
              };

            // Set up the graph to have full 2-day data
            context = cubism.context()
              // Size of each pixel
              .step(3e5) // 5 minute steps
              // Number of pixels
              .size(576)
              .stop();

            // Add top and bottom axes
            $el.selectAll('.axis')
                .data(['top', 'bottom'])
              .enter().append('div')
                .attr('class', function(d) {
                  return d + ' axis';
                })
                .each(function(d) {
                  d3.select(this)
                    .call(context.axis().ticks(12).orient(d));
                });

            // Add the slider rule for both graphs
            $el.append('div')
              .attr('class', 'rule')
              .call(context.rule());

            // Create the horizon graphs
            $el.selectAll('.horizon')
                // Map the horizons to the data we like
                .data(horizons.map(metricBuilder))
              // for each of them, add a new horizon before the .bottom
              .enter().insert('div', '.bottom')
                .attr('class', 'horizon')
              .call(context.horizon()
                // Sets min and max of graph
                .extent(function(d, i) {
                  var which = horizons[i]
                    , max = maxes[which];

                  if (which === 'req') {
                    return null;
                  }

                  return [0, max];
                })
                .height(height)
                .colors(function(d, i) {
                  return colors[horizons[i]] || [null, '#BAE4B3'];
                })
                // Use number (with comma) formatting
                .format(d3.format(',d')));

            context.on('focus', function(i) {
              d3.selectAll('.value').style('right', i === null ? null : context.size() - i + 'px');
            });
          }

        }

        function metricBuilder(name) {
          var labels = {
              req : 'Throughput (req/5min)',
              mem : 'Memory Usage (MB)',
              time : 'p75 Response Time (ms)'
            };
          return context.metric(function(start, stop, step, callback) {
            var values = [];
            var rows = []
              , maxDiff = 400000
              , currentTime, previousTime, diff, i, row, data, value;

            if (scope.pageType === 'app') {
              maxDiff = 300000;
            }

            function emptyArray(length) {
              return Array.apply(null, new Array(length)).map(function() { return 0; });
            }

            for (i=scope.history.length; i--;) {
              row = scope.history[i];

              data = getData(row);

              currentTime = new Date(data.created).getTime();

              if (previousTime) {
                diff = currentTime - previousTime;
                // If there are any blocks missing
                if (diff > 400000) {
                  // Add the missing number of 0s
                  values = values.concat(emptyArray(Math.floor(diff / 300000)));
                }
              }

              values.push(data[name]);

              previousTime = currentTime;
            }

            callback(null, values.slice(-context.size()));
          }, labels[name]);
        }

        function getData(data) {
          var _data = {
            app : data.app,
            service : data,
            upstream : data.meta
          };
          return (function parseData(datum) {
            if (! datum) return {
                created : data.bucket_time || data.created_at,
                req: 0,
                mem: 0,
                time : 0
              };
            return {
              created : data.bucket_time || data.created_at,
              req : (datum.codes && datum.codes.total) || 0,
              mem : (datum.memory && datum.memory.avg) || 0,
              time : (datum.time && (datum.time.p75 || datum.time.p95)) || 0
            };
          })(_data[scope.pageType]);
        }
      }
    }
  ]);

})(window.angular, window.moment, window.jQuery);
