'use strict';

angular.module('phaApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('authorized', {
        url: '/authorized',
        templateUrl: 'app/authorized/authorized.html',
        controller: 'AuthorizedCtrl'
      });
  });