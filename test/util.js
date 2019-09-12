'use strict';

const HomeController = require('./fixtures/apps/main/app/controller/home');
const tiaozhanAuth = require('../dist');

class Dependency {
  constructor() {
    this.status = {};
  }

  need(key) {
    const status = this.status;
    // tslint:disable-next-line: ter-prefer-arrow-callback
    before(function() {
      if (typeof key === 'string') {
        if (!status[key]) {
          this.skip();
        }
      } else {
        for (const k of key) {
          if (!status[k]) {
            this.skip();
          }
        }
      }
    });
  }

  register(key) {
    const status = this.status;
    status[key] = false;
    // tslint:disable-next-line: ter-prefer-arrow-callback
    after(function() {
      if (this.currentTest.state === 'passed') {
        status[key] = true;
      }
    });
  }
}

exports.Dependency = Dependency;

const checkCases = [
  [[ 'read' ], 'read', true ],
  [[], 'read', false ],
  [[ 'read', 'write' ], [ 'read', 'write' ], true ],
  [[ 'read' ], [ 'read', 'write' ], false ],
  [[ 'write' ], [ 'read', 'write' ], false ],
  [[], [ 'read', 'write' ], false ],
  [[ 'read' ], can => can('read') || can('write'), true ],
  [[ 'write' ], can => can('read') || can('write'), true ],
  [[], can => can('read') || can('write'), false ],
  [[ ], can => can([ 'read', 'write' ]) || can('edit'), false ],
  [[ 'read' ], can => can([ 'read', 'write' ]) || can('edit'), false ],
  [[ 'write' ], can => can([ 'read', 'write' ]) || can('edit'), false ],
  [[ 'edit' ], can => can([ 'read', 'write' ]) || can('edit'), true ],
  [[ 'read', 'write' ], can => can([ 'read', 'write' ]) || can('edit'), true ],
  [[ 'read', 'edit' ], can => can([ 'read', 'write' ]) || can('edit'), true ],
  [[ 'edit', 'write' ], can => can([ 'read', 'write' ]) || can('edit'), true ],
  [[ 'read', 'edit', 'write' ], can => can([ 'read', 'write' ]) || can('edit'), true ],
];

exports.checkCases = checkCases;

const tsCheckCases = [
  [ '/', [ 'read' ], true ],
  [ '/', [], false ],
  [ '/readAndWrite', [ 'read', 'write' ], true ],
  [ '/readAndWrite', [ 'read' ], false ],
  [ '/readAndWrite', [ 'write' ], false ],
  [ '/readAndWrite', [], false ],
  [ '/readOrWrite', [ 'read', 'write' ], true ],
  [ '/readOrWrite', [ 'read' ], true ],
  [ '/readOrWrite', [ 'write' ], true ],
  [ '/readOrWrite', [], false ],
  [ '/readAndWriteOrEdit', [ ], false ],
  [ '/readAndWriteOrEdit', [ 'read' ], false ],
  [ '/readAndWriteOrEdit', [ 'write' ], false ],
  [ '/readAndWriteOrEdit', [ 'edit' ], true ],
  [ '/readAndWriteOrEdit', [ 'read', 'write' ], true ],
  [ '/readAndWriteOrEdit', [ 'read', 'edit' ], true ],
  [ '/readAndWriteOrEdit', [ 'edit', 'write' ], true ],
  [ '/readAndWriteOrEdit', [ 'read', 'edit', 'write' ], true ],
];

exports.tsCheckCases = tsCheckCases;

const fackRoute = {
  Controller: HomeController,
  methodName: 'index',
};

const staticMiddlwareCases = [
  [{ currentRoute: null }, null, 'onMissRoute' ],
  [{ currentRoute: fackRoute }, null, 'onPass' ],
  [{ currentRoute: fackRoute, isAuthenticated: () => true }, tiaozhanAuth.LOGIN, 'onPass' ],
  [{ currentRoute: fackRoute, isAuthenticated: () => false }, tiaozhanAuth.LOGIN, 'onNotLogin' ],
  [{ currentRoute: fackRoute }, Symbol('hello'), 'onInvalidSymbol' ],
  [{ currentRoute: fackRoute, isAuthenticated: () => false }, 'read', 'onNotLogin' ],
  [{ currentRoute: fackRoute, isAuthenticated: () => true, user: { permissions: [ 'read' ] } }, 'read', 'onPass' ],
  [{ currentRoute: fackRoute, isAuthenticated: () => true, user: { permissions: [ ] } }, 'read', 'onNoPermission' ],
];

exports.staticMiddlwareCases = staticMiddlwareCases;
