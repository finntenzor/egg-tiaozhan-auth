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
  let setConfig;
  let getConfig;
  const dep = new Dependency();
  before(async () => {
    app = mock.app({
      baseDir: 'apps/main',
    });
    await app.ready();
    setConfig = (key, value) => {
      app.config.tiaozhanAuth[key] = value;
    };
    getConfig = key => app.config.tiaozhanAuth[key];
    setConfig('userToPermissions', (ctx, user) => {
      return user ? user.permissions : [];
    });
  });

  after(() => app.close());
  afterEach(mock.restore);

  describe.skip('#Skip', () => {
    dep.register('Skip');
    let id = 1;
    const build = (permissions, auth) => {
      it('should pass #' + id, async () => {
        setConfig('userToPermissions', () => permissions);
        setConfig('skip', true);
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

  describe('#Permission Mock', () => {
    dep.register('Permission Mock');

    beforeEach(async () => {
      setConfig('userToPermissions', (ctx, user) => {
        return user ? user.permissions : [];
      });
    });

    it('should can mock', () => {
      assert(app.mockUser);
      assert(app.mockUserContext);
    });

    it('should has permissions', () => {
      const ctx = app.mockUserContext({
        permissions: [ 'read', 'write' ],
      });
      const permissions = getConfig('userToPermissions')(ctx, ctx.user);

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

    beforeEach(async () => {
      assert(app.mockUser);
      app.mockUser({
        permissions: [ 'read' ],
      });
      setAuth(HomeController.prototype, 'index', 'read');
      setConfig('userToPermissions', (ctx, user) => {
        return user ? user.permissions : [];
      });
    });

    it('should pass if set pass', async () => {
      setConfig('onPass', 'pass');
      const response = await request();

      assert(response);
      assert(response.text);
      assert(response.text === 'tiaozhan');
    });

    it('should log if set log', async () => {
      setConfig('onPass', 'log');
      await request();
      app.expectLog('Auth pass');
    });
  });
});
