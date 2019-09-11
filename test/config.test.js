'use strict';

const mock = require('egg-mock');
const HomeController = require('./fixtures/apps/main/app/controller/home');
const assert = require('assert');
const util = require('./util');
const Dependency = util.Dependency;
const checkCases = util.checkCases;

const tiaozhanAuth = require('../dist');
const setAuth = tiaozhanAuth.setAuth;
const staticAuthMiddlware = tiaozhanAuth.staticAuthMiddlware;

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
    app.mockLog();
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

  describe('#Skip', () => {
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
        assert(text === 'tiaozhan');
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

  describe('#Static Auth Middleware', () => {
    const status = {
      onPass: false,
      onMissRoute: false,
      onNotLogin: false,
      onInvalidSymbol: false,
      onNoPermission: false,
      clear() {
        this.onPass = false;
        this.onMissRoute = false;
        this.onNotLogin = false;
        this.onInvalidSymbol = false;
        this.onNoPermission = false;
      },
    };
    const process = {
      onPass: (_, next) => {
        status.clear();
        status.onPass = true;
        return next();
      },
      onMissRoute: (_, next) => {
        status.clear();
        status.onMissRoute = true;
        return next();
      },
      onNotLogin: (_, next) => {
        status.clear();
        status.onNotLogin = true;
        return next();
      },
      onInvalidSymbol: (_, next) => {
        status.clear();
        status.onInvalidSymbol = true;
        return next();
      },
      onNoPermission: (_, next) => {
        status.clear();
        status.onNoPermission = true;
        return next();
      },
    };
    const fackRoute = {
      Controller: HomeController,
      methodName: 'index',
    };
    const cases = [
      [{ currentRoute: null }, null, 'onMissRoute' ],
      [{ currentRoute: fackRoute }, null, 'onPass' ],
      [{ currentRoute: fackRoute, isAuthenticated: () => true }, tiaozhanAuth.LOGIN, 'onPass' ],
      [{ currentRoute: fackRoute, isAuthenticated: () => false }, tiaozhanAuth.LOGIN, 'onNotLogin' ],
      [{ currentRoute: fackRoute }, Symbol('hello'), 'onInvalidSymbol' ],
      [{ currentRoute: fackRoute, isAuthenticated: () => false }, 'read', 'onNotLogin' ],
      [{ currentRoute: fackRoute, isAuthenticated: () => true, user: { permissions: [ 'read' ] } }, 'read', 'onPass' ],
      [{ currentRoute: fackRoute, isAuthenticated: () => true, user: { permissions: [ ] } }, 'read', 'onNoPermission' ],
    ];
    before(() => {
      app.config.tiaozhanAuth.skip = false;
      app.config.tiaozhanAuth.userToPermissions = (_, user) => user.permissions;
    });

    const build = (ctx, auth, key) => {
      it('should be ' + key, async () => {
        setAuth(HomeController.prototype, 'index', auth);
        await staticAuthMiddlware(process, app.config.tiaozhanAuth, ctx, () => Promise.resolve());

        assert(status[key]);
      });
    };
    for (const [ ctx, auth, key ] of cases) {
      build(ctx, auth, key);
    }
  });

  // describe('#On Pass', () => {
  //   dep.need('Permission Mock');
  //   dep.register('On Pass');

  //   const request = () => app.httpRequest().get('/');

  //   beforeEach(async () => {
  //     assert(app.mockUser);
  //     app.mockUser({
  //       permissions: [ 'read' ],
  //     });
  //     setAuth(HomeController.prototype, 'index', 'read');
  //     setConfig('userToPermissions', (ctx, user) => {
  //       return user ? user.permissions : [];
  //     });
  //   });

  //   it('should pass if set pass', async () => {
  //     setConfig('onPass', 'pass');
  //     const response = await request();

  //     assert(response);
  //     assert(response.status === 200);
  //     assert(response.text === 'tiaozhan');
  //   });

  //   it('should log if set log', async () => {
  //     setConfig('onPass', 'log');
  //     const response = await request();

  //     assert(response);
  //     assert(response.status === 200);
  //     assert(response.text === 'tiaozhan');
  //     // app.expectLog('Auth pass');
  //   });

  //   it('should abort if set abort', async () => {
  //     setConfig('onPass', 'abort');
  //     const response = await request();

  //     assert(response);
  //     assert(response.status === 500);
  //     assert(response.text === 'Auth pass');
  //   });
  // });
});
