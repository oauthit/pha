'use strict';

var express = require('express');
var controller = require('./pha.controller');

var router = express.Router();

router.post('/mobileNumber', controller.mobileNumber);
router.post('/accessToken', controller.createAccessToken);
router.get('/accessToken', controller.getAccessToken);

module.exports = router;
