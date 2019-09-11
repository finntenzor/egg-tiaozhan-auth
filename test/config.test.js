'use strict';

const mock = require('egg-mock');
const HomeController = require('./fixtures/apps/main/app/controller/home');
const assert = require('assert');
const util = require('./util');
const Dependency = util.Dependency;
const checkCases = util.checkCases;

const tiaozhanAuth = require('../dist');
const setAuth = tiaozhanAuth.setAuth;

describe('test/config.test.js', () => {
  let app;
  const dep = new Dependency();

  before(() => {
    app = mock.app({
      baseDir: 'apps/main',
      tiaozhanAuth: {
        skip: true,
        userToPermissions: () => [],
        onPass: 'pass',
        onMissRoute: 'log',
        onNotLogin: 'throw',
        onInvalidSymbol: 'log',
        onNoPermission: 'throw',
      },
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  describe.skip('#Skip', () => {
    dep.register('Skip');
    let id = 1;

    const build = (permissions, auth) => {
      it('should pass #' + id, async () => {
        app.options.tiaozhanAuth.skip = true;
        app.options.tiaozhanAuth.userToPermissions = () => permissions;
        setAuth(HomeController.prototype, 'index', auth);

        const response = await app.httpRequest().get('/');
        const text = response.text;
        const status = response.status;

        assert(text);
        assert(text === 'hi, tiaozhanAuth');
        assert(status === 200);
      });
      id++;
    };

    for (const [ permissions, auth ] of checkCases) {
      build(permissions, auth);
    }
  });

  describe('#Passport', () => {
    dep.register('Passport');
    it('should has passport', async () => {
      assert(app.mockUser);
      app.mockUser();

      setAuth(HomeController.prototype, 'index', 'read');
      const response = await app.httpRequest().get('/');

      assert(response.status === 500);
    });
    // it('should error', async () => {
    //   app.options.tiaozhanAuth.skip = false;
    //   app.options.tiaozhanAuth.userToPermissions = () => [];
    //   setAuth(HomeController.prototype, 'index', 'read');

    //   const ctx = app.mockContext({
    //     isAuthenticated: () => true,
    //     user: {
    //       name: 'tiaozhan',
    //     },
    //   });
    //   // assert(response.text === 'ddd');
    // });
  });
});
