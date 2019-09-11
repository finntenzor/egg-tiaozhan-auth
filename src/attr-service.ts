import 'reflect-metadata';
import { AuthOptions } from './types';
import { Route } from 'egg-tiaozhan-controller-extension';

const KEY = 'tiaozhan-auth';

/**
 * 获取类上定义的属性
 * @param target 目标类的prototype
 */
export function getAttrs(target: any): object | null {
  const attrs = Reflect.getMetadata(KEY, target);
  return attrs ? { ...attrs } : null;
}

/**
 * 设置类上定义的属性
 * @param target 目标类的prototype
 * @param attrs 属性
 */
export function setAttrs(target: any, attrs: any): void {
  Reflect.defineMetadata(KEY, attrs, target);
}

/**
 * 添加类上定义的属性
 * @param target 目标类的prototype
 * @param attrs 属性
 */
export function addAttrs(target: any, attrs: any): void {
  const existsAttrs = getAttrs(target);
  const finalAttrs = { ...existsAttrs, ...(attrs || {}) };
  setAttrs(target, finalAttrs);
}

/**
 * 设置某个方法调用时要求的权限配置
 * @param target 目标类的prototype
 * @param funtionName 函数名
 * @param auth 权限配置
 */
export function setAuth(target: any, funtionName: string, auth: AuthOptions) {
  addAttrs(target, {
    [funtionName]: auth,
  });
}

/**
 * 获取某个方法调用时要求的权限配置
 * @param target 目标类的prototype
 * @param funtionName 函数名
 */
export function getAuth(target: any, funtionName: string): AuthOptions | null {
  const attrs = getAttrs(target);
  if (attrs && attrs[funtionName]) {
    return attrs[funtionName] as AuthOptions;
  }
  return null;
}

/**
 * 从路由描述获取要求的权限配置
 * @param route 当前请求路由描述
 */
export function getAuthFromRoute(route: Route): AuthOptions | null {
  return getAuth(route.Controller.prototype, route.methodName);
}

/**
 * 设定当前接口的权限配置
 * @param options 权限配置
 */
export function Auth(options: AuthOptions): (target: any, funtionName: string, propertyDescriptor?: PropertyDescriptor) => void {
  return (target, funtionName, _) => {
    setAuth(target, funtionName, options);
  };
}
