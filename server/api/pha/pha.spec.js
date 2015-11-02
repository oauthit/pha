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
  var requestStub;
  beforeEach(function (done) {
    requestStub = sinon.stub(req, 'get').yieldsAsync(null, {statusCode: 200});
    done();
  });

  afterEach(function () {
    requestStub.restore();
  });

  it('should return code and sms code', function (done) {
    var phoneNumber = 12345;
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
});

describe('POST /api/pha/token', function () {
  var accountCreateStub, accountScanStub, accessCreateTokenStub;
  var regData = {
    attemptsCount: 3,
    smsCode: 'code',
    code: 'code',
    phoneNumber: 'phoneNumber'
  };
  beforeEach(function () {
    accountCreateStub = sinon.stub(Account, 'create');
    accountScanStub = sinon.stub(Account, 'scan');
    accessCreateTokenStub = sinon.stub(AccessToken, 'create');
    this.stub = sinon.stub(InMemory.prototype, 'get').yieldsAsync(null, regData);
  });

  afterEach(function () {
    accountCreateStub.restore();
    accountScanStub.restore();
    accessCreateTokenStub.restore();
    this.stub.restore();
  });

  it('should create new access token', function (done) {
    var account = {
      id: uuid.v4(),
      smsCode: 'smsCode',
      code: 'code',
      phoneNumber: 'phoneNumber'
    };
    var accessToken = {
      accountId: account.id
    };
    accountScanStub.yields(null, null);
    accountCreateStub.yields(null, account);
    accessCreateTokenStub.yields(null, accessToken);

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
});
