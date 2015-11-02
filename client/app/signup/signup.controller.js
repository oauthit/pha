'use strict';

angular.module('phaApp')
  .controller('SignupCtrl', ['$http', '$state', '$mdToast',
    function ($http, $state, $mdToast) {
      var me = this;
      var smsCode;
      me.code = false;

      me.sendPhoneNumber = function () {

        $http.post('/api/pha/auth/' + me.phoneNumber)
          .then(function (res) {
            me.code = res.data.code;
            smsCode = res.data.smsCode;
          }, function () {
            $mdToast.show($mdToast.simple().content('Неправильный телефон'));
            //show message when max attempts exceeded
          });
      };

      me.confirmSmsCode = function () {
        function validateSmsCode() {
          if (smsCode) {
            if (smsCode !== me.smsCode) {
              $mdToast.show($mdToast.simple().content('Неверный смс код'));
            }
          }
        }

        validateSmsCode();
        var data = {
          phoneNumber: me.phoneNumber,
          code: me.code,
          smsCode: me.smsCode
        };
        $http.post('/api/pha/token', data)
          .then(function (res) {
            $state.go('authorized', res);
          }, function (err) {
            if (err.status === 400) {
              //show how many retries left
            } else {
              me.code = false;
            }
          })
      };
    }]);
