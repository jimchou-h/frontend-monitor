import { _global } from './global';

export const nativeToString = Object.prototype.toString;

function isType(type: string) {
  return function (value: any): boolean {
    return nativeToString.call(value) === `[object ${type}]`;
  };
}

export const variableTypeDetection = {
  isNumber: isType('Number'),
  isString: isType('String'),
  isBoolean: isType('Boolean'),
  isNull: isType('Null'),
  isUndefined: isType('Undefined'),
  isSymbol: isType('Symbol'),
  isFunction: isType('Function'),
  isObject: isType('Object'),
  isArray: isType('Array'),
  isWindow: isType('Window'),
};

export function isInstanceOf(wat: any, base: any): boolean {
  try {
    return wat instanceof base;
  } catch (_e) {
    return false;
  }
}

export function isError(wat: any): boolean {
  switch (nativeToString.call(wat)) {
    case '[object Error]':
    case '[object Exception]':
    case '[object DOMException]':
      return true;
    default:
      return isInstanceOf(wat, Error);
  }
}

export function isEmptyObject(obj: Object): boolean {
  return variableTypeDetection.isObject(obj) && Object.keys(obj).length === 0;
}

export function isEmpty(wat: any): boolean {
  return (
    (variableTypeDetection.isString(wat) && wat.trim() === '') || wat === undefined || wat === null
  );
}

export const isBrowserEnv = typeof _global.document !== 'undefined';
export const isUniAppEnv = typeof _global.uni !== 'undefined';
export const isWxMiniEnv = typeof _global.wx !== 'undefined' && !isBrowserEnv;
