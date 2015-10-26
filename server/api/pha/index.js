'use strict';

var express = require('express');
var controller = require('./pha.controller');

var router = express.Router();

router.get('/roles', controller.roles);
router.post('/auth/:phoneNumber', controller.auth);
router.post('/token', controller.token);

module.exports = router;
