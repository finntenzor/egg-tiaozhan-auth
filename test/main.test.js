'use strict';

const mock = require('egg-mock');
const HomeController = require('./fixtures/apps/main/app/controller/home');
const assert = require('assert');
const util = require('./util');

const tiaozhanAuth = require('../dist');
const setAttrs = tiaozhanAuth.setAttrs;
const getAttrs = tiaozhanAuth.getAttrs;
const addAttrs = tiaozhanAuth.addAttrs;
const setAuth = tiaozhanAuth.setAuth;
const getAuth = tiaozhanAuth.getAuth;
const getAuthFromRoute = tiaozhanAuth.getAuthFromRoute;
const checkHasAuth = tiaozhanAuth.checkHasAuth;
const checkCanPass = tiaozhanAuth.checkCanPass;
const GuardStatus = tiaozhanAuth.GuardStatus;
const staticAuthMiddlware = tiaozhanAuth.staticAuthMiddlware;
const buildAllProcess = tiaozhanAuth.buildAllProcess;

describe('test/main.test.js', () => {
  let app;
  const dep = util.dep;

  before(async () => {
    app = mock.app({
      baseDir: 'apps/main',
    });
    await app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  describe('#Router', () => {
    dep.register('Router');

    it('should has Controller and key', () => {
      const match = app.router.match('/', 'GET');
      const firstLayer = match.path[0];
      const stack = [ ...firstLayer.stack ];
      const lastMiddleware = stack.pop();

      assert(lastMiddleware);
      assert(lastMiddleware.Controller);
      assert(lastMiddleware.key);
      assert(lastMiddleware.Controller === HomeController);
      assert(lastMiddleware.Controller.prototype === HomeController.prototype);
      assert(lastMiddleware.key === 'index');
    });

    it('should has currentRoute', () => {
      const ctx = app.mockContext();

      assert(ctx.currentRoute.Controller);
      assert(ctx.currentRoute.methodName);
      assert(ctx.currentRoute.Controller === HomeController);
      assert(ctx.currentRoute.Controller.prototype === HomeController.prototype);
      assert(ctx.currentRoute.methodName === 'index');
    });
  });

  describe('#Attr', () => {
    dep.need('Router');
    dep.register('Attr');

    afterEach(() => {
      setAttrs(HomeController.prototype, undefined);
    });

    it('should be null if not set', () => {
      const attrs = getAttrs(HomeController.prototype);

      assert(attrs === null);
    });

    it('should has attrs if set', () => {
      setAttrs(HomeController.prototype, { message: 'Auth' });
      const attrs = getAttrs(HomeController.prototype);

      assert(attrs);
      assert(attrs.message);
      assert(attrs.message === 'Auth');
    });

    it('should be null again if not set', () => {
      const attrs = getAttrs(HomeController.prototype);

      assert(attrs === null);
    });

    it('should has tow attrs if add', () => {
      addAttrs(HomeController.prototype, { one: 'One' });
      addAttrs(HomeController.prototype, { two: 'Two' });
      const attrs = getAttrs(HomeController.prototype);

      assert(attrs);
      assert(attrs.one);
      assert(attrs.one === 'One');
      assert(attrs.two);
      assert(attrs.two === 'Two');
    });

    it('should get null if not set auth', () => {
      const auth = getAuth(HomeController.prototype, 'index');

      assert(auth === null);
    });

    it('should be right if set auth', () => {
      setAuth(HomeController.prototype, 'index', 'right');
      const auth = getAuth(HomeController.prototype, 'index');

      assert(auth === 'right');
    });

    it('should be left if set auth again', () => {
      setAuth(HomeController.prototype, 'index', 'right');
      setAuth(HomeController.prototype, 'index', 'left');
      const auth = getAuth(HomeController.prototype, 'index');

      assert(auth === 'left');
    });

    it('should has auth perm1 if set', () => {
      const ctx = app.mockContext();
      setAuth(HomeController.prototype, 'index', 'perm1');
      const auth = getAuthFromRoute(ctx.currentRoute);

      assert(auth === 'perm1');
    });

    it('should has auth perm1 and perm2 if set', () => {
      const ctx = app.mockContext();
      setAuth(HomeController.prototype, 'index', [ 'perm1', 'perm2' ]);
      const auth = getAuthFromRoute(ctx.currentRoute);

      assert(auth.length === 2);
      assert(auth[0] === 'perm1');
      assert(auth[1] === 'perm2');
    });

    it('should has complex auth if set', () => {
      const ctx = app.mockContext();
      const complexAuth = can => can('perm1') || can([ 'perm2', 'perm3' ]);
      setAuth(HomeController.prototype, 'index', complexAuth);
      const auth = getAuthFromRoute(ctx.currentRoute);

      assert(auth === complexAuth);
    });
  });

  describe('#Permission Mock', () => {
    dep.register('Permission Mock');

    before(() => {
      Object.assign(app.config.tiaozhanAuth, {
        skip: false,
        userToPermissions: (_, user) => {
          return user.permissions;
        },
        alwaysReloadConfig: true,
        onPass: 'pass',
        onMissRoute: 'throw',
        onNotLogin: 'abort',
        onInvalidSymbol: 'throw',
        onNoPermission: 'abort',
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
      const permissions = app.config.tiaozhanAuth.userToPermissions(ctx, ctx.user);

      assert(permissions);
      assert(permissions.length === 2);
      assert(permissions[0] === 'read');
      assert(permissions[1] === 'write');
    });
  });

  describe('#Skip', () => {
    dep.need([ 'Router', 'Attr', 'Permission Mock' ]);
    dep.register('Skip');
    let id = 1;
    let currentPermissions;

    before(() => {
      app.mockUser();
      Object.assign(app.config.tiaozhanAuth, {
        skip: true,
        userToPermissions: () => {
          return currentPermissions;
        },
        alwaysReloadConfig: true,
        onPass: 'pass',
        onMissRoute: 'throw',
        onNotLogin: 'abort',
        onInvalidSymbol: 'throw',
        onNoPermission: 'abort',
      });
    });

    after(() => {
      tiaozhanAuth.setAuth(HomeController.prototype, 'index', undefined);
    });

    const build = (permissions, auth) => {
      it('should pass #' + id, async () => {
        currentPermissions = permissions;
        tiaozhanAuth.setAuth(HomeController.prototype, 'index', auth);

        const response = await app.httpRequest().get('/');
        const text = response.text;
        const status = response.status;

        assert(text);
        assert(text === 'tiaozhan');
        assert(status === 200);
      });
      id++;
    };

    for (const [ permissions, auth ] of util.checkCases) {
      build(permissions, auth);
    }
  });

  describe('#Check 1', () => {
    dep.register('Check 1');

    let id = 1;

    const build = (permissions, auth, result) => {
      it('should be correct #' + id, () => {
        assert(checkHasAuth(permissions, auth) === result);
      });
      id++;
    };

    for (const [ permissions, auth, result ] of util.checkCases) {
      build(permissions, auth, result);
    }
  });

  describe('#Check 2', () => {
    dep.need([ 'Router', 'Attr' ]);
    dep.register('Check 2');

    let ctx;
    let id = 1;
    const options = {
      skip: false,
      userToPermissions: () => [],
      onPass: 'pass',
      onMissRoute: 'log',
      onNotLogin: 'throw',
      onInvalidSymbol: 'log',
      onNoPermission: 'throw',
    };

    before(() => {
      ctx = app.mockContext();
    });

    beforeEach(() => {
      setAuth(HomeController.prototype, 'index', undefined);
    });

    after(() => {
      setAuth(HomeController.prototype, 'index', undefined);
    });

    it('should pass if no auth set', () => {
      assert(checkCanPass(options, ctx) === GuardStatus.PASS);
    });

    it('should pass if login', () => {
      ctx.isAuthenticated = () => true;
      setAuth(HomeController.prototype, 'index', tiaozhanAuth.LOGIN);
      assert(checkCanPass(options, ctx) === GuardStatus.PASS);
    });

    it('should not login if not login', () => {
      ctx.isAuthenticated = () => false;
      setAuth(HomeController.prototype, 'index', tiaozhanAuth.LOGIN);
      assert(checkCanPass(options, ctx) === GuardStatus.NOT_LOGIN);
    });

    it('should boom if invalid symbol', () => {
      ctx.isAuthenticated = () => true;
      setAuth(HomeController.prototype, 'index', Symbol('hello'));
      assert(checkCanPass(options, ctx) === GuardStatus.INVALID_SYMBOL);
    });

    it('should not login if not login 2', () => {
      ctx.isAuthenticated = () => false;
      setAuth(HomeController.prototype, 'index', 'read');
      assert(checkCanPass(options, ctx) === GuardStatus.NOT_LOGIN);
    });

    const build = (permissions, auth, result) => {
      it('should be correct #' + id, () => {
        ctx.isAuthenticated = () => true;
        options.userToPermissions = () => permissions;
        setAuth(HomeController.prototype, 'index', auth);
        if (result) {
          assert(checkCanPass(options, ctx) === GuardStatus.PASS);
        } else {
          assert(checkCanPass(options, ctx) === GuardStatus.NO_PERMISSION);
        }
      });
      id++;
    };

    for (const [ permissions, auth, result ] of util.checkCases) {
      build(permissions, auth, result);
    }
  });

  describe('#Build All Process', () => {
    dep.register('Build All Process');
    let id = 0;

    const build = (key, strategy, callback) => {
      id++;
      let strategyText;
      if (typeof strategy === 'string') {
        strategyText = strategy;
      } else if (typeof strategy === 'function') {
        strategyText = strategy.toString().substr(0, 10) + '...';
      } else {
        strategyText = JSON.stringify(strategy);
      }
      it(`#${id} ${key} at ${strategyText}`, async () => {
        const options = {
          skip: false,
          userToPermissions: () => {
            throw new Error('You have to implements your own `userToPermissions` function.');
          },
          alwaysReloadConfig: false,
          onPass: 'pass',
          onMissRoute: 'throw',
          onNotLogin: 'abort',
          onInvalidSymbol: 'throw',
          onNoPermission: 'abort',
        };
        options[key] = strategy;
        const process = buildAllProcess(options);
        await callback(process[key]);
      });
    };

    const fackContext = log => {
      return {
        logger: {
          error: log,
          warn: log,
          info: log,
        },
        request: {
          path: 'Fake Path',
        },
        currentRoute: {
          Controller: HomeController,
          methodName: 'index',
        },
      };
    };

    const suit = (key, status, messageReg) => {
      build(key, 'pass', async process => {
        let status = false;
        await process(null, () => {
          status = true;
          return Promise.resolve();
        });

        assert(status);
      });

      build(key, 'log', async process => {
        let callLog = false;
        let callNext = false;
        let message;
        await process(fackContext(msg => {
          callLog = true;
          message = msg;
        }), () => {
          callNext = true;
          return Promise.resolve();
        });

        assert(callLog && callNext && messageReg.test(message));
      });

      build(key, 'throw', async process => {
        let hasThrow = false;
        let message;
        try {
          await process(fackContext(null));
        } catch (err) {
          hasThrow = true;
          message = err.message;
        }
        assert(hasThrow && messageReg.test(message));
      });

      build(key, 'abort', async process => {
        const ctx = fackContext();
        await process(ctx);

        assert(messageReg.test(ctx.body));
        assert(ctx.status === status);
      });

      (() => {
        const cCtx = fackContext();
        const cAuth = [ 'read', 'write' ];
        const cNext = () => Promise.resolve();
        const status = {
          ctx: false,
          auth: false,
          next: false,
        };

        const middleware = (ctx, auth, next) => {
          status.ctx = ctx === cCtx;
          status.auth = auth === cAuth;
          status.next = next === cNext;
          return 'tiaozhan';
        };

        build(key, middleware, async process => {
          setAuth(HomeController.prototype, 'index', cAuth);
          await process(cCtx, cNext);

          assert(status.ctx && status.auth && status.next);
          assert(cCtx.body === 'tiaozhan');
        });
      })();

      (() => {
        const cCtx = fackContext();
        const cAuth = can => can('edit') || can([ 'read', 'write' ]);
        const cNext = () => Promise.resolve();
        const status = {
          ctx: false,
          auth: false,
          next: false,
        };

        const middleware = (ctx, auth, next) => {
          status.ctx = ctx === cCtx;
          status.auth = auth === cAuth;
          status.next = next === cNext;
          return Promise.resolve('tiaozhan');
        };

        build(key, middleware, async process => {
          setAuth(HomeController.prototype, 'index', cAuth);
          await process(cCtx, cNext);

          assert(status.ctx && status.auth && status.next);
          assert(cCtx.body === 'tiaozhan');
        });
      })();
    };

    suit('onPass', 500, /Auth pass/);
    suit('onMissRoute', 500, /has no route/);
    suit('onNotLogin', 401, /not logined/);
    suit('onInvalidSymbol', 500, /Invalid Symbol/);
    suit('onNoPermission', 403, /no perrmission/);
  });

  describe('#Static Auth Middleware Correct Branch', () => {
    dep.need([ 'Check 1', 'Check 2' ]);
    dep.register('Static Auth Middleware Correct Branch');

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
    const cases = util.staticMiddlwareCases;
    before(() => {
      Object.assign(app.config.tiaozhanAuth, {
        skip: false,
        userToPermissions: (_, user) => {
          return user.permissions;
        },
        alwaysReloadConfig: true,
        onPass: 'pass',
        onMissRoute: 'throw',
        onNotLogin: 'abort',
        onInvalidSymbol: 'throw',
        onNoPermission: 'abort',
      });
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
});
