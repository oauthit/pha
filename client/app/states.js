'use strict';

angular.module('phaApp')
  .config(function ($stateProvider) {
  $stateProvider
    .state('register', {
      url: '/register',
      templateUrl: 'app/views/register.html'
    })
    .state('login', {
      url: '/login',
      templateUrl: 'app/views/login.html'
    });
});
