'use strict';

var _ = require('lodash');
var crypto = require('crypto');

var request = require('request');
var uuid = require('node-uuid');
var Q = require('q');
var inMemoryRegData = require('../../inMemory');
var inMemoryRegAccounts = require('../../inMemory');
var Account = require('./pha.models').account;
var AccessToken = require('./pha.models').accessToken;
var NUM_SENDING_COUNT = process.env.PHONE_NUMBER_SENDING_COUNT || 3;
var SMS_SENDING_COUNT = process.env.SMS_SENDING_COUNT || 3;
var PHONE_BLOCK_TIME = process.env.PHONE_NUMBER_BLOCKING_TIME || 24 * 60 * 60 * 1000;
var TOKEN_EXISTENCE_TIME = process.env.TOKEN_EXISTENCE_TIME || 24 * 60 * 60 * 1000;
var SMS_SERVICE_TOKEN = process.env.SMS_SERVICE_TOKEN;

exports.auth = function (req, res) {

  var phoneNumber = req.params.phoneNumber || undefined;
  if (!phoneNumber) {
    return res.send(400, {
      message: 'Phone number must be passed'
    });
  }

  if (phoneNumber) {
    processPhoneNumber(res, phoneNumber);
  }
};

exports.token = function (req, res) {
  var fromBody = req.body;
  var smsCode = fromBody.smsCode || undefined;
  var code = fromBody.code || undefined;
  var phoneNumber = fromBody.phoneNumber || undefined;

  if (smsCode && code && phoneNumber) {
    proceedTokenCreation(res, fromBody);
  }
};

exports.roles = function (req, res) {

};

function proceedTokenCreation(res, data) {
  function checkIfSmsCodeValid() {
    inMemoryRegData.get(data.phoneNumber, function (err, regData) {
      if (err) return handleError(res, err);

      if (!regData) {
        return res.send(404, {
          message: 'No such registration data'
        });
      }

      if (regData.attemptsCount <= 0) {
        inMemoryRegData.del(data.phoneNumber, function (err) {
          if (err) return handleError(res, err);
          //redirect to sms code sending
        });
      }

      if (!(regData.smsCode === data.smsCode && regData.phoneNumber === data.phoneNumber && regData.code === data.code)) {
        regData.attemptsCount--;
        inMemoryRegData.set(data.phoneNumber, regData, function (err) {
          if (err) handleError(res, err);
        });
      }
    });
  }

  function findAccount(data, next) {
    var phoneNumber = data.phoneNumber;
    Account.scan({phoneNumber: phoneNumber}, function (err, accounts) {
      if (err) handleError(res, err);

      if (!accounts) {
        var account = {
          id: uuid.v4(),
          phoneNumber: data.phoneNumber,
          disabled: false
        };
        next(account);
      } else {
        var account = accounts[0];
        var accessToken = {
          id: uuid.v4(),
          accountId: account.id,
          expiresAt: Date.now() + TOKEN_EXISTENCE_TIME,
          code: data.code
        };
        AccessToken.create(accessToken, function (err, accessToken) {
          if (err) return handleError(res, err);

          if (accessToken) {
            return res.send(201, accessToken);
          }
        });
      }
    });
  }

  function createAccessToken(account) {
    Account.create(account, function (err, account) {
      if (err) handleError(res, err);

      if (account) {
        var accessToken = {
          id: uuid.v4(),
          accountId: account.id,
          expiresAt: Date.now() + TOKEN_EXISTENCE_TIME
        };
        AccessToken.create(accessToken, function (err, accessToken) {
          if (err) return handleError(res, err);

          if (accessToken) {
            return res.send(201, accessToken);
          }
        });
      }
    });
  }

  checkIfSmsCodeValid();
  findAccount(data, createAccessToken);
}

function processPhoneNumber(res, phoneNumber) {

  function checkPhoneNumber(phoneNumber) {
    //TODO: implement validation
  }

  function generateSms(phoneNumber) {
    var smsCode = crypto.createHash('sha1').update(phoneNumber.toString()).digest('hex').substr(0, 6);
    return smsCode;
  }

  function sendSmsMessage(phoneNumber, smsCode) {
    //send message
    var deferred = Q.defer();
    var options = {
      url: "https://asa2.sistemium.com/r50d/util/sms?phone=" + phoneNumber + "&msg=" + smsCode,
      headers: {
        'authorization': SMS_SERVICE_TOKEN
      }
    };
    function callback(error, res) {
      if (!error && res.statusCode == 200) {
        deferred.resolve();
      } else {
        deferred.reject('Sms was not sent!');
      }
    }
    request.get(options, callback);
    return deferred.promise;
  }

  /**
   * Generates sms code and code for authorization.
   * @param {number} phoneNumber
   * @returns {{code: *, smsCode: *}}
   */
  function generateResponse(phoneNumber, next) {
    var smsCode = generateSms(phoneNumber);
    sendSmsMessage(phoneNumber, smsCode).then(function () {
      var code = crypto.createHash('sha1').update(phoneNumber.toString()).digest('hex');
      next({
        code: code,
        smsCode: smsCode
      });
    }, function (err) {
      throw new Error(err);
    });

  }

  /**
   *
   * @param {number} phoneNumber - Phone number.
   * @param {Object} account - Account info for save.
   * @param {function} next - Callback.
   */
  function registerAccount(res, phoneNumber, account, next) {
    inMemoryRegAccounts.set(phoneNumber, account, function (err) {
      if (err) handleError(res, err);
      generateResponse(phoneNumber, next);
    });
  }

  /**
   *
   * @param {Object} res - Response stream.
   * @param {number} phoneNumber - Phone number.
   * @param {Object} regData - Registration data.
   */
  function registerData(res, phoneNumber, regData) {
    regData.smsSendingAttempts = SMS_SENDING_COUNT;
    inMemoryRegData.set(phoneNumber, regData, function (err) {
      if (err) return handleError(res, err);
      return res.status(201).json({
        phoneNumber: phoneNumber,
        code: regData.code,
        smsCode: regData.smsCode
      });
    });
  }

  checkPhoneNumber(phoneNumber);

  inMemoryRegAccounts.get(phoneNumber, function (err, account) {
    if (err) {
      return handleError(res, err);
    }

    if (!account) {
      //set initial regAcc
      var regAcc = {
        lastAttempt: Date.now(),
        attemptsCount: NUM_SENDING_COUNT
      };
      registerAccount(res, phoneNumber, regAcc, function (regData) {
        registerData(res, phoneNumber, regData);
      });
    }
    else {
      if (account.attemptsCount >= 0) {
        account.attemptsCount--;
        account.lastAttempt = Date.now();
        inMemoryRegAccounts.set(phoneNumber, account, function (err) {
          if (err) return handleError(res, err);
          registerAccount(res, phoneNumber, regAcc, function (regData) {
            registerData(res, phoneNumber, regData);
          });
        });
      } else {
        var timePassedSinceLastAttempt = Date.now() - account.lastAttempt;
        if (timePassedSinceLastAttempt >= PHONE_BLOCK_TIME) {
          account.attemptsCount = NUM_SENDING_COUNT;
          registerAccount(phoneNumber, account, function (regData) {
            registerData(res, phoneNumber, regData);
          });
        } else {
          var blockingTime = PHONE_BLOCK_TIME - timePassedSinceLastAttempt;
          var until = new Date(Date.now() + blockingTime);
          res.send(403, {
            message: 'This phone number blocked until ' + until
          });
        }
      }
    }
  });
}


function handleError(res, err) {
  return res.send(500, err);
}
