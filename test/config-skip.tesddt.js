'use strict';

const mock = require('egg-mock');
const HomeController = require('./fixtures/apps/main/app/controller/home');
const assert = require('assert');
const util = require('./util');
const Dependency = util.Dependency;
const checkCases = util.checkCases;

const tiaozhanAuth = require('../dist');
const setAuth = tiaozhanAuth.setAuth;

describe.skip('test/config-skip.test.js', () => {
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

  describe('#Skip', () => {
    dep.register('Skip');
    let id = 1;
    const build = (permissions, auth) => {
      it('should pass #' + id, async () => {
        app.options.tiaozhanAuth.skip = true;
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
});
