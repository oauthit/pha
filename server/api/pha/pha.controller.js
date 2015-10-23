'use strict';

var _ = require('lodash');

exports.mobileNumber = function(req, res) {
  if (req.body.mobileNumber) {
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
  }
};

exports.createAccessToken = function(req, res) {
  //get sms code and code from client,
  //find regdata by mobile number
  //check regdata for code, sms code and mobile number
  //if code and sms code not match decrement sms attempt count
  //if attempt count is 0, then redirect to sms code sending to mobile and delete regdata
  //find accounts with mobile number
  //if no accounts create new account and new access token with accountId, set expiration date and code
};

exports.getAccessToken = function (req, res) {
  //find account with authId,
  //if none found return unauthorized
};
