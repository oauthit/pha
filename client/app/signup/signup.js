'use strict';

angular.module('phaApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('signup', {
        url: '/',
        templateUrl: 'app/signup/signup.html',
        controller: 'SignupCtrl',
        controllerAs: 'ctrl'
      });
  });
