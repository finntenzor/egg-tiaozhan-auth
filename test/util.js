'use strict';

class Dependency {
  constructor() {
    this.status = {};
  }

  need(key) {
    const status = this.status;
    // tslint:disable-next-line: ter-prefer-arrow-callback
    before(function() {
      if (!status[key]) {
        this.skip();
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
