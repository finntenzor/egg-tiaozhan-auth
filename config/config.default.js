'use strict';

/**
 * egg-tiaozhan-auth default config
 * @member Config#tiaozhanAuth
 * @property {String} SOME_KEY - some description
 */
exports.tiaozhanAuth = {
  skip: false,
  userToPermissions: () => [],
  onPass: 'pass',
  onMissRoute: 'log',
  onNotLogin: 'throw',
  onInvalidSymbol: 'log',
  onNoPermission: 'throw',
};
