'use strict';

angular.module('phaApp')
  .controller('SignupCtrl', ['$http', '$state', '$mdToast',
    function ($http, $state, $mdToast) {
      var me = this;
      me.code = false;

      me.sendPhoneNumber = function () {

        $http.post('/api/pha/auth/' + me.phoneNumber)
          .then(function (res) {
            me.code = res.data.code;
          }, function () {
            $mdToast.show($mdToast.simple().content('Неправильный телефон'));
            //show message when max attempts exceeded
          });
      };

      me.confirmSmsCode = function () {
        var data = {
          phoneNumber: me.phoneNumber,
          smsCode: me.smsCode,
          code: me.code
        };
        $http.post('/api/pha/token', data)
          .then(function (res) {
            $state.go('authorized', res);
          }, function (err) {
            if (err.status === 400) {
              $mdToast.show($mdToast.simple().content('Неправильный телефон'));
              //show how many retries left
            } else {
              me.code = false;
            }
          })
      };
    }]);
