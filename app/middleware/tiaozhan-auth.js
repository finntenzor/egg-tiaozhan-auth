'use strict';

const buildMiddleware = require('../../dist').buildMiddleware;

module.exports = options => {
  return buildMiddleware(options);
};
