'use strict';

const buildMiddleware = require('../dist');

module.exports = options => {
  return buildMiddleware(options);
};
