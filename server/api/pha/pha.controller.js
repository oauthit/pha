'use strict';

let crypto = require('crypto');
let request = require('request');
let uuid = require('node-uuid');
let co = require('co');
let redis = require('redis');
let redisClient = redis.createClient();
let Account = require('./pha.models').account;
let AccessToken = require('./pha.models').accessToken;
let NUM_SENDING_COUNT = process.env.PHONE_NUMBER_SENDING_COUNT || 3;
let SMS_SENDING_COUNT = process.env.SMS_SENDING_COUNT || 3;
let PHONE_BLOCK_TIME = process.env.PHONE_NUMBER_BLOCKING_TIME || 24 * 60 * 60 * 1000;
let TOKEN_EXISTENCE_TIME = process.env.TOKEN_EXISTENCE_TIME || 24 * 60 * 60 * 1000;
let SMS_SERVICE_TOKEN = process.env.SMS_SERVICE_TOKEN;
const REG_ACCOUNTS = 'REG_ACCOUNTS';
const REG_DATA = 'REG_DATA';

redisClient.on("error", function (err) {
  console.log("Error" + err);
});

exports.auth = function (req, res) {

  var phoneNumber = req.params.phoneNumber || undefined;
  if (!phoneNumber) {
    return res.send(400, {
      message: 'Phone number must be passed'
    });
  }

  function getRegAccount(phoneNumber) {
    return new Promise(function (resolve) {
      redisClient.get(`${REG_ACCOUNTS}:${phoneNumber}`, function (err, account) {
        if (err) {
          reject(err);
        }
        resolve(account);
      });
    });
  }
  function *createRegAccount(phoneNumber, regAccount) {
    function registerAccount(regAccount) {
      return new Promise(function (resolve) {
        let key = `${REG_ACCOUNTS}:${regAccount.phoneNumber}`;
        let string = JSON.stringify(regAccount);
        redisClient.setex(key, 60, string, function (err) {
          if (err) {
          }
          resolve();
        });
      });
    }
    function *generateRegData(phoneNumber) {
      function generateSms() {
        return new Promise(function (resolve, reject) {
          crypto.randomBytes(3, function (err, buffer) {
            if (err) reject(err);
            var smsCode = parseInt(buffer.toString('hex'), 16).toString().substr(0, 6);
            resolve(smsCode);
          });
        });
      }
      function sendSmsMessage(phoneNumber, smsCode) {
        return new Promise(function (resolve, reject) {
          var message = 'Confirmation code: ' + smsCode;

          function callback(error, res) {
            if (!error && res.statusCode == 200) {
              console.log('Sms message sent...');
              console.log('Sms code: ' + smsCode);
              resolve();
            } else {
              reject('Sms was not sent!');
            }
          }

          //TODO: this by when sms provider will be in place
          setTimeout(function () {
            var res = {
              statusCode: 200
            };
            callback(null, res);
          }, 0);
          //var options = {
          //  url: "https://asa2.sistemium.com/r50d/util/sms",
          //  headers: {
          //    'authorization': SMS_SERVICE_TOKEN
          //  },
          //  form: {
          //    'phone': phoneNumber,
          //    'msg': message
          //  }
          //};
          //request.post(options, callback);
        });

      }

      let smsCode = yield generateSms();
      yield sendSmsMessage(phoneNumber, smsCode);
      let code = crypto.createHash('sha1').update(phoneNumber.toString()).digest('hex');
      let data = {
        code: code,
        smsCode: smsCode,
        phoneNumber: phoneNumber,
        smsSendingAttempts: SMS_SENDING_COUNT
      };
      return data;
    }
    function regData(data) {
      return new Promise(function (resolve, reject) {
        let key = `${REG_DATA}:${data.phoneNumber}`;
        let string = JSON.stringify(data);
        redisClient.setex(key, 60, string, function (err) {
          if (err) reject();
          resolve(data);
        })
      });
    }

    if (!regAccount) {
      regAccount = {
        lastAttempt: Date.now(),
        attemptsCount: NUM_SENDING_COUNT,
        phoneNumber: phoneNumber
      };
    } else {
      regAccount.attemptsCount--;
      if (regAccount.attemptsCount > 0) {
        regAccount.lastAttempt = Date.now();
      }
    }

    yield registerAccount(regAccount);
    let data = yield* generateRegData(phoneNumber);
    return data = yield regData(data);
  }

  if (phoneNumber) {
    co(function *() {
        try {
          let regAccount = yield getRegAccount(phoneNumber);

          let data = yield* createRegAccount(phoneNumber, regAccount);
          return res.json(201, {
            code: data.code,
            phoneNumber: data.phoneNumber
          });
        } catch (err) {
          console.log(err);
        }
      }
    ).catch(function (err) {
      console.log(err);
    });
  }
};

exports.token = function (req, res) {
  let fromBody = req.body;
  let smsCode = fromBody.smsCode || undefined;
  let code = fromBody.code || undefined;
  let phoneNumber = fromBody.phoneNumber || undefined;
  fromBody.id ? fromBody.id : fromBody.id = uuid.v4();

  function *checkIfSmsCodeValid(data) {
    function getRegData(phoneNumber) {
      return new Promise(function (resolve, reject) {
        let key = `${REG_DATA}:${phoneNumber}`;
        redisClient.get(key, function (err, str) {
          if (err) {
            reject(err);
          }
          if (!str) {
            reject();
          }
          resolve(JSON.parse(str));
        });
      });
    }

    function delRegData(phoneNumber) {
      return new Promise(function (resolve, reject) {
        let key = `${REG_DATA}:${phoneNumber}`;
        redisClient.set(key, '', 'EX', 1, function (err) {
          if (err) {
            reject(err);
          }
          resolve();
        })
      })
    }

    function setRegData(data) {
      return new Promise(function (resolve, reject) {
        let key = `${REG_DATA}:${data.phoneNumber}`;
        let string = JSON.stringify(data);
        redisClient.set(key, string, function (err) {
          if (err) {
            reject(err);
          }
          resolve();
        });
      });
    }

    let regData = yield getRegData(data.phoneNumber);
    if (regData.attemptsCount <= 0) {
      yield delRegData(data.phoneNumber);
    }
    if (!(regData.smsCode === data.smsCode && regData.phoneNumber === data.phoneNumber && regData.code === data.code)) {
      regData.attemptsCount--;
      yield setRegData(regData);
    }
  }

  function findAccount(phoneNumber) {
    function scanAccount(phoneNumber) {
      return new Promise(function (resolve, reject) {
        Account.scan({phoneNumber: phoneNumber}, function (err, accounts) {
          if (err) {
            reject(err);
          }
          resolve(accounts);
        });
      });
    }

    return scanAccount(phoneNumber);
  }

  function *regAccount(accounts, phoneNumber) {
    function createAccount(account) {
      return new Promise(function (resolve, reject) {
        Account.create(account, function (err, account) {
          if (err) {
            reject();
          }
          resolve(account);
        })
      });
    }
    function createAccessToken(accessToken) {
      return new Promise(function (resolve, reject) {
        AccessToken.create(accessToken, function (err, accessToken) {
          if (err) {
            reject(err);
          }
          resolve(accessToken);
        })
      });
    }
    function formToken(id) {
      let token = crypto
        .createHash('md5')
        .update(uuid.v4())
        .digest('hex');

      let accessToken = {
        id: uuid.v4(),
        accountId: id,
        expiresAt: Date.now() + TOKEN_EXISTENCE_TIME,
        code: token
      };
      return accessToken;
    }

    let res;
    if (!accounts || !accounts.length) {
      let account = {
        id: uuid.v4(),
        phoneNumber: phoneNumber,
        disabled: false
      };
      account = yield createAccount(account);
      if (account) {
        let accToken = formToken(account.id);
        res = yield createAccessToken(accToken);
      }
    } else {
      let account = accounts[0];
      let accToken = formToken(account.id);
      res = yield createAccessToken(accToken);
    }
    return res;
  }

  if (smsCode && code && phoneNumber) {
    co(function *() {
      yield* checkIfSmsCodeValid(fromBody);
      let accounts = yield findAccount(phoneNumber);
      let accessToken = yield* regAccount(accounts, phoneNumber);
      return res.json(201, accessToken);
    });
  } else {
    // invalid validation
    return res.send(403);
  }
};

exports.roles = function (req, res) {
  var token = req.headers['authorization'] || req.query.accessToken;

  if (token) {
    co(function *() {
      function scanToken(token) {
        return new Promise(function (resolve, reject) {
          AccessToken.scan({code: token}, function (err, accessToken) {
            if (err) {
              reject(err);
            }
            resolve(accessToken);
          });
        });
      }
      function getAccount(id) {
        return new Promise(function(resolve, reject){
          Account.get(id, (err, account) => {
            if (err) {
              reject(err);
            }
            resolve(account);
          })
        });
      }

      let accTokens = yield scanToken(token);
      if (!accTokens || !accTokens.length) {
        return res.send(403);
      }
      let accToken = accTokens[0];
      let acc = yield getAccount(accToken.accountId);
      if (!acc) {
        return res.send(403);
      }
      return res.json(200, acc);
    });
  }
};
