'use strict';

var express = require('express');
var controller = require('./pha.controller');

var router = express.Router();

router.post('/auth', controller.auth);
router.post('/token', controller.token);
router.get('/roles', controller.roles);

module.exports = router;
