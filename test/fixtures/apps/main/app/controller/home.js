'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hi, ' + this.app.plugins.tiaozhanAuth.name;
  }

  func1() {

  }
}

module.exports = HomeController;
