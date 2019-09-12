import * as path from 'path';
import { EggAppInfo, EggAppConfig, PowerPartial, Context } from 'egg';

export default (appInfo: EggAppInfo) => {
  // tslint:disable-next-line: no-object-literal-type-assertion
  const config = {} as PowerPartial<EggAppConfig>;

  config.keys = '123123';

  config.middleware = ['tiaozhanAuth'];

  config.tiaozhanAuth = {
    userToPermissions: (_: Context, user: any) => user.permissions,
    onPass: 'pass',
    onInvalidSymbol: 'abort',
    onMissRoute: 'abort',
    onNotLogin: 'abort',
    onNoPermission: 'abort',
  };

  return config;
};
