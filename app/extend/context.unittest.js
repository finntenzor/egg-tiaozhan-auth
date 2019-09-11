'use strict';

module.exports = {
  login() {
    return Promise.resolve();
  },

  logout() {
    return {};
  },

  isAuthenticated() {
    return !!this.user;
  },

  isUnauthenticated() {
    return !this.isAuthenticated();
  },
};
