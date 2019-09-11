import { Context } from 'egg';

export declare type UserToPermissions = (ctx: Context, user: any) => string[];
export declare type Can = (permission: string | string[]) => boolean;
export declare type AuthCheckOptions = string | string[] | ((can: Can) => boolean);
export declare type AuthOptions = AuthCheckOptions | symbol;

export declare type GuardSimpleStrategy = 'pass' | 'log' | 'throw' | 'abort';
export declare type GuardMiddlewareStrategy = (ctx: Context, auth: AuthOptions | null, next: () => Promise<any>) => any;
export declare type GuardCallback = (ctx: Context, auth: AuthOptions | null, message: string) => any;
export declare type GuardMessageBuilder = string | ((ctx: Context, auth: AuthOptions | null) => string);
export interface GuardCommonStrategy {
  type: GuardSimpleStrategy;
  message?: GuardMessageBuilder;
}
export interface GuardCallbackStrategy {
  type: 'callback';
  message?: GuardMessageBuilder;
  callback: GuardCallback;
}
export declare type GuardStrategy = GuardSimpleStrategy | GuardMiddlewareStrategy | GuardCommonStrategy | GuardCallbackStrategy;

declare module 'egg' {
  export interface TiaozhanAuthConfig {
    ignore: IgnoreOrMatch;
    match: IgnoreOrMatch;
    skip: boolean;
    userToPermissions: UserToPermissions;
    alwaysReloadConfig: boolean;
    onPass: GuardStrategy;
    onMissRoute: GuardStrategy;
    onNotLogin: GuardStrategy;
    onInvalidSymbol: GuardStrategy;
    onNoPermission: GuardStrategy;
  }

  interface EggAppConfig {
    tiaozhanAuth: TiaozhanAuthConfig;
  }
}
