'use strict';

const assert = require('assert');

module.exports = app => {
  assert(app.config.coreMiddleware.includes('passportInitialize'), '[egg-tiaozhan-auth] passport middleware must exists');
  assert(app.config.coreMiddleware.includes('passportSession'), '[egg-tiaozhan-auth] passport middleware must exists');
};
