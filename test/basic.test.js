'use strict';

const mock = require('egg-mock');
const HomeController = require('./fixtures/apps/main/app/controller/home');
const assert = require('assert');
const util = require('./util');
const Dependency = util.Dependency;
const checkCases = util.checkCases;

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

describe.skip('test/basic.test.js', () => {
  let app;
  const dep = new Dependency();

  before(() => {
    app = mock.app({
      baseDir: 'apps/main',
    });
    return app.ready();
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

  describe('#Check 1', () => {
    let id = 1;

    const build = (permissions, auth, result) => {
      it('should be correct #' + id, () => {
        assert(checkHasAuth(permissions, auth) === result);
      });
      id++;
    };

    for (const [ permissions, auth, result ] of checkCases) {
      build(permissions, auth, result);
    }
  });

  describe('#Check 2', () => {
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

    afterEach(() => {
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

    for (const [ permissions, auth, result ] of checkCases) {
      build(permissions, auth, result);
    }
  });
});
