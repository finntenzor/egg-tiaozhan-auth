'use strict';

const mock = require('egg-mock');
const HomeController = require('./fixtures/apps/main/app/controller/home');
const assert = require('assert');
const util = require('./util');
const Dependency = util.Dependency;

const tiaozhanAuth = require('../dist');
const setAuth = tiaozhanAuth.setAuth;

describe('test/config-main.test.js', () => {
  let app;
  const dep = new Dependency();

  before(() => {
    app = mock.app({
      baseDir: 'apps/main',
      tiaozhanAuth: {
        skip: true,
        userToPermissions: (ctx, user) => {
          console.log('[i think you are fucking kidding me]', user);
          if (!user) {
            return [];
          }
          return user.permissions;
        },
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

  describe('#Permission Mock', () => {
    dep.register('Permission Mock');

    it('should can mock', () => {
      assert(app.mockUser);
      assert(app.mockUserContext);
    });

    it('should has permissions', () => {
      const ctx = app.mockUserContext({
        permissions: [ 'read', 'write' ],
      });
      const permissions = app.options.tiaozhanAuth.userToPermissions(ctx, ctx.user);

      assert(permissions);
      assert(permissions.length === 2);
      assert(permissions[0] === 'read');
      assert(permissions[1] === 'write');
    });
  });

  describe('#On Pass', () => {
    dep.need('Permission Mock');
    dep.register('On Pass');

    const request = () => app.httpRequest().get('/');

    before(async () => {
      assert(app.mockUser);
      app.mockUser({
        permissions: [ 'read' ],
      });
      setAuth(HomeController.prototype, 'index', 'read');
    });

    it('should pass if set pass', async () => {
      app.options.tiaozhanAuth.onPass = 'pass';
      const response = await request();

      assert(response);
      assert(response.text);
      assert(response.text === 'tiaozhan');
    });

    it('should log if set log', async () => {
      app.options.tiaozhanAuth.onPass = 'log';
      await request();
      app.expectLog('Auth pass');
    });
  });
});
