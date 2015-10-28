'use strict';

angular.module('phaApp')
  .controller('SignupCtrl', ['$http', function ($http) {
    var me = this;

    me.sendPhoneNumber = function () {

      $http.post('/api/pha/auth/' + me.phoneNumber)
        .then(function (res) {
          console.log(res);
        }, function (err) {
          console.log(err);
        });
    };

  }]);
