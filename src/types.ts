import { Context } from 'egg';
import { Route } from 'egg-tiaozhan-controller-extension';

export declare type UserToPermissions = (ctx: Context, user: any) => string[];
export declare type Can = (permission: string | string[]) => boolean;
export declare type AuthCheckOptions = string | string[] | ((can: Can) => boolean);
export declare type AuthOptions = AuthCheckOptions | symbol;

export declare type GuardResponseFunction = (ctx: Context, route: Route | null, auth: AuthOptions | null, user: any, next: () => Promise<any>) => void | Promise<void>;
export declare type GuardSimpleStrategy = 'pass' | 'log' | 'throw';
export declare type GuardStrategyCallback = (ctx: Context, message: string) => void | Promise<void>;

export declare type GuardMissRouteMessageBuilder = string | ((ctx: Context) => string);
export declare type GuardNotLoginMessageBuilder = string | ((ctx: Context) => string);
export declare type GuardInvalidSymbolMessageBuilder = string | ((ctx: Context, auth: symbol) => string);
export declare type GuardNoPermissionMessageBuilder = string | ((ctx: Context, route: Route | null, auth: AuthOptions | null, user: any) => string);
export declare type GuardMessageBuilder = GuardMissRouteMessageBuilder | GuardNotLoginMessageBuilder | GuardInvalidSymbolMessageBuilder | GuardNoPermissionMessageBuilder;

export interface GuardMissRouteCommonStrategy {
  type: GuardSimpleStrategy;
  message?: GuardMissRouteMessageBuilder;
}
export interface GuardMissRouteCallbackStrategy {
  type: 'callback';
  message?: GuardMissRouteMessageBuilder;
  callback: GuardStrategyCallback;
}

export interface GuardNotLoginCommonStrategy {
  type: GuardSimpleStrategy;
  message?: GuardNotLoginMessageBuilder;
}
export interface GuardNotLoginCallbackStrategy {
  type: 'callback';
  message?: GuardNotLoginMessageBuilder;
  callback: GuardStrategyCallback;
}

export interface GuardInvalidSymbolCommonStrategy {
  type: GuardSimpleStrategy;
  message?: GuardInvalidSymbolMessageBuilder;
}
export interface GuardInvalidSymbolCallbackStrategy {
  type: 'callback';
  message?: GuardInvalidSymbolMessageBuilder;
  callback: GuardStrategyCallback;
}

export interface GuardNoPermissionCommonStrategy {
  type: GuardSimpleStrategy;
  message?: GuardNoPermissionMessageBuilder;
}
export interface GuardNoPermissionCallbackStrategy {
  type: 'callback';
  message?: GuardNoPermissionMessageBuilder;
  callback: GuardStrategyCallback;
}

export declare type GuardMissRouteStrategy = GuardMissRouteCommonStrategy | GuardMissRouteCallbackStrategy;
export declare type GuardNotLoginStrategy = GuardNotLoginCommonStrategy | GuardNotLoginCallbackStrategy;
export declare type GuardInvalidSymbolStrategy = GuardInvalidSymbolCommonStrategy | GuardInvalidSymbolCallbackStrategy;
export declare type GuardNoPermissionStrategy = GuardNoPermissionCommonStrategy | GuardNoPermissionCallbackStrategy;

export declare type GuardCommonStrategy = GuardSimpleStrategy | GuardResponseFunction;
export declare type GuardAllStrategy = GuardSimpleStrategy | GuardResponseFunction | GuardMissRouteStrategy | GuardNotLoginStrategy | GuardInvalidSymbolStrategy | GuardNoPermissionStrategy;

declare module 'egg' {
  export interface TiaozhanAuthConfig {
    ignore: IgnoreOrMatch;
    match: IgnoreOrMatch;
    skip: boolean;
    userToPermissions: UserToPermissions;
    onPass: GuardCommonStrategy;
    onMissRoute: GuardCommonStrategy | GuardMissRouteStrategy;
    onNotLogin: GuardCommonStrategy | GuardNotLoginStrategy;
    onInvalidSymbol: GuardCommonStrategy | GuardInvalidSymbolStrategy;
    onNoPermission: GuardCommonStrategy | GuardNoPermissionStrategy;
  }

  interface EggAppConfig {
    tiaozhanAuth: TiaozhanAuthConfig;
  }
}
