'use strict';

var _ = require('lodash');
var crypto = require('crypto');
var redis = require('redis');
var client = redis.createClient();

client.on('error', function (err) {
  console.log('Error ' + err );
});

exports.auth = function (req, res) {

  var phoneNumber = req.params.phoneNumber;
  if (phoneNumber) {
    processPhoneNumber();
  }
  res.send(200);
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

function processPhoneNumber(phoneNumber) {
  function checkPhoneNumber(phoneNumber) {
    //TODO: implement validation
  }

  function generateCode(phoneNumber) {
    var smsCode = '';
    var code = ''
  }

  client.set("regdata", "value", redis.print);
  client.get("regdata", redis.print);
  //checkPhoneNumber(phoneNumber);
  //var phoneNumberInMemory = _.find(reqdata, {phoneNumber: phoneNumber});
  //if (!phoneNumberInMemory) {
  //  reqdata.push({
  //    phoneNumber: phoneNumber,
  //    lastAttempt: Date.now(),
  //    attemptsCount: process.env.PHONE_NUMBER_SENDING_COUNT
  //  });
  //} else {
  //  var timePassedSinceLastAttempt = Date.now() - phoneNumberInMemory.lastAttempt;
  //  if (timePassedSinceLastAttempt >= process.env.PHONE_NUMBER_BLOCKING_TIME) {
  //    phoneNumberInMemory.attemptsCount = process.env.PHONE_NUMBER_SENDING_COUNT;
  //  } else {
  //    res.send(400, {
  //      message: 'This phone number blocked for 24 hours'
  //    });
  //  }
  //  phoneNumberInMemory.attemptsCount--;
  //  generateCode(phoneNumber);
  //}
}
