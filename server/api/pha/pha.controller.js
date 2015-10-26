'use strict';

var _ = require('lodash');
var crypto = require('crypto');
var redis = require('redis');
var client = redis.createClient();
var NUM_SENDING_COUNT = process.env.PHONE_NUMBER_SENDING_COUNT || 3;
var SMS_SENDING_COUNT = process.env.SMS_SENDING_COUNT || 3;
var PHONE_BLOCK_TIME = process.env.PHONE_NUMBER_BLOCKING_TIME || 24*60*60*1000;

client.on('error', function (err) {
  console.log('Error ' + err);
});

exports.auth = function (req, res) {

  var phoneNumber = req.params.phoneNumber;
  if (phoneNumber) {
    processPhoneNumber(res, phoneNumber);
  }
  //check if mobile number valid
  //check if mobile number already in regacc
  //if not, write to regacc mobile number, last attempt, number of attempts
  //else decrement count in regacc
  //if count 0
  // check last attempt, if (now - last attempt) < 24 hours
  //send error
  // else reset count

  //generate sms code
  //try to send message if message sent generate code
  //write to regdata code and sent sms code, sms code entry retries
};

exports.token = function (req, res) {
  //get sms code and code from client,
  //find regdata by mobile number
  //check regdata for code, sms code and mobile number
  //if code and sms code not match decrement sms attempt count
  //if attempt count is 0, then redirect to sms code sending to mobile and delete regdata
  //find accounts with mobile number
  //if no accounts create new account and new access token with accountId, set expiration date and code
};

exports.roles = function (req, res) {
  //find account with authId,
  //if none found return unauthorized
};

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

  client.get("registration_account:" + phoneNumber, function (err, value) {
    if (err) {
      return handleError(res, err);
    }

    var regAcc = JSON.stringify({
      lastAttempt: Date.now(),
      attemptsCount: NUM_SENDING_COUNT
    });
    if (!value) {
      registerAccount(phoneNumber, regAcc, function (regData) {
        registerData(res, phoneNumber, regData);
      });
    }
    else {
      value = JSON.parse(value);
      var timePassedSinceLastAttempt = Date.now() - value.lastAttempt;
      if (timePassedSinceLastAttempt >= PHONE_BLOCK_TIME) {
        value.attemptsCount = NUM_SENDING_COUNT;
        regAcc = JSON.stringify(value);
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
