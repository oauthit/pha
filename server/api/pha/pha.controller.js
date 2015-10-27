'use strict';

var _ = require('lodash');
var crypto = require('crypto');
var redis = require('redis');
var Account = require('./pha.models').account;
var uuid = require('node-uuid');
var AccessToken = require('./pha.models').accessToken;
var client = redis.createClient();
var NUM_SENDING_COUNT = process.env.PHONE_NUMBER_SENDING_COUNT || 3;
var SMS_SENDING_COUNT = process.env.SMS_SENDING_COUNT || 3;
var PHONE_BLOCK_TIME = process.env.PHONE_NUMBER_BLOCKING_TIME || 24*60*60*1000;
var TOKEN_EXISTENCE_TIME = process.env.TOKEN_EXISTENCE_TIME || 24*60*60*1000;

client.on('error', function (err) {
  console.log('Error ' + err);
});

exports.auth = function (req, res) {

  var phoneNumber = req.params.phoneNumber || undefined;
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
  //find account with authId,
  //if none found return unauthorized
};

function proceedTokenCreation(res, data) {
  function checkIfSmsCodeValid() {
    client.get("registration_data:" + data.phoneNumber, function (err, regData) {
      if (err) return handleError(res, err);

      if (!regData) {
        return res.send(404, {
          message: 'No such registration data'
        });
      }

      regData = JSON.parse(regData);
      if (regData.attemptsCount <= 0) {
        client.del("registration_data:" + data.phoneNumber, function (err) {
          if (err) return handleError(res, err);
          //redirect to sms code sending
        });
      }

      if (!(regData.smsCode === data.smsCode && regData.phoneNumber === data.phoneNumber && regData.code === data.code)) {
        regData.attemptsCount--;
        regData = JSON.stringify(regData);
        client.set("registration_data:" + data.phoneNumber, regData, function (err) {
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
    var smsCode = crypto.createHash('sha1').update(phoneNumber.toString()).digest('hex').substr(0,6);
    return smsCode;
  }

  function sendSmsMessage(phoneNumber, smsCode) {
    //send message
  }

  /**
   * Generates sms code and code for authorization.
   * @param {number} phoneNumber
   * @returns {{code: *, smsCode: *}}
   */
  function generateResponse(phoneNumber) {
    var smsCode = generateSms(phoneNumber);
    sendSmsMessage(phoneNumber, smsCode);
    var code = crypto.createHash('sha1').update(phoneNumber.toString()).digest('hex');
    return {
      code: code,
      smsCode: smsCode
    };
  }

  /**
   *
   * @param {number} phoneNumber - Phone number.
   * @param {Object} account - Account info for save.
   * @param {function} next - Callback.
   */
  function registerAccount(phoneNumber, account, next) {
    client.set("registration_account:" + phoneNumber, account, function (err, res) {
      if (err) handleError(res, err);
      var regData = generateResponse(phoneNumber);
      next(regData);
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
      regData = JSON.stringify(regData);
      client.set("registration_data:" + phoneNumber, regData, function (err) {
        if (err) return handleError(res, err);
        regData = JSON.parse(regData);
        return res.status(204).json({
          phoneNumber: phoneNumber,
          code: regData.code,
          smsCode: regData.smsCode
        });
      });
  }

  checkPhoneNumber(phoneNumber);

  client.get("registration_account:" + phoneNumber, function (err, regData) {
    if (err) {
      return handleError(res, err);
    }

    var regAcc = JSON.stringify({
      lastAttempt: Date.now(),
      attemptsCount: NUM_SENDING_COUNT
    });
    if (!regData) {
      registerAccount(phoneNumber, regAcc, function (regData) {
        registerData(res, phoneNumber, regData);
      });
    }
    else {
      regData = JSON.parse(regData);
      var timePassedSinceLastAttempt = Date.now() - regData.lastAttempt;
      if (timePassedSinceLastAttempt >= PHONE_BLOCK_TIME) {
        regData.attemptsCount = NUM_SENDING_COUNT;
        regAcc = JSON.stringify(regData);
        registerAccount(phoneNumber, regAcc, function (regData) {
          registerData(res, phoneNumber, regData);
        });
      } else {
        var blockingTime = PHONE_BLOCK_TIME - timePassedSinceLastAttempt;
        var until = new Date(Date.now() + blockingTime);
        res.send(400, {
          message: 'This phone number blocked for ' + until
        });
      }
    }
  });
}


function handleError(res, err) {
  return res.send(500, err);
}
