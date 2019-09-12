# egg-tiaozhan-auth

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-tiaozhan-auth.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-tiaozhan-auth
[travis-image]: https://img.shields.io/travis/eggjs/egg-tiaozhan-auth.svg?style=flat-square
[travis-url]: https://travis-ci.org/eggjs/egg-tiaozhan-auth
[codecov-image]: https://img.shields.io/codecov/c/github/eggjs/egg-tiaozhan-auth.svg?style=flat-square
[codecov-url]: https://codecov.io/github/eggjs/egg-tiaozhan-auth?branch=master
[david-image]: https://img.shields.io/david/eggjs/egg-tiaozhan-auth.svg?style=flat-square
[david-url]: https://david-dm.org/eggjs/egg-tiaozhan-auth
[snyk-image]: https://snyk.io/test/npm/egg-tiaozhan-auth/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/egg-tiaozhan-auth
[download-image]: https://img.shields.io/npm/dm/egg-tiaozhan-auth.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-tiaozhan-auth

[查看中文版](README.zh_CN.md)

## Install

```bash
$ npm i egg-tiaozhan-auth --save
```

## Usage

```js
// config/plugin.ts
plugin.tiaozhanControllerExtension = {
  enable: true,
  package: 'egg-tiaozhan-controller-extension',
};
plugin.passport = {
  enable: true,
  package: 'egg-passport',
};
plugin.tiaozhanAuth = {
  enable: true,
  package: 'egg-tiaozhan-auth',
};
```

### The Auth Annotation

```ts
import { Controller } from 'egg';
import { Auth, LOGIN } from 'egg-tiaozhan-auth';

export default class HomeController extends Controller {
  // All users can access
  async index() {
    return 'tiaozhan';
  }

  // Only logined users
  @Auth(LOGIN)
  async login() {
    return 'tiaozhan';
  }

  // need read permission
  @Auth('read')
  async read() {
    return 'tiaozhan';
  }

  // nedd read and write permissions
  @Auth(['read', 'write'])
  async readAndWrite() {
    return 'tiaozhan';
  }

  // need read or write permission
  @Auth(can => can('read') || can('write'))
  readOrWrite() {
    return 'tiaozhan';
  }

  // need read & write permissions or edit permission
  @Auth(can => can(['read', 'write']) || can('edit'))
  readAndWriteOrEdit() {
    return 'tiaozhan';
  }
}
```

## User Permissions Definition

```js
// config/config.default.ts
import { Context } from 'egg';

config.tiaozhanAuth = {
  userToPermissions: (ctx: Context, user: any) => {
    return user ? user.permissions : [];
  },
};
```

## Guard Strategy

### Default Strategy

```ts
// config/config.default.ts
config.tiaozhanAuth = {
  onPass: 'pass',
  onMissRoute: 'throw',
  onNotLogin: 'abort',
  onInvalidSymbol: 'throw',
  onNoPermission: 'abort',
};
```

After each request is sent, TiaozhanAuth will give 5 kinds of `Guard Status` according to the request, namely: `Pass`, `NotLogin` not logged in, `NoPermission` no permission, `MissRoute` route invalid, `InvalidSymbol` permission definition invalid.

Among them, `MissRoute` and `InvalidSymbol` are triggered by the following conditions:

1. Trigger `MissRoute` when you have not installed or enabled `egg-tiaozhan-controller-extension`.
2. Trigger `MissRoute` when your current route endpoint is not a controller, a function controller, or a middleware.
3. Trigger `InvalidSymbol` when your Auth definition is a Symbol other than `LOGIN`.

Both guard states should be removed during development. By default, the trigger throws an exception and terminates the request. For `InvalidSymbol`, just don't pass a strange Symbol to Auth to avoid it. For `MissRoute`, there may be some routes that cannot modify the un-controller. For this case, please configure `match` or `ignore` by yourself, ignoring the specific route. For details, see [match and ignore](https://eggjs.org/zh-cn/basics/middleware.html#match-%E5%92%8C-ignore)

The other three guard statuses are common guard statuses, respectively representing 'should allow this request', `users not logged in, should return 401`, `users do not have permission to access, should return 403`. The default policies (default actions) corresponding to the three guard states are: pass, return 4001, return 403.

### SimpleStrategy

```ts
type GuardSimpleStrategy = 'pass' | 'log' | 'throw' | 'abort';
```

1. `pass`, pass, the middleware does nothing, continue to hand the request to the next layer.
2. `log`, pass, but the middleware will output a log and record the relevant error information. (MissRoute and InvalidSymbol have error messages, others don't)
3. `throw`, throw an exception and terminate the request directly.
4. `abort`, terminate the request and return the response directly, the request is not handed to the next layer, `NotLogin` will return 401 and the error message `You are not logined!`, `NoPermission` will return 403 and error message. You have no permission!`

### CommonStrategy

```ts
type GuardMessageBuilder = string | ((ctx: Context, auth: AuthOptions | null) => string);

interface GuardCommonStrategy {
  type: GuardSimpleStrategy;
  message?: GuardMessageBuilder;
}
```

CommonStrategy is designed to overcome the weakness of SimpleStrategy's inability to customize messages, where type will determine the next operation of the middleware, and message will determine the message to use when throwing an exception, printing a log, or terminating an operation, for example:

```ts
// config/config.default.ts
config.tiaozhanAuth = {
  onNotLogin: {
    type: 'abort',
    message: 'Please login first!',
  },
  onNoPermission: {
    type: 'abort',
    message: 'You have no permission to access this page!',
  },
};
```

The message will be replaced while status still remained to 401 and 403.

Or, you can make your message yourself:

```ts
// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

config.tiaozhanAuth = {
  onNoPermission: {
    type: 'abort',
    message: (ctx: Context, auth: AuthOptions | null) => {
      if (typeof auth === 'string') {
        return 'You have no permission to <' + auth + '>';
      } else if (auth instanceof Array) {
        return 'You have no permission to <' + auth.join(',') + '>';
      } else {
        return 'You have no permission to access<' + ctx.request.path + '>';
      }
    },
  },
};
```

__Warning!: The message is not all used to return to the client, the operation logic is still determined by type, the specific logic is as follows__

| type | message | response |
| ------- | ------- | --------- |
| Pass | discard not used | to controller |
| log | print log | to controller |
| throw | throw error | terminate (generally empty response) |
| abort | Output response | Show the message |

### CallbackStrategy

```ts
type GuardMessageBuilder = string | ((ctx: Context, auth: AuthOptions | null) => string);

type GuardCallback = (ctx: Context, auth: AuthOptions | null, message: string) => any;

interface GuardCallbackStrategy {
  type: 'callback';
  message?: GuardMessageBuilder;
  callback: GuardCallback;
}
```

CallbackStrategy provides more powerful custom logic than CommonStrategy, which you can use to achieve a high degree of custom processing.

The definition and usage of message is the same as that of CommonStrategy. You can use a string, or a function that returns a string, or the default, which is not covered here.

Callback is a callback that accepts 3 parameters, `ctx` current request context, `auth` permission configuration of the current request interface, `message` message generated by the current configuration, can 'synchronously or asynchronously` not return or return response body.

For example:

```ts
// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

config.tiaozhanAuth = {
  onNoPermission: {
    type: 'abort',
    message: (ctx: Context, auth: AuthOptions | null) => {
      if (typeof auth === 'string') {
        return 'You have no permission to <' + auth + '>';
      } else if (auth instanceof Array) {
        return 'You have no permission to <' + auth.join(',') + '>';
      } else {
        return 'You have no permission to access<' + ctx.request.path + '>';
      }
    },
  },
};

config.tiaozhanAuth = {
  onNoPermission: {
    type: 'abort',
    message: messageBuilder,
    callback: (ctx: Context, auth: AuthOptions | null, message: string) => {
      // custom body
      ctx.body = {
        status: 0,
        message,
      };
      // !! You have to set status yourself under CallbackStrategy
      ctx.status = 403;

      // async is also OK
      // const bar = await ctx.service.foo.get();

      // return is also OK
      // return {
      //   status: 0,
      //   message,
      // }
    }
  },
};
```

It can also be asynchronous or use the return value. As long as the return value is not undefined or the Promise result is not undefined, it will automatically be the response body.

#### MiddlewareStrategy

```ts
type GuardMiddlewareStrategy = (ctx: Context, auth: AuthOptions | null, next: () => Promise<any>) => any;
```

This strategy is the most scalable one, and you can almost completely replace the middleware. The incoming `ctx` and `next` are the two parameters accepted by the middleware. The incoming auth is the permission configuration of the current request target method.

Under this strategy, you can complete some more complicated logic, such as outputting logs at the same time and not passing the request:

```ts
// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

config.tiaozhanAuth = {
  onInvalidSymbol: (ctx: Context, auth: AuthOptions | null, next: () => Promise<any>) => {
    // async is also OK
    await ctx.service.error.report('InvalidSymbol', ctx.request.path);

    ctx.status = 500;
    ctx.body = 'We are very sorry about this, but the server is now having a problem, please contact the system administrator, we will deal with it as soon as possible';
    ctx.logger.warn('InvalidSymbol at ' + ctx.request.path);
  },
};
```

## Other Configuration

```ts
// config/config.default.ts
config.tiaozhanAuth = {
  // If skip equals true, all the request will be PASS.
  skip: true,
  // if alwaysReloadConfig equals true, for each request, the config will reload.
  alwaysReloadConfig: true,
};
```

In the development phase, you may want to close the plugin because of trouble. In addition to closing in the plugin, you can also set `skip` to `true` in the configuration, so the request will pass through the middleware but will always pass directly.

In general, the various policies for permission configuration are static, but there may be some scenarios that need to re-read the configuration (for example, in the test code). In this case, you can set `alwaysReloadConfig` to `true`, so that each request will be restarted. Read the configuration to generate the corresponding logic.

## Example

<!-- example here -->

## Questions & Suggestions

Please open an issue [here](https://github.com/finntenzor/egg-tiaozhan-auth/issues).

## License

[MIT](LICENSE)
