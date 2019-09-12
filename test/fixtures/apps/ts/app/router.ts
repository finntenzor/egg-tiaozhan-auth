import { Application } from 'egg';

export default (app: Application) => {
  const { controller } = app;

  app.get('/', controller.home.index);
  app.get('/readAndWrite', controller.home.readAndWrite);
  app.get('/readOrWrite', controller.home.readOrWrite);
  app.get('/readAndWriteOrEdit', controller.home.readAndWriteOrEdit);
};
