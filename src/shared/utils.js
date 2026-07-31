/**
 * 通用工具函数
 */

/** 驼峰转 kebab-case */
export function kebabCase(str) {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
}

/** 判断是否为对象（不含 null） */
export function isObject(val) {
  return val !== null && typeof val === 'object'
}

/** 判断是否为纯对象 */
export function isPlainObject(val) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

/** 判断是否为函数 */
export function isFunction(val) {
  return typeof val === 'function'
}

/** 判断是否为字符串 */
export function isString(val) {
  return typeof val === 'string'
}

/** 判断是否为数字（含数字字符串） */
export function isNumber(val) {
  return typeof val === 'number' && !isNaN(val)
}

/** 判断是否为数组 */
export function isArray(val) {
  return Array.isArray(val)
}

/** 根据 type 转换 attribute 字符串为目标类型 */
export function convertAttribute(value, type) {
  if (value === null || value === undefined) return value

  switch (type) {
    case String:
      return String(value)
    case Number:
      return Number(value)
    case Boolean:
      return value !== 'false' && value !== ''
    case Array:
    case Object:
      try {
        return JSON.parse(value)
      } catch {
        return type === Array ? [] : {}
      }
    default:
      return value
  }
}

/** 获取类型默认值 */
export function getDefaultValue(type, defaultValue) {
  if (defaultValue !== undefined) {
    return isFunction(defaultValue) ? defaultValue() : defaultValue
  }
  switch (type) {
    case String:
      return ''
    case Number:
      return 0
    case Boolean:
      return false
    case Array:
      return []
    case Object:
      return {}
    default:
      return undefined
  }
}

/** 浅合并 */
export function extend(target, source) {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key]
    }
  }
  return target
}

/** 连字符属性名 → camelCase */
export function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * 在组件上下文中求值表达式
 * 作用域优先级：$slotScope（作用域插槽数据） > $data > $props > $slots > 组件实例
 *
 * - $slotScope：作用域插槽内容编译时注入的 slot props（如 { user, isAdmin }）
 * - 组件实例兜底：让 getter（如 currentUser）也能在表达式中解析
 */
export function evaluateExpression(expr, instance) {
  if (!expr) return undefined
  try {
    const scope = instance && instance.$slotScope
    const fn = new Function('$data', '$props', '$slots', '$scope', '$self', `
      var ctx = new Proxy($data, {
        get(target, key) {
          if ($scope && key in $scope) return $scope[key];
          if (key in target) return target[key];
          if (key in $props) return $props[key];
          if (key in $slots) return $slots[key];
          if ($self && key in $self) return $self[key];
          return undefined;
        },
        has(target, key) {
          if ($scope && key in $scope) return true;
          return key in target || key in $props || key in $slots || ($self && key in $self);
        }
      });
      with(ctx) { return (${expr}) }
    `)
    return fn(instance.$data, instance.$props, instance.$slots, scope, instance)
  } catch (e) {
    return undefined
  }
}
