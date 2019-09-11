'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'tiaozhan';
  }

  func1() {

  }
}

module.exports = HomeController;
