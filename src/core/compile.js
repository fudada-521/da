/**
 * 模板编译器
 *
 * 将 <template> 解析为指令绑定树，建立 响应式变量 → DOM 更新函数 的映射。
 *
 * 编译流程：
 * 1. 遍历模板 DOM 树
 * 2. 识别 {{ }} 插值和 da-* / :attr / @event 指令
 * 3. 解析指令参数和修饰符
 * 4. 提取表达式中的响应式变量名
 * 5. 输出绑定列表 + 挂载/卸载函数
 * 6. 识别 <slot :prop> 暴露的作用域插槽属性
 *
 * @format
 */

import { isString, isObject, isFunction, evaluateExpression } from "../shared/utils.js";
import { lookup as lookupDirective } from "../directives/index.js";

// ============================================================
// 指令前缀常量
// ============================================================

const DIRECTIVE_PREFIXES = ["da-"];
const BIND_SHORTHAND = ":";
const EVENT_SHORTHAND = "@";
const SLOT_DIRECTIVES = ["da-slot"];
const SLOT_SHORTHAND = "#";

const interpolationRE = /\{\{(.+?)\}\}/g;

// ============================================================
// 编译主函数
// ============================================================

/**
 * 编译模板
 *
 * @param {DocumentFragment|HTMLElement} templateRoot - 模板 DOM 树
 * @param {object} instance - 组件实例（用于表达式求值上下文）
 * @returns {CompileResult}
 */
export function compile(templateRoot, instance) {
    const bindings = [];
    const textBindings = [];
    const styleContents = [];
    const slotInfos = [];

    traverseNodes(templateRoot, bindings, textBindings, styleContents, slotInfos, instance);

    return {
        bindings,
        textBindings,
        slotInfos,
        styleContents,
        mount() {
            // 为根上下文绑定的每个指令查找并执行 mount
            bindings.forEach((b) => {
                try {
                    // 解析并绑定指令实现（如果尚未绑定）
                    if (!b.directive) {
                        const dir = lookupDirective(b.name);
                        if (dir) b.directive = dir;
                    }

                    if (b.directive && isFunction(b.directive.mount)) {
                        // 预求值表达式（da-on 的事件处理表达式不参与求值）
                        if (b.name !== 'on') {
                            try {
                                b.binding.value = evaluateExpression(b.expression, instance);
                            } catch (e) {}
                        }
                        b.directive.mount(b.el, b.binding);
                    }
                } catch (e) {
                    console.error("[Da compile] directive mount error:", e);
                }
            });
            // 条件链：等 da-if/da-else-if/da-else 所有成员挂载、标记就绪后再整体解析。
            // 只对链头调用（前面没有同链兄弟的元素），避免同链被重复解析。
            bindings.forEach((b) => {
                const prev = b.el.previousElementSibling;
                const isChainHead = b.el._daIfType && (!prev || !prev._daIfType);
                if (isChainHead && b.directive && isFunction(b.directive.resolveChain)) {
                    try {
                        b.directive.resolveChain(b.el);
                    } catch (e) {
                        console.error("[Da compile] resolveChain error:", e);
                    }
                }
            });
            // 初始渲染文本插值（da-once 冻结后不再更新，必须在此渲染）
            textBindings.forEach((b) => {
                b.update();
            });
        },
        update() {
            // 更新指令绑定（da-once 的绑定冻结，跳过）
            bindings.forEach((b) => updateBinding(b, instance));
            // 更新文本插值 {{ }}（da-once 的文本冻结，跳过）
            textBindings.forEach((b) => {
                if (b.once) return;
                b.update();
            });
        },
        unmount() {
            bindings.forEach((b) => {
                if (b.directive && isFunction(b.directive.unmount)) {
                    b.directive.unmount(b.el);
                }
            });
        },
    };
}

// ============================================================
// DOM 遍历
// ============================================================

function traverseNodes(node, bindings, textBindings, styleContents, slotInfos, instance, once = false) {
    if (!node || !node.childNodes) return;

    if (node.tagName === "STYLE") {
        styleContents.push(node.textContent || "");
    }

    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];

        if (child.nodeType === Node.ELEMENT_NODE) {
            // 作用域插槽容器：内容已由插槽渲染器单独编译，跳过该子树，
            // 避免用宿主实例编译出无 slotScope 的绑定（会错误地隐藏插槽内 da-if 等）
            if (child._daSlotContainer) {
                continue;
            }

            // da-pre：跳过该元素及其子树编译，原样输出（含 {{ }} 原始文本）
            if (child.hasAttribute && child.hasAttribute("da-pre")) {
                continue;
            }

            // da-once：冻结该元素及其子树，只渲染一次
            const isOnce = once || (child.hasAttribute && child.hasAttribute("da-once"));

            // 检测 <slot> 元素，提取作用域属性
            if (child.tagName === "SLOT") {
                collectSlotInfo(child, slotInfos);
            }

            // 处理指令
            processElement(child, bindings, instance, isOnce);

            // da-for / da-if 等结构性指令自己管理子树，不在此处递归
            if (child.hasAttribute && child.hasAttribute("da-for")) {
                continue;
            }

            // 递归子节点
            traverseNodes(child, bindings, textBindings, styleContents, slotInfos, instance, isOnce);
        } else if (child.nodeType === Node.TEXT_NODE) {
            processTextNode(child, textBindings, instance, once);
        }
    }
}

// ============================================================
// 作用域插槽信息收集
// ============================================================

function collectSlotInfo(slotEl, slotInfos) {
    const name = slotEl.getAttribute("name") || "default";
    const props = {};

    // 提取所有 :prop="expression" 属性作为暴露的插槽属性
    const attrs = Array.from(slotEl.attributes || []);
    attrs.forEach((attr) => {
        const match = attr.name.match(/^:(.+)/);
        if (match) {
            const propName = match[1];
            const expression = attr.value.trim();
            props[propName] = expression;
        }
    });

    slotInfos.push({
        el: slotEl,
        name,
        props, // { item: 'data', index: 'index' }  — prop名 → 表达式
    });
}

// ============================================================
// 文本插值处理
// ============================================================

function processTextNode(textNode, textBindings, instance, once = false) {
    const text = textNode.textContent;
    if (!interpolationRE.test(text)) {
        interpolationRE.lastIndex = 0;
        return;
    }
    interpolationRE.lastIndex = 0;

    const expressions = [];
    let match;
    let lastIndex = 0;
    let result = "";

    while ((match = interpolationRE.exec(text)) !== null) {
        if (match.index > lastIndex) {
            result += text.slice(lastIndex, match.index);
        }

        const expr = match[1].trim();
        expressions.push(expr);
        result += `__expr_${expressions.length - 1}__`;
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        result += text.slice(lastIndex);
    }

    const binding = {
        el: textNode,
        expressions,
        template: result,
        type: "text",
        once, // da-once 子树内的文本插值只渲染一次
        update() {
            let str = this.template;
            for (let i = 0; i < this.expressions.length; i++) {
                const val = evaluateExpression(this.expressions[i], instance);
                str = str.replace(`__expr_${i}__`, val !== undefined && val !== null ? String(val) : "");
            }
            this.el.textContent = str;
        },
    };

    textBindings.push(binding);
}

// ============================================================
// 元素处理
// ============================================================

function processElement(el, bindings, instance, once = false) {
    const attrs = Array.from(el.attributes || []);
    const directives = [];

    attrs.forEach((attr) => {
        const { name, value } = attr;

        if (SLOT_DIRECTIVES.some((d) => name.startsWith(d)) || name.startsWith(SLOT_SHORTHAND)) {
            // da-slot / #  — 由父组件处理，此处跳过
            return;
        }

        if (DIRECTIVE_PREFIXES.some((p) => name.startsWith(p))) {
            const directive = parseDirective(name, value);
            if (directive) directives.push(directive);
        } else if (name.startsWith(BIND_SHORTHAND)) {
            const arg = name.slice(1);
            directives.push({
                name: "bind",
                expression: value.trim(),
                arg,
                modifiers: {},
            });
        } else if (name.startsWith(EVENT_SHORTHAND)) {
            // @click.prevent.ctrl → arg=click, modifiers={ prevent, ctrl }
            const parts = name.slice(1).split(".");
            const arg = parts[0];
            const modifiers = {};
            for (let i = 1; i < parts.length; i++) {
                modifiers[parts[i]] = true;
            }
            directives.push({
                name: "on",
                expression: value.trim(),
                arg,
                modifiers,
            });
        }
    });

    const ifDir = directives.find((d) => d.name === "if");
    const elseIfDir = directives.find((d) => d.name === "else-if");
    const elseDir = directives.find((d) => d.name === "else");

    if (ifDir) {
        bindings.push(createBinding(el, ifDir, instance, once));
    } else if (elseIfDir) {
        bindings.push(createBinding(el, elseIfDir, instance, once));
    } else if (elseDir) {
        bindings.push(createBinding(el, elseDir, instance, once));
    }

    directives.forEach((dir) => {
        if (["if", "else-if", "else"].includes(dir.name)) return;
        bindings.push(createBinding(el, dir, instance, once));
    });
}

// ============================================================
// 指令解析
// ============================================================

function parseDirective(attrName, attrValue) {
    // 识别使用的前缀
    let usedPrefix = "";
    for (const p of DIRECTIVE_PREFIXES) {
        if (attrName.startsWith(p)) {
            usedPrefix = p;
            break;
        }
    }
    if (!usedPrefix) return null;

    let rest = attrName.slice(usedPrefix.length);

    const parts = rest.split(":");
    let name = parts[0];
    let argWithModifiers = parts.slice(1).join(":") || "";

    let arg = "";
    const modifiers = {};

    if (argWithModifiers) {
        const modifierParts = argWithModifiers.split(".");
        arg = modifierParts[0];
        for (let i = 1; i < modifierParts.length; i++) {
            modifiers[modifierParts[i]] = true;
        }
    }

    const expression = attrValue ? attrValue.trim() : "";

    return { name, expression, arg, modifiers };
}

// ============================================================
// 指令绑定创建
// ============================================================

function createBinding(el, dirInfo, instance, once = false) {
    const { name, expression, arg, modifiers } = dirInfo;

    let value;
    // da-on 指令的表达式是事件处理代码，不应在绑定时求值
    if (expression && name !== 'on') {
        value = evaluateExpression(expression, instance);
    }

    // 检测动态参数 da-bind:[dynamicAttr] 或 :[dynamicAttr]
    let dynamicArgExpr = null;
    let resolvedArg = arg;
    if (arg && arg.startsWith("[") && arg.endsWith("]")) {
        dynamicArgExpr = arg.slice(1, -1).trim();
        resolvedArg = evaluateExpression(dynamicArgExpr, instance);
    }

    const binding = {
        value,
        oldValue: undefined,
        expression,
        arg: resolvedArg,
        dynamicArgExpr,
        modifiers,
        instance,
    };

    return {
        el,
        name,
        expression,
        directive: null,
        binding,
        once, // da-once 子树内的指令绑定只渲染一次，不再更新
    };
}

/**
 * 解析动态指令参数（运行时重新求值）
 * 用于 da-bind:[expr] 和 da-on:[expr]
 */
export function resolveBindingArg(binding, instance) {
    if (binding.dynamicArgExpr) {
        const newArg = evaluateExpression(binding.dynamicArgExpr, instance);
        if (newArg !== binding.arg) {
            binding.arg = newArg;
            return true; // arg 发生变化
        }
    }
    return false;
}

// ============================================================
// 作用域插槽模板编译
// ============================================================

/**
 * 编译父级的 da-slot 模板内容
 *
 * 将 <template da-slot:name="{ item }">{{ item.name }}</template>
 * 编译为可接收 slotData 并返回渲染后 DOM 的函数。
 *
 * 复用主编译器 compile()，因此插槽内容支持全部能力：
 * {{ }} 插值、da-* 指令、:attr / @event 简写、对象式 :class / :style。
 * 表达式求值时 slotData 优先（通过 $slotScope 注入），组件数据兜底。
 *
 * @param {string} html - 模板 HTML 字符串（<template> 内的内容）
 * @param {string[]} slotPropNames - 插槽暴露的 prop 名列表，如 ['item', 'index']
 * @param {object} instance - 宿主组件实例（用于兜底解析组件数据 / 方法）
 * @returns {Function} render(slotData) → { fragment, compiled }
 */
export function compileSlotTemplate(html, slotPropNames, instance) {
    if (!html || !html.trim()) {
        return () => ({ fragment: document.createDocumentFragment(), compiled: null });
    }

    // 预解析模板 DOM，避免每次渲染重复解析 HTML 字符串
    const temp = document.createElement("template");
    temp.innerHTML = html;

    return function renderSlot(slotData) {
        // 克隆出全新的 DOM
        const fragment = temp.content.cloneNode(true);

        // 插槽作用域：slotData 优先，组件自身数据兜底
        const slotInstance = Object.create(instance);
        slotInstance.$slotScope = slotData;

        // 复用主编译器编译并绑定指令
        const compiled = compile(fragment, slotInstance);
        return { fragment, compiled };
    };
}

// ============================================================
// 更新函数
// ============================================================

export function updateTextBindings(textBindings) {
    textBindings.forEach((b) => {
        if (b.once) return; // da-once 冻结
        b.update();
    });
}

/**
 * 更新单个指令绑定（细粒度 effect 与全量更新共用）
 *
 * - da-once 绑定冻结，跳过
 * - 动态参数（da-bind:[expr] / da-on:[expr]）变化时先卸载再重新挂载
 * - da-on 事件表达式不参与值求值
 */
export function updateBinding(b, instance) {
    if (b.once || !b.directive) return

    // 解析动态参数，变化时先卸载再重新挂载
    const argChanged = resolveBindingArg(b.binding, instance)
    if (argChanged && isFunction(b.directive.unmount)) {
        try { b.directive.unmount(b.el) } catch (e) {}
        try { b.directive.mount(b.el, b.binding) } catch (e) {}
        return
    }

    if (!isFunction(b.directive.update)) return

    // da-on 的事件处理表达式不参与值求值
    if (b.name !== 'on') {
        b.binding.oldValue = b.binding.value
        b.binding.value = evaluateExpression(b.expression, instance)
    }

    try {
        b.directive.update(b.el, b.binding)
    } catch (e) {
        console.error(`[Da] directive "${b.name}" update error:`, e)
    }
}

export function updateDirectiveBindings(bindings, instance) {
    bindings.forEach((b) => updateBinding(b, instance))

    bindings.forEach((b) => {
        if (b.type === "text") {
            b.update();
        }
    });
}
