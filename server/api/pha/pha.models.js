'use strict';

var dynamoose = require('dynamoose'),
    Schema = dynamoose.Schema;

var AccountSchema = new Schema({
  phoneNumber: {
    type: String,
    hashKey: true
  },
  disabled: {
    type: Boolean
  }
});

exports.account = dynamoose.model('Account', AccountSchema);

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
