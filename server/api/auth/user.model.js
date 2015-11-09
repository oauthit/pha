'use strict';

var dynamoose = require('dynamoose')
  , bcrypt = require("bcrypt-nodejs")
  , Schema = dynamoose.Schema;

var UserSchema = new Schema({
  id: {
    type: String,
    hashKey: true
  },
  local: {
    email: String,
    password: String
  }
});

UserSchema.methods.hashPassword = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync());
};

UserSchema.methods.validatePassword = function(password) {
  return bcrypt.compareSync(password, this.local.password);
};

module.exports = dynamoose.model('User', UserSchema);
