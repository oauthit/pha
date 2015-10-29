'use strict';

angular.module('phaApp')
  .controller('SignupCtrl', ['$http', '$scope', function ($http, $scope) {
    var me = this;
    var smsCode;
    me.code = false;

    me.sendPhoneNumber = function () {

      $http.post('/api/pha/auth/' + me.phoneNumber)
        .then(function (res) {
          me.code = res.data.code;
          smsCode = res.data.smsCode;
        }, function (err) {
          alert(err);
        });
    };

    me.confirmSmsCode = function () {
      function validateSmsCode() {
        if (smsCode) {
          if (smsCode !== me.smsCode) {
            alert('sms code incorrect');
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

        }, function (err) {

        })
    };
  }]);
