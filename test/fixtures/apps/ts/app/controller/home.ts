import { Controller } from 'egg';
import { Auth } from '../../../../../../dist';

export default class HomeController extends Controller {
  @Auth('read')
  async index() {
    this.ctx.body = 'tiaozhan';
  }

  @Auth(['read', 'write'])
  async readAndWrite() {
    return 'tiaozhan';
  }

  @Auth(can => can('read') || can('write'))
  readOrWrite() {
    this.ctx.body = 'tiaozhan';
  }

  @Auth(can => can(['read', 'write']) || can('edit'))
  readAndWriteOrEdit() {
    return 'tiaozhan';
  }
}
