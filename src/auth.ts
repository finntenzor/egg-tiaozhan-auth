import { Context, TiaozhanAuthConfig } from 'egg';
import { checkCanPass, GuardStatus, AuthError } from './check';
import {
  GuardCommonStrategy,
  GuardMissRouteStrategy,
  GuardNotLoginStrategy,
  GuardInvalidSymbolStrategy,
  GuardNoPermissionStrategy,
  GuardAllStrategy,
  GuardStrategyCallback,
  GuardMessageBuilder,
  AuthOptions
} from './types';
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
type MessageBuilderType = 'MissRoute' | 'NotLogin' | 'InvalidSymbol' | 'NoPermission';

const defaultMessageBuilder: AllMessageBuilder = {
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
 * 创建一个Callback处理逻辑
 * @param callback 自定义callback
 * @param builder MessageBuilder
 */
function buildProcessCallback(callback: GuardStrategyCallback, builder: MessageBuilder): AuthMiddlewareProcess {
  return async (ctx: Context, _: () => Promise<any>) => {
    const result = callback(ctx, builder(ctx));
    if (result instanceof Promise) {
      await result;
    }
  };
}

/**
 * 将message配置项格式化为MessageBuilder
 * @param message message配置项
 * @param defaultBuilder 默认builder
 */
function formatMessageBuilder(message: GuardMessageBuilder | void, type: MessageBuilderType): MessageBuilder {
  let builder: MessageBuilder;
  if (typeof message === 'string') {
    builder = (_: Context) => message;
  } else if (typeof message === 'function') {
    switch (type) {
      default:
      case 'MissRoute':
      case 'NotLogin':
        builder = message as MessageBuilder;
        break;
      case 'InvalidSymbol':
        builder = (ctx: Context) => {
          const route = ctx.currentRoute as Route;
          const auth = getAuthFromRoute(route) as symbol;
          return (message as ((ctx: Context, auth: symbol) => string))(ctx, auth);
        };
        break;
      case 'NoPermission':
        builder = (ctx: Context) => {
          const route = ctx.currentRoute;
          const auth = route ? getAuthFromRoute(route) : null;
          return (message as ((ctx: Context, route: Route | null, auth: AuthOptions | null, user: any) => string))(ctx, route, auth, ctx.user);
        };
        break;
    }
  } else {
    switch (type) {
      case 'MissRoute':
        builder = defaultMessageBuilder.onMissRoute;
        break;
      case 'NotLogin':
        builder = defaultMessageBuilder.onNotLogin;
        break;
      case 'InvalidSymbol':
        builder = defaultMessageBuilder.onInvalidSymbol;
        break;
      default:
      case 'NoPermission':
        builder = defaultMessageBuilder.onNoPermission;
        break;
    }
  }
  return builder;
}

/**
 * 创建通用处理逻辑，接受pass、log、throw或者回调，否则返回null
 * @param strategy 守护策略
 * @param messageBuilder MessageBuilder
 */
function buildCommonProcess(strategy: GuardCommonStrategy, messageBuilder: MessageBuilder): AuthMiddlewareProcess;
function buildCommonProcess(strategy: GuardCommonStrategy | GuardMissRouteStrategy, messageBuilder: MessageBuilder): AuthMiddlewareProcess | null;
function buildCommonProcess(strategy: GuardCommonStrategy | GuardNotLoginStrategy, messageBuilder: MessageBuilder): AuthMiddlewareProcess | null;
function buildCommonProcess(strategy: GuardCommonStrategy | GuardInvalidSymbolStrategy, messageBuilder: MessageBuilder): AuthMiddlewareProcess | null;
function buildCommonProcess(strategy: GuardCommonStrategy | GuardNoPermissionStrategy, messageBuilder: MessageBuilder): AuthMiddlewareProcess | null;
function buildCommonProcess(strategy: GuardAllStrategy, messageBuilder: MessageBuilder): AuthMiddlewareProcess | null {
  if (strategy === 'pass') {
    return processPass;
  } else if (strategy === 'log') {
    return buildProcessLog(messageBuilder);
  } else if (strategy === 'throw') {
    return buildProcessThrow(messageBuilder);
  } else if (typeof strategy === 'function') {
    return async (ctx: Context, next: () => Promise<any>) => {
      const route = ctx.currentRoute;
      const auth = route ? getAuthFromRoute(route) : null;
      const result = strategy(ctx, route, auth, ctx.user || null, next);
      if (result instanceof Promise) {
        await result;
      }
    };
  } else {
    return null;
  }
}

/**
 * 创建分支处理逻辑，接受四种分支逻辑
 * @param strategy 守护逻辑
 * @param type 分支类型
 */
function buildBranchProcess(strategy: GuardMissRouteStrategy | GuardNotLoginStrategy | GuardInvalidSymbolStrategy | GuardNoPermissionStrategy, type: MessageBuilderType): AuthMiddlewareProcess {
  const builder = formatMessageBuilder(strategy.message, 'MissRoute');
  switch (strategy.type) {
    case 'pass':
      return processPass;
    case 'log':
      return buildProcessLog(builder);
    case 'throw':
      return buildProcessThrow(builder);
    case 'callback':
      return buildProcessCallback(strategy.callback, builder);
  }
}

function buildAllProcess(options: TiaozhanAuthConfig): AllAuthMiddlewareProcess {
  const process = {
    onPass: buildCommonProcess(options.onPass, defaultMessageBuilder.onPass),
    onMissRoute: buildCommonProcess(options.onMissRoute, defaultMessageBuilder.onMissRoute),
    onNotLogin: buildCommonProcess(options.onNotLogin, defaultMessageBuilder.onNotLogin),
    onInvalidSymbol: buildCommonProcess(options.onInvalidSymbol, defaultMessageBuilder.onInvalidSymbol),
    onNoPermission: buildCommonProcess(options.onNoPermission, defaultMessageBuilder.onNoPermission),
  };
  if (process.onMissRoute === null) {
    process.onMissRoute = buildBranchProcess(options.onMissRoute as GuardMissRouteStrategy, 'MissRoute');
  }
  if (process.onNotLogin === null) {
    process.onNotLogin = buildBranchProcess(options.onNotLogin as GuardNotLoginStrategy, 'NotLogin');
  }
  if (process.onInvalidSymbol === null) {
    process.onInvalidSymbol = buildBranchProcess(options.onInvalidSymbol as GuardInvalidSymbolStrategy, 'InvalidSymbol');
  }
  if (process.onNoPermission === null) {
    process.onNoPermission = buildBranchProcess(options.onNoPermission as GuardNoPermissionStrategy, 'NoPermission');
  }
  return process as AllAuthMiddlewareProcess;
}

/**
 * 创建插件
 * @param options 插件配置
 */
export function buildMiddleware(options: TiaozhanAuthConfig) {
  const process = buildAllProcess(options);
  return async function tiaozhanAuthMiddleware(ctx: Context, next: () => Promise<any>): Promise<void> {
    // 如果配置要求跳过权限检查，直接通过
    if (options.skip) {
      await next();
      return;
    }
    switch (checkCanPass(options, ctx)) {
      case GuardStatus.PASS:
        await process.onPass(ctx, next);
        break;
      case GuardStatus.MISS_ROUTE:
        await process.onMissRoute(ctx, next);
        break;
      case GuardStatus.NOT_LOGIN:
        await process.onNotLogin(ctx, next);
        break;
      case GuardStatus.INVALID_SYMBOL:
        await process.onInvalidSymbol(ctx, next);
        break;
      case GuardStatus.NO_PERMISSION:
        await process.onNoPermission(ctx, next);
        break;
    }
  };
}
