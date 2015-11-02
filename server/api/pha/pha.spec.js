'use strict';

var should = require('should');
var app = require('../../app');
var request = require('supertest');
var req = require('request');
var sinon = require('sinon');
var Account = require('./pha.models').account;
var AccessToken = require('./pha.models').accessToken;
var uuid = require('node-uuid');
var InMemory = require('../../lib/inMemory');

describe('POST /api/pha/auth/:phoneNumber', function () {
  var requestStub, inMemoryRegAccountsGet, inMemoryRegAccountsSet;
  beforeEach(function (done) {
    requestStub = sinon.stub(req, 'get').yieldsAsync(null, {statusCode: 200});
    inMemoryRegAccountsGet = sinon.stub(InMemory.prototype, 'get');
    inMemoryRegAccountsSet = sinon.stub(InMemory.prototype, 'set');
    done();
  });

  afterEach(function () {
    requestStub.restore();
    inMemoryRegAccountsGet.restore();
    inMemoryRegAccountsSet.restore();
  });

  it('should return code and sms code', function (done) {
    var account = {
      attemptsCount: 3
    };

    var phoneNumber = '12345';
    inMemoryRegAccountsGet.withArgs(phoneNumber).yieldsAsync(null, account);
    inMemoryRegAccountsSet.withArgs(phoneNumber).yieldsAsync(null);
    request(app)
      .post('/api/pha/auth/' + phoneNumber)
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) return done(err);
        res.body.should.have.property('phoneNumber');
        res.body.should.have.property('code');
        res.body.should.have.property('smsCode');
        done();
      });
  });

  it('should create registration account if not already in memory', function (done) {
    var phoneNumber = '12345';

    inMemoryRegAccountsGet.withArgs(phoneNumber).yieldsAsync(null, null);
    inMemoryRegAccountsSet.withArgs(phoneNumber).yieldsAsync(null);

    request(app)
      .post('/api/pha/auth/' + phoneNumber)
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) return done(err);
        res.body.should.have.property('phoneNumber');
        res.body.should.have.property('code');
        res.body.should.have.property('smsCode');
        done();
      });
  });

  it('should block sms sending attempts if attempts exceeded', function (done) {
    var phoneNumber = '123423415';
    var account = {
      attemptsCount: 0,
      lastAttempt: Date.now()
    };
    inMemoryRegAccountsGet.withArgs(phoneNumber).yieldsAsync(null, account);
    request(app)
      .post('/api/pha/auth/' + phoneNumber)
      .expect(403)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
  });

  it('should allow send sms if blocking time passed since last attempt', function (done) {
    var phoneNumber = '12453512';
    var account = {
      attemptsCount: 0,
      lastAttempt: Date.now() - 24 * 60 * 60 * 1000
    };

    inMemoryRegAccountsGet.withArgs(phoneNumber).yieldsAsync(null, account);
    inMemoryRegAccountsSet.withArgs(phoneNumber).yieldsAsync(null);

    request(app)
      .post('/api/pha/auth/' + phoneNumber)
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function (err) {
        if (err) return done(err);
        done();
      });
  });
});

describe('POST /api/pha/token', function () {
  var accountCreateStub
    , accountScanStub
    , accessCreateTokenStub
    , inMemoryRegData
    , inMemoryRegDataDel;

  var regData = {
    attemptsCount: 3,
    smsCode: 'code',
    code: 'code',
    phoneNumber: 'phoneNumber'
  };
  var account = {
    id: uuid.v4(),
    smsCode: 'smsCode',
    code: 'code',
    phoneNumber: 'phoneNumber'
  };
  var accessToken = {
    accountId: account.id
  };
  beforeEach(function () {
    accountCreateStub = sinon.stub(Account, 'create');
    accountScanStub = sinon.stub(Account, 'scan');
    accessCreateTokenStub = sinon.stub(AccessToken, 'create');
    inMemoryRegData = sinon.stub(InMemory.prototype, 'get');
    inMemoryRegDataDel = sinon.stub(InMemory.prototype, 'del');
  });

  afterEach(function () {
    accountCreateStub.restore();
    accountScanStub.restore();
    accessCreateTokenStub.restore();
    inMemoryRegData.restore();
    inMemoryRegDataDel.restore();
  });

  it('should create new access token', function (done) {

    accountScanStub.yields(null, null);
    accountCreateStub.yields(null, account);
    accessCreateTokenStub.yields(null, accessToken);
    inMemoryRegData.yieldsAsync(null, regData);

    request(app)
      .post('/api/pha/token')
      .send(account)
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) return done(err);
        res.body.should.have.property('accountId');
        done();
      });
  });

  it('should check if sms code valid', function (done) {
    inMemoryRegData.withArgs(account.phoneNumber).yieldsAsync(null, null);

    request(app)
      .post('/api/pha/token')
      .send(account)
      .expect(403)
      .expect('Content-Type', /json/)
      .end(function (err) {
        if (err) return done(err);
        done();
      });
  });

  it('should check sms code attempts', function (done) {
    var regData = {
      attemptsCount: 0
    };
    inMemoryRegData.withArgs(account.phoneNumber).yieldsAsync(null, regData);
    inMemoryRegDataDel.withArgs(account.phoneNumber).yieldsAsync(null);
    request(app)
      .post('/api/pha/token')
      .send(account)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err) {
        if (err) return done(err);
        done();
      });
  });


});

describe('GET /api/pha/roles', function () {
  var accessTokenScan, accountGet;
  beforeEach(function () {
    accessTokenScan = sinon.stub(AccessToken, 'scan');
    accountGet = sinon.stub(Account, 'get');
  });
  afterEach(function () {
    accessTokenScan.restore();
    accountGet.restore();
  });

  it('should return account if user authorized', function (done) {
    var accessToken = 'acccessToken';
    var account = {
      id: uuid.v4()
    };
    var accessTokens = [
      {
        accountId: account.id
      }
    ];
    accessTokenScan.withArgs({code: accessToken}).yieldsAsync(null, accessTokens);
    accountGet.withArgs(accessTokens[0].accountId).yieldsAsync(null, account);

    request(app)
      .get('/api/pha/roles?accessToken=' + accessToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) return done(err);
        res.body.should.have.property('id');
        done();
      });
  });
});
