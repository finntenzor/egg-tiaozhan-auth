'use strict';

/**
 * egg-tiaozhan-auth default config
 * @member Config#tiaozhanAuth
 * @property {String} SOME_KEY - some description
 */
exports.tiaozhanAuth = {
  skip: false,
  userToPermissions: () => {
    throw new Error('You have to implements your own `userToPermissions` function.');
  },
  alwaysReloadConfig: false,
  onPass: 'pass',
  onMissRoute: 'log',
  onNotLogin: 'throw',
  onInvalidSymbol: 'log',
  onNoPermission: 'throw',
};
