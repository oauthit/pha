'use strict';

var express = require('express');
var authConfig = require('../../config/auth.config');

var router = express.Router();

router.post("/login", authConfig.localLogin);

router.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

router.post("/register", authConfig.localRegister);

module.exports = router;
