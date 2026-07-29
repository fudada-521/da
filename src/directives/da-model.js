/**
 * da-model 指令
 *
 * 表单元素双向绑定 + 组件 da-model 语法糖。
 *
 * 表单绑定：
 *   支持 input（text/number/checkbox/radio）、textarea、select
 *   修饰符：.lazy、.trim、.number
 *
 * 组件 da-model（自动检测自定义元素）：
 *   da-model="val"         → 绑定 prop `modelValue` + 监听 `update:modelValue`
 *   da-model:title="val"   → 绑定 prop `title` + 监听 `update:title`
 *   支持多个 da-model：da-model:title="x" da-model:content="y"
 *
 * @format
 */

import { evaluateExpression } from "../shared/utils.js";

const directive = {
    name: "model",

    mount(el, binding) {
        const { instance, expression, modifiers } = binding;
        if (!instance || !expression) return;

        // 检测是否为自定义元素（标签名含连字符）
        if (el.tagName.includes("-")) {
            setupComponent(el, instance, expression, modifiers, binding.arg);
            return;
        }

        // 表单元素绑定
        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute("type") || "").toLowerCase();

        if (tag === "input" && type === "checkbox") {
            setupCheckbox(el, instance, expression, modifiers);
        } else if (tag === "input" && type === "radio") {
            setupRadio(el, instance, expression, modifiers);
        } else if (
            tag === "textarea" ||
            (tag === "input" &&
                (type === "text" || type === "password" || type === "email" || type === "number" || !type))
        ) {
            setupInput(el, instance, expression, modifiers);
        } else if (tag === "select") {
            setupSelect(el, instance, expression, modifiers);
        }
    },

    update(el, binding) {
        const { instance, expression, arg } = binding;
        if (!instance || !expression) return;

        // 组件 da-model 更新
        if (el.tagName.includes("-")) {
            const propName = arg || "modelValue";
            const value = evaluateExpressionInModel(expression, instance);
            if (value !== undefined) {
                el[propName] = value;
                el.setAttribute(propName, String(value));
            }
            return;
        }

        // 表单元素更新
        const value = evaluateExpressionInModel(expression, instance);
        if (value === undefined) return;

        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute("type") || "").toLowerCase();

        if (tag === "input" && type === "checkbox") {
            el.checked = !!value;
        } else if (tag === "input" && type === "radio") {
            el.checked = el.value === String(value);
        } else if (tag === "textarea" || tag === "input") {
            if (el.value !== String(value)) {
                el.value = value;
            }
        } else if (tag === "select") {
            el.value = String(value);
        }
    },

    unmount(el) {
        // 组件 da-model 清理
        if (el._daComponentModelHandler) {
            const eventName = el._daComponentModelEvent;
            el.removeEventListener(eventName, el._daComponentModelHandler);
            delete el._daComponentModelHandler;
            delete el._daComponentModelEvent;
        }

        // 表单元素清理
        if (el._daModelHandler) {
            el.removeEventListener(getEventName(el._daModelModifiers), el._daModelHandler);
            delete el._daModelHandler;
            delete el._daModelModifiers;
        }
    },
};

// ============================================================
// 组件 da-model
// ============================================================

/**
 * 设置组件上的 da-model
 *
 * da-model="val"           → prop: modelValue,  event: update:modelValue
 * da-model:title="val"     → prop: title,       event: update:title
 * da-model:title.trim="val" → prop: title,      event: update:title + .trim
 */
function setupComponent(el, instance, expression, modifiers, arg) {
    const propName = arg || "modelValue";
    const eventName = `update:${propName}`;

    // 设置初始值（同时设 property 和 attribute，attribute 触发组件的 prop 更新）
    const initialVal = evaluateExpressionInModel(expression, instance);
    if (initialVal !== undefined) {
        el[propName] = initialVal;
        el.setAttribute(propName, String(initialVal));
    }

    // 监听子组件派发的 update 事件
    const handler = (event) => {
        let value = event.detail !== undefined ? event.detail : event.target[propName];

        // 从子组件收到的更新事件

        // 应用修饰符
        if (modifiers.number) {
            value = parseFloat(value) || (value === "" ? "" : 0);
        }
        if (modifiers.trim && typeof value === "string") {
            value = value.trim();
        }

        setDataValue(instance, expression, value, el);
    };

    el._daComponentModelHandler = handler;
    el._daComponentModelEvent = eventName;
    el.addEventListener(eventName, handler);
}

// ============================================================
// 表单元素设置
// ============================================================

function setupInput(el, instance, expression, modifiers) {
    const eventName = modifiers.lazy ? "change" : "input";

    const initialVal = evaluateExpressionInModel(expression, instance);
    if (initialVal !== undefined) {
        el.value = initialVal;
    }

    const handler = () => {
        let value = el.value;
        if (modifiers.number) {
            value = parseFloat(value) || (value === "" ? "" : 0);
        }
        if (modifiers.trim) {
            value = value.trim();
        }
        setDataValue(instance, expression, value, el);
    };

    el._daModelHandler = handler;
    el._daModelModifiers = modifiers;
    el.addEventListener(eventName, handler);
}

function setupCheckbox(el, instance, expression, modifiers) {
    const handler = () => {
        setDataValue(instance, expression, el.checked, el);
    };

    el._daModelHandler = handler;
    el._daModelModifiers = modifiers;
    el.addEventListener("change", handler);
}

function setupRadio(el, instance, expression, modifiers) {
    const handler = () => {
        if (el.checked) {
            const value = modifiers.number ? parseFloat(el.value) || el.value : el.value;
            setDataValue(instance, expression, value, el);
        }
    };

    el._daModelHandler = handler;
    el._daModelModifiers = modifiers;
    el.addEventListener("change", handler);
}

function setupSelect(el, instance, expression, modifiers) {
    const eventName = modifiers.lazy ? "change" : "change";

    const initialVal = evaluateExpressionInModel(expression, instance);
    if (initialVal !== undefined) {
        el.value = String(initialVal);
    }

    const handler = () => {
        setDataValue(instance, expression, el.value, el);
    };
    el._daModelHandler = handler;
    el._daModelModifiers = modifiers;
    el.addEventListener(eventName, handler);
}

// ============================================================
// 辅助
// ============================================================

function getEventName(modifiers) {
    return modifiers.lazy ? "change" : "input";
}

/** 获取表达式绑定的数据值 */
function evaluateExpressionInModel(expression, instance) {
    try {
        const fn = new Function("$data", `with($data) { return (${expression}) }`);
        return fn(instance.$data);
    } catch {
        return undefined;
    }
}

/** 设置表达式绑定的数据值 */
function setDataValue(instance, expression, value, el) {
    const parts = expression.trim().split(".");
    let target = instance.$data;

    for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]];
        if (!target) return;
    }

    const key = parts[parts.length - 1];
    target[key] = value;
}

export default directive;
