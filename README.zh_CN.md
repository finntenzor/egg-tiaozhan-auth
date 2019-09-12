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

## 基本用法

使用注解标记权限，使用配置定义用户权限。

```ts
// app/controller/home.ts
import { Controller } from 'egg';
import { Auth } from 'egg-tiaozhan-auth';

export default class HomeController extends Controller {
  @Auth('read')
  public async test() {
    return 'Hi, you have read permission!';
  }
}

// config/config.default.ts
config.tiaozhanAuth = {
  userToPermissions: (_: Context, user: any) => {
    return user ? (user.permissions || []) : [];
  },
};
```

## 依赖说明

### 依赖的 egg 版本

egg-tiaozhan-auth 版本 | egg 2.x
--- | ---
2.x | 😁
1.x | ❌
0.x | ❌

### 依赖的插件

1. egg-passport
2. egg-tiaozhan-controller-extension

另外依赖`reflect-metadata`

## 开启插件

```ts
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

## 完整用法

### 权限注解

```ts
import { Controller } from 'egg';
import { Auth, LOGIN } from 'egg-tiaozhan-auth';

export default class HomeController extends Controller {
  // 所有用户都可以访问
  async index() {
    return 'tiaozhan';
  }

  // 只要登录就可以访问
  @Auth(LOGIN)
  async login() {
    return 'tiaozhan';
  }

  // 登录并且具有read权限，则可以访问
  @Auth('read')
  async read() {
    return 'tiaozhan';
  }

  // 登录并且同时具有read和write权限，则可以访问
  @Auth(['read', 'write'])
  async readAndWrite() {
    return 'tiaozhan';
  }

  // 登录并且具有read和write之一的权限，则可以访问
  @Auth(can => can('read') || can('write'))
  readOrWrite() {
    return 'tiaozhan';
  }

  // 登录，同时有read和write权限，或者有edit权限，则可以访问
  @Auth(can => can(['read', 'write']) || can('edit'))
  readAndWriteOrEdit() {
    return 'tiaozhan';
  }
}
```

1. 权限注解只能使用一次，多次注解则只有最先出现（最后调用的）有效。
2. 注解接受的参数包括4种，`LOGIN`Symbol常量，字符串，字符串数组，can表达式。
3. `LOGIN`Symbol常量：只要登录就可以访问
4. 字符串：只要用户含有这个权限，就可以访问
5. 字符串数组：用户需要拥有数组中的所有权限，才可以访问
6. can表达式：格式为`can => boolean`，此函数需要是`同步的`、返回boolean类型的函数。传入的can是一个`string | string[] => boolean`，你可以用传入的can区分当前用户是否具有某权限，can函数接受字符串或字符串数组，返回这个用户有无权限(boolean类型)，你需要返回boolean表示这个用户最终是否有权限。

### 用户权限定义

```ts
// config/config.default.ts
import { Context } from 'egg';

config.tiaozhanAuth = {
  userToPermissions: (ctx: Context, user: any) => {
    return user ? user.permissions : [];
  },
};
```

你需要在配置文件中编写此函数来定义某个用户拥有哪些权限。__注意！默认的权限定义将会抛出错误！__

传入的两个参数分别为：

1. `ctx`，Context类型，当前请求上下文。
2. `user`, any类型，等同于ctx.user，需要egg-passport支持。

__此函数必须是一个`同步的`，`返回字符串数组`的函数。__

注：很多情况下，用户和权限表或者是角色表是分离的，但请不要因此试图在这里编写异步的方法去获取权限，这会造成性能降低。你应该在登录时将权限存入session，这样每次传入的user其实是session中的数据，权限会同步获取。如果权限十分复杂，可以考虑使用内存缓存，你可以通过ctx来获取内存中的缓存。

例如：

```ts
// config/config.default.ts
import { Context } from 'egg';

interface Permission {
  id: number;
  code: string;
}

config.tiaozhanAuth = {
  userToPermissions: (ctx: Context, user: any) => {
    // 未登录时当前用户权限是空
    if (!user) {
      return [];
    }
    // session中只保存了这个用户拥有的权限的ID
    const permissionIdList: number[] = user.permissions;
    // permissionTableCache是数据库中权限表的缓存
    const permissionTableCache: Permission[] = ctx.service.permission.cache;
    // 将权限ID数组转换成权限Code数组，并过滤失效的权限
    const permissions: string[] = permissionIdList.map(
      id => permissionTableCache.find(
        item => item.id === id
      )
    ).filter(item => !!item);
    return permissions;
  },
};
```

### 守卫策略

#### 默认守卫策略

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

每一个请求发出后，TiaozhanAuth会根据请求给出5种`守卫状态`，分别是：`Pass`通过，`NotLogin`未登录，`NoPermission`无权限，`MissRoute`路由失效，`InvalidSymbol`权限定义无效。

其中`MissRoute`和`InvalidSymbol`分别由以下几种情况触发：

1. 当你没有安装或启用`egg-tiaozhan-controller-extension`时触发`MissRoute`。
2. 当你的当前路由终点不是控制器，或者是函数型控制器，或者是中间件时触发`MissRoute`。
3. 当你的Auth定义是`LOGIN`以外的其他Symbol时触发`InvalidSymbol`。

这两种守卫状态应该在开发过程中消除掉，默认情况下，触发则会抛出异常，终止此请求。对于`InvalidSymbol`，只要不要给Auth传奇怪的Symbol即可避免。对于`MissRoute`，可能存在部分路由无法修改未控制器，对于这种情况，请自行配置`match`或`ignore`，忽略特定路由，具体见[match和ignore](https://eggjs.org/zh-cn/basics/middleware.html#match-%E5%92%8C-ignore)

其余3种守卫状态均为常见的守卫状态，分别代表`应当允许此次请求`，`用户没有登录，应当返回401`，`用户没有权限访问，应当返回403`。3种守卫状态对应的默认策略（默认动作）分别是：通过、返回4001、返回403。

### 自定义守卫策略

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

上述5个参数，键名是守卫状态，键值是该守卫状态对应的守卫策略，TiaozhanAuth将根据守卫策略执行对应的动作。

5种守卫状态的守卫策略配置格式是统一的，支持4种类型的策略：`SimpleStrategy`, `CommonStrategy`, `CallbackStrategy`, `MiddlewareStrategy`。具体配置格式如下：

#### SimpleStrategy

```ts
// SimpleStrategy的定义，值应该是以下4个字符串之一
type GuardSimpleStrategy = 'pass' | 'log' | 'throw' | 'abort';
```

1. `pass`，通过，中间件不做任何操作，继续将请求交给下一层。
2. `log`，通过，但是中间件将会输出日志，记录下相关错误信息。（MissRoute和InvalidSymbol有错误信息，其他没有）
3. `throw`，抛出异常，直接终止请求。
4. `abort`，终止请求并直接返回响应，请求不交给下一层，`NotLogin`将会返回401和错误信息`You are not logined!`，`NoPermission`将会返回403和错误信息`You have no permission!`

#### CommonStrategy

```ts
// CommonStrategy的定义
// type应该是'pass' | 'log' | 'throw' | 'abort'
// message应该是一个字符串，或者返回字符串的函数
type GuardMessageBuilder = string | ((ctx: Context, auth: AuthOptions | null) => string);

interface GuardCommonStrategy {
  type: GuardSimpleStrategy;
  message?: GuardMessageBuilder;
}
```

CommonStrategy是为了克服SimpleStrategy不能自定义消息的弱点而设计的，其中type将会决定中间件接下来的操作，而message则会决定抛出异常、打印日志或终止操作时使用的消息，例如：

```ts
// config/config.default.ts
config.tiaozhanAuth = {
  onNotLogin: {
    type: 'abort',
    message: '您未登录！',
  },
  onNoPermission: {
    type: 'abort',
    message: '您没有权限执行此操作哦！',
  },
};
```

这会取代未登录和无权限状态对应给出的错误消息，错误状态仍然分别是401和403。

同时，message也可以是一个回调，接受两个参数，`ctx`当前请求上下文，`auth`当前请求接口的权限配置，应该`同步地`返回一个字符串类型，取代原来的消息，例如：

```ts
// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

config.tiaozhanAuth = {
  onNoPermission: {
    type: 'abort',
    message: (ctx: Context, auth: AuthOptions | null) => {
      if (typeof auth === 'string') {
        return '您没有<' + auth + '>的权限';
      } else if (auth instanceof Array) {
        return '您没有<' + auth.join(',') + '>的权限';
      } else {
        // 这里auth是can表达式，较为难以写成对应的字符串
        return '您没有访问“' + ctx.request.path + '”的权限';
      }
    },
  },
};
```

或者您也可以利用注解、反射等操作实现更复杂的逻辑：

```ts
// app/controller/home.ts
import { Controller } from 'egg';
import { Auth } from 'egg-tiaozhan-auth';

export default class HomeController extends Controller {
  @Auth('read')
  public async read() {
    return 'hi, tiaozhan';
  }

  @Auth(can => can('read') || can('write'))
  public async readOrWrite() {
    return 'hi, tiaozhan';
  }
}

const authText = {
  read: '读取',
  readOrWrite: '读取或写入',
};

// 这需要reflect-metadata依赖
Reflect.defineMetadata('my-auth-text-key', authText, HomeController.prototype);

// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

config.tiaozhanAuth = {
  onNoPermission: {
    type: 'abort',
    message: (ctx: Context, auth: AuthOptions | null) => {
      // 这需要egg-tiaozhan-controller-extension插件启用
      const route = ctx.currentRoute;
      if (route) {
        const authText = Reflect.getMetadata('my-auth-text-key', route.Controller.prototype);
        if (authText[route.methodName]) {
          return '您没有' + authText[route.methodName] + '的权限';
        }
      }
      // 如果没有定义权限文本，则按默认的显示
      if (typeof auth === 'string') {
        return '您没有<' + auth + '>的权限';
      } else if (auth instanceof Array) {
        return '您没有<' + auth.join(',') + '>的权限';
      } else {
        return '您没有访问“' + ctx.request.path + '”的权限';
      }
    },
  },
};
```

__特别注意，message并不是全部用来返回给客户端，操作逻辑仍是由type决定，具体逻辑如下：__

| 策略类型 | 消息用途 | 客户端响应 |
| ------- | ------- | --------- |
| pass | 丢弃不使用 | 交给控制器 |
| log  | 打印日志 | 交给控制器 |
| throw  | 抛出错误 | 终止(一般是空响应) |
| abort  | 输出响应体 | 显示消息 |

#### CallbackStrategy

```ts
// CallbackStrategy的定义
// type必须是callback
// message应该是一个字符串，或者返回字符串的函数
// callback是一个返回任意值或对应Promise的函数
type GuardMessageBuilder = string | ((ctx: Context, auth: AuthOptions | null) => string);

type GuardCallback = (ctx: Context, auth: AuthOptions | null, message: string) => any;

interface GuardCallbackStrategy {
  type: 'callback';
  message?: GuardMessageBuilder;
  callback: GuardCallback;
}
```

CallbackStrategy提供了比CommonStrategy更强大的自定义逻辑，您可以使用这种策略实现高度的自定义处理。

message的定义和用法与CommonStrategy相同，你可以使用字符串，或者返回字符串的函数，或者是默认，这里不在赘述。

callback是一个回调，接受3个参数，`ctx`当前请求上下文，`auth`当前请求接口的权限配置，`message`按当前配置生成的消息，可以`同步地或异步地`不返回或返回响应体。

例如：

```ts
// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

function messageBuilder(ctx: Context, auth: AuthOptions | null): string {
  if (typeof auth === 'string') {
    return '您没有<' + auth + '>的权限';
  } else if (auth instanceof Array) {
    return '您没有<' + auth.join(',') + '>的权限';
  } else {
    // 这里auth是can表达式，较为难以写成对应的字符串
    return '您没有访问“' + ctx.request.path + '”的权限';
  }
}

config.tiaozhanAuth = {
  onNoPermission: {
    type: 'abort',
    message: messageBuilder,
    callback: (ctx: Context, auth: AuthOptions | null, message: string) => {
      // 您可以自定义响应体的结构，与前端配合
      ctx.body = {
        status: 0,
        message,
      };
      // callback策略下状态码必须手动设置
      ctx.status = 403;
    }
  },
};
```

也可以异步的，也可以使用返回值，只要返回值不是undefined或者Promise结果不是undefined，都会自动作为响应体。

```ts
// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

config.tiaozhanAuth = {
  onNoPermission: {
    type: 'abort',
    callback: (ctx: Context, auth: AuthOptions | null, message: string) => {
      // callback策略下状态码必须手动设置
      ctx.status = 403;
      // 返回值会自动赋值给响应体
      return {
        status: 0,
        message,
      }
    }
  },
};
```

当然异步过程也是OK的。

```ts
// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

config.tiaozhanAuth = {
  onNoPermission: {
    type: 'abort',
    callback: async (ctx: Context, auth: AuthOptions | null, message: string) => {
      // callback策略下状态码必须手动设置
      ctx.status = 403;
      // 可以使用异步
      const bar = await ctx.service.foo.get();
      // 返回值会自动赋值给响应体
      return {
        status: 0,
        bar,
        message,
      }
    }
  },
};
```

#### MiddlewareStrategy

```ts
// MiddlewareStrategy的定义
type GuardMiddlewareStrategy = (ctx: Context, auth: AuthOptions | null, next: () => Promise<any>) => any;
```

这种策略是扩展性最为丰富的一个策略，你可以几乎完全接替中间件的工作。传入的`ctx`和`next`即是中间件接受的两个参数，传入的auth是当前请求目标方法的权限配置。

在此策略下，可以完成一些较为复杂的逻辑，比如同时输出日志并且不通过请求：

```ts
// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

config.tiaozhanAuth = {
  onInvalidSymbol: (ctx: Context, auth: AuthOptions | null, next: () => Promise<any>) => {
    ctx.status = 500;
    ctx.body = '我们对此感到十分抱歉，但是服务器现在出现了一点问题，请联系系统管理员，我们将尽快处理';
    ctx.logger.warn('InvalidSymbol at ' + ctx.request.path);
  },
};
```

当然，异步操作也是OK的。

```ts
// config/config.default.ts
import { Context } from 'egg';
import { AuthOptions } from 'egg-tiaozhan-auth';

config.tiaozhanAuth = {
  onInvalidSymbol: async (ctx: Context, auth: AuthOptions | null, next: () => Promise<any>) => {
    await ctx.service.error.report('InvalidSymbol', ctx.request.path);

    ctx.status = 500;
    ctx.body = '我们对此感到十分抱歉，但是服务器现在出现了一点问题，请联系系统管理员，我们将尽快处理';
    ctx.logger.warn('InvalidSymbol at ' + ctx.request.path);
  },
};
```

### 其他配置

#### 跳过检查

开发阶段，可能由于麻烦想要关闭这个插件，除了在plugin中关闭，您还可以在配置中设置`skip`为`true`，这样请求会通过此中间件但是总会直接通过。

```ts
// config/config.default.ts
config.tiaozhanAuth = {
  skip: true
};
```

### 总是重载配置

一般来说权限配置的各种策略是静态的，插件一经加载，5种策略对应的处理逻辑都已经生成，整个应用运行阶段都是保持不变的，从而提高性能。但是也可能有一些场景需要重新读取配置（例如在测试代码中），此时可以设置`alwaysReloadConfig`为`true`，这样每次请求都会重新读取配置生成对应的逻辑。

```ts
// config/config.default.ts
config.tiaozhanAuth = {
  alwaysReloadConfig: true
};
```

## 提问交流

请到 [egg-tiaozhan-auth issues](https://github.com/finntenzor/egg-tiaozhan-auth/issues) 异步交流。

## License

[MIT](LICENSE)
