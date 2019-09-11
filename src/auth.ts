import { Context, TiaozhanAuthConfig } from 'egg';
import { checkCanPass, GuardStatus, AuthError } from './check';
import { GuardStrategy, GuardCallback, GuardMiddlewareStrategy, GuardMessageBuilder } from './types';
import { getAuthFromRoute } from './attr-service';
import { Route } from 'egg-tiaozhan-controller-extension';

type MessageBuilder = (ctx: Context) => string;
type AuthMiddlewareProcess = (ctx: Context, next: () => Promise<any>) => Promise<void>;
interface AllMessageBuilder {
  onPass: MessageBuilder;
  onMissRoute: MessageBuilder;
  onNotLogin: MessageBuilder;
  onInvalidSymbol: MessageBuilder;
  onNoPermission: MessageBuilder;
}
interface AllAuthMiddlewareProcess {
  onPass: AuthMiddlewareProcess;
  onMissRoute: AuthMiddlewareProcess;
  onNotLogin: AuthMiddlewareProcess;
  onInvalidSymbol: AuthMiddlewareProcess;
  onNoPermission: AuthMiddlewareProcess;
}

const allDefaultMessageBuilder: AllMessageBuilder = {
  onPass: (_: Context) => 'Auth pass',
  onMissRoute: (ctx: Context) => `request [${ctx.request.path}] has no route!`,
  onNotLogin: (_: Context) => 'You are not logined!',
  onInvalidSymbol: (ctx: Context) => `Invalid Symbol ` + (getAuthFromRoute(ctx.currentRoute as Route) as symbol).toString(),
  onNoPermission: (_: Context) => 'You have no perrmission!',
};

/**
 * 通过时的处理逻辑
 */
async function processPass(_: Context, next: () => Promise<any>): Promise<void> {
  await next();
}

/**
 * 创建一个Log处理逻辑
 * @param builder MessageBuilder
 */
function buildProcessLog(builder: MessageBuilder): AuthMiddlewareProcess {
  return async (ctx: Context, next: () => Promise<any>) => {
    ctx.logger.warn(builder(ctx));
    await next();
  };
}

/**
 * 创建一个Throw处理逻辑
 * @param builder MessageBuilder
 */
function buildProcessThrow(builder: MessageBuilder): AuthMiddlewareProcess {
  return async (ctx: Context, _: () => Promise<any>) => {
    throw new AuthError(builder(ctx));
  };
}

/**
 * 创建一个Abort处理逻辑
 * @param builder MessageBuilder
 */
function buildProcessAbort(builder: MessageBuilder, defaultStatus: number = 500): AuthMiddlewareProcess {
  return async (ctx: Context, _: () => Promise<any>) => {
    ctx.body = builder(ctx);
    ctx.status = defaultStatus;
  };
}

/**
 * 创建一个Callback处理逻辑
 * @param callback 自定义callback
 * @param builder MessageBuilder
 */
function buildProcessCallback(callback: GuardCallback, builder: MessageBuilder): AuthMiddlewareProcess {
  return async (ctx: Context, _: () => Promise<any>) => {
    const route = ctx.currentRoute;
    const auth = route ? getAuthFromRoute(route) : null;
    const result = callback(ctx, auth, builder(ctx));
    if (result instanceof Promise) {
      const body = await result;
      if (body !== undefined) {
        ctx.body = body;
      }
    } else if (result !== undefined) {
      ctx.body = result;
    }
  };
}

/**
 * 创建一个Middlware处理逻辑
 * @param middlwareStrategy 处理策略
 */
function buildProcessMiddleware(middlwareStrategy: GuardMiddlewareStrategy): AuthMiddlewareProcess {
  return async (ctx: Context, next: () => Promise<any>) => {
    const route = ctx.currentRoute;
    const auth = route ? getAuthFromRoute(route) : null;
    const result = middlwareStrategy(ctx, auth, next);
    if (result instanceof Promise) {
      const body = await result;
      if (body !== undefined) {
        ctx.body = body;
      }
    } else if (result !== undefined) {
      ctx.body = result;
    }
  };
}

/**
 * 将message配置项格式化为MessageBuilder或null
 * @param message message配置项
 */
function formatMessageBuilder(message: GuardMessageBuilder | void): MessageBuilder | null {
  if (typeof message === 'string') {
    return (_: Context) => message;
  } else if (typeof message === 'function') {
    return (ctx: Context) => {
      const route = ctx.currentRoute;
      const auth = route ? getAuthFromRoute(route) : null;
      return message(ctx, auth);
    };
  } else {
    return null;
  }
}

/**
 * 创建处理逻辑，接受pass、log、throw、middleware、commonStrategy或CallbackStrategy
 * @param strategy 守护策略
 * @param defaultMessageBuilder MessageBuilder
 * @param defaultStatus 默认响应代码
 */
function buildProcess(strategy: GuardStrategy, defaultMessageBuilder: MessageBuilder, defaultStatus: number = 500): AuthMiddlewareProcess {
  if (strategy === 'pass') {
    return processPass;
  } else if (strategy === 'log') {
    return buildProcessLog(defaultMessageBuilder);
  } else if (strategy === 'throw') {
    return buildProcessThrow(defaultMessageBuilder);
  } else if (strategy === 'abort') {
    return buildProcessAbort(defaultMessageBuilder, defaultStatus);
  } else if (typeof strategy === 'function') {
    return buildProcessMiddleware(strategy);
  } else if (strategy.type === 'callback') {
    return buildProcessCallback(strategy.callback, defaultMessageBuilder);
  } else {
    const builder = formatMessageBuilder(strategy.message) || defaultMessageBuilder;
    if (strategy.callback) {
      return buildProcessCallback(strategy.callback, builder);
    } else {
      if (strategy.type === 'pass') {
        return processPass;
      } else if (strategy.type === 'log') {
        return buildProcessLog(builder);
      } else if (strategy.type === 'throw') {
        return buildProcessThrow(builder);
      } else if (strategy.type === 'abort') {
        return buildProcessAbort(builder, defaultStatus);
      } else {
        throw new AuthError('Unexpected strategy');
      }
    }
  }
}

function buildAllProcess(options: TiaozhanAuthConfig): AllAuthMiddlewareProcess {
  const process = {
    onPass: buildProcess(options.onPass, allDefaultMessageBuilder.onPass),
    onMissRoute: buildProcess(options.onMissRoute, allDefaultMessageBuilder.onMissRoute),
    onNotLogin: buildProcess(options.onNotLogin, allDefaultMessageBuilder.onNotLogin, 401),
    onInvalidSymbol: buildProcess(options.onInvalidSymbol, allDefaultMessageBuilder.onInvalidSymbol),
    onNoPermission: buildProcess(options.onNoPermission, allDefaultMessageBuilder.onNoPermission, 403),
  };
  return process as AllAuthMiddlewareProcess;
}

/**
 * 静态权限检查中间件，不能直接使用。
 * @param process 所有分支的处理逻辑
 * @param options 当前配置
 * @param ctx 请求上下文
 * @param next next
 */
function staticAuthMiddlware(process: AllAuthMiddlewareProcess, options: TiaozhanAuthConfig, ctx: Context, next: () => Promise<any>): Promise<void> {
  // 如果配置要求跳过权限检查，直接通过
  if (options.skip) {
    return next();
  }
  // 其他情况检查通过状况，并执行对应逻辑
  switch (checkCanPass(options, ctx)) {
    case GuardStatus.PASS:
      return process.onPass(ctx, next);
    case GuardStatus.MISS_ROUTE:
      return process.onMissRoute(ctx, next);
    case GuardStatus.NOT_LOGIN:
      return process.onNotLogin(ctx, next);
    case GuardStatus.INVALID_SYMBOL:
      return process.onInvalidSymbol(ctx, next);
    case GuardStatus.NO_PERMISSION:
      return process.onNoPermission(ctx, next);
  }
}

/**
 * 创建插件
 * @param options 插件配置
 */
export function buildMiddleware(options: TiaozhanAuthConfig) {
  if (options.alwaysReloadConfig) {
    const process = buildAllProcess(options);
    return function tiaozhanAuthMiddleware(ctx: Context, next: () => Promise<any>): Promise<void> {
      return staticAuthMiddlware(process, options, ctx, next);
    };
  } else {
    return function tiaozhanAuthMiddleware(ctx: Context, next: () => Promise<any>): Promise<void> {
      const process = buildAllProcess(options);
      return staticAuthMiddlware(process, options, ctx, next);
    };
  }
}
