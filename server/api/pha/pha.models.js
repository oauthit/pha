'use strict';

var dynamoose = require('dynamoose'),
    Schema = dynamoose.Schema;

var AccountSchema = new Schema({
  id: {
    type: String,
    hashKey: true
  },
  phoneNumber: {
    type: String
  },
  disabled: {
    type: Boolean
  }
});

exports.account = dynamoose.model('AuthAccount', AccountSchema);

var AccessTokenSchema = new Schema({
  id: {
    type: String,
    hashKey: true
  },
  accountId: {
    type: String
  },
  expiresAt: {
    type: Number
  },
  code: {
    type: String,
    required: true
  }
});

exports.accessToken = dynamoose.model('AccessToken', AccessTokenSchema);
