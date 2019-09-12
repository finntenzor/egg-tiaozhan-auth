import 'egg';
import 'egg-sequelize';
import 'egg-tiaozhan-auth';
import HomeController from '../app/controller/home';

declare module 'egg' {
  interface IController {
    home: HomeController;
  }
}
