(function(angular, moment, $) {

  'use strict';

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
          '<a class="app_link btn col-xs-6">'+
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
          if (name.length > 12) {
            element.removeClass('col-xs-6').addClass('col-xs-12');
          }
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

})(window.angular, window.moment, window.jQuery);
