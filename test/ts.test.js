'use strict';

const mock = require('egg-mock');
const coffee = require('coffee');
const path = require('path');
const assert = require('assert');
const util = require('./util');
const tiaozhanAuth = require('../dist');
const HomeController = require('./fixtures/apps/ts/app/controller/home.js').default;

describe('typescript', () => {
  let app;
  const dep = new util.Dependency();

  before(async () => {
    app = mock.app({
      baseDir: 'apps/ts',
    });
    await app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  describe('#Complie', () => {
    dep.register('Complie');
    it('should compile ts without error', () => {
      return coffee.fork(
        require.resolve('typescript/bin/tsc'),
        [ '-p', path.resolve(__dirname, './fixtures/apps/ts/tsconfig.json') ]
      )
        .debug()
        .expect('code', 0)
        .end();
    });
  });


  describe('#Attrs', () => {
    // dep.need('Complie');
    dep.register('Attrs');

    const buildCan = permissions => input => {
      return tiaozhanAuth.checkHasAuth(permissions, input);
    };

    it('should be read', () => {
      const auth = tiaozhanAuth.getAuth(HomeController.prototype, 'index');
      assert(auth === 'read');
    });

    it('should be read and write', () => {
      const auth = tiaozhanAuth.getAuth(HomeController.prototype, 'readAndWrite');
      assert(auth.length === 2);
      assert(auth[0] === 'read');
      assert(auth[1] === 'write');
    });

    it('should be read or write', () => {
      const auth = tiaozhanAuth.getAuth(HomeController.prototype, 'readOrWrite');
      assert(auth);
      assert(auth(buildCan([ 'read' ])));
      assert(auth(buildCan([ 'write' ])));
    });

    it('should be read & write or edit', () => {
      const auth = tiaozhanAuth.getAuth(HomeController.prototype, 'readAndWriteOrEdit');
      assert(auth);
      assert(auth(buildCan([ 'read', 'write' ])));
      assert(auth(buildCan([ 'edit' ])));
      assert(!auth(buildCan([ 'read' ])));
    });
  });

  describe('#TsCheck', () => {
    dep.need('Attrs');
    dep.register('TsCheck');
    let id = 0;
    const build = (url, permissions, result) => {
      id++;
      it(`#${id} should be ${result} with ${permissions.join(',')} to ${url}`, async () => {
        app.mockUser({
          permissions,
        });
        const { text, status } = await app.httpRequest().get(url);
        if (result) {
          assert(status === 200);
          assert(text === 'tiaozhan');
        } else {
          assert(status === 403);
          assert(/no permission/.test(text));
        }
      });
    };

    for (const [ url, permissions, result ] of util.tsCheckCases) {
      build(url, permissions, result);
    }

  });

});
