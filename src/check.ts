import { AuthCheckOptions } from './types';
import { TiaozhanAuthConfig, Context } from 'egg';
import { getAuthFromRoute } from '.';

/**
 * 仅登录即可通过的权限配置
 */
export const LOGIN = Symbol('tiaozhan-auth#login');

/**
 * 守卫判断结果
 */
export enum GuardStatus {
  PASS = 0,
  MISS_ROUTE = 1,
  NOT_LOGIN = 2,
  INVALID_SYMBOL = 3,
  NO_PERMISSION = 4
}

/**
 * 权限错误
 */
export class AuthError extends Error {
}

/**
 * 检查给定的权限列表是否满足权限配置
 * @param permissions 权限列表
 * @param options 权限配置
 */
export function checkHasAuth(permissions: string[], options: AuthCheckOptions): boolean {
  const canOne = (perm: string): boolean => {
    return permissions.find(it => it === perm) ? true : false;
  };
  const canAll = (perms: string[]): boolean => {
    return perms.reduce((flag: boolean, perm: string) => flag && canOne(perm), true);
  };
  const can = (input: string | string[]): boolean => {
    if (typeof input === 'string') {
      return canOne(input);
    } else {
      return canAll(input);
    }
  };
  if (typeof options === 'string') {
    return canOne(options);
  } else if (options instanceof Array) {
    return canAll(options);
  } else {
    return options(can);
  }
}

/**
 * 检查当前请求是否通过
 * @param options 插件配置
 * @param ctx 请求上下文
 */
export function checkCanPass(options: TiaozhanAuthConfig, ctx: Context): GuardStatus {
  const route = ctx.currentRoute;
  // 没有路由定义时跳过检查
  if (!route) {
    return GuardStatus.MISS_ROUTE;
  }
  // 没有限定权限的时候跳过检查
  const auth = getAuthFromRoute(route);
  if (auth === null) {
    return GuardStatus.PASS;
  }
  // 特殊标记特殊处理
  if (typeof auth === 'symbol') {
    if (auth === LOGIN) {
      // 登录就通过
      if (ctx.isAuthenticated()) {
        return GuardStatus.PASS;
      } else {
        return GuardStatus.NOT_LOGIN;
      }
    } else {
      return GuardStatus.INVALID_SYMBOL;
    }
  }
  // 一般权限配置
  if (!ctx.isAuthenticated()) {
    return GuardStatus.NOT_LOGIN;
  }
  // 获取用户所用拥有的权限
  const permissions = options.userToPermissions(ctx, ctx.user);
  if (checkHasAuth(permissions, auth)) {
    return GuardStatus.PASS;
  } else {
    return GuardStatus.NO_PERMISSION;
  }
}
