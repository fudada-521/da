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
        },
        update() {
            // 更新指令绑定（da-on 的事件处理表达式不参与求值）
            bindings.forEach((b) => {
                if (b.directive && isFunction(b.directive.update)) {
                    if (b.name !== 'on') {
                        const newValue = evaluateExpression(b.expression, instance);
                        b.binding.value = newValue;
                    }
                    b.directive.update(b.el, b.binding);
                }
            });
            // 更新文本插值 {{ }}
            textBindings.forEach((b) => {
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

function traverseNodes(node, bindings, textBindings, styleContents, slotInfos, instance) {
    if (!node || !node.childNodes) return;

    if (node.tagName === "STYLE") {
        styleContents.push(node.textContent || "");
    }

    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];

        if (child.nodeType === Node.ELEMENT_NODE) {
            // 检测 <slot> 元素，提取作用域属性
            if (child.tagName === "SLOT") {
                collectSlotInfo(child, slotInfos);
            }

            // 处理指令
            processElement(child, bindings, instance);

            // 递归子节点
            traverseNodes(child, bindings, textBindings, styleContents, slotInfos, instance);
        } else if (child.nodeType === Node.TEXT_NODE) {
            processTextNode(child, textBindings, instance);
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

function processTextNode(textNode, textBindings, instance) {
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

function processElement(el, bindings, instance) {
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
            const arg = name.slice(1);
            directives.push({
                name: "on",
                expression: value.trim(),
                arg,
                modifiers: {},
            });
        }
    });

    const ifDir = directives.find((d) => d.name === "if");
    const elseIfDir = directives.find((d) => d.name === "else-if");
    const elseDir = directives.find((d) => d.name === "else");

    if (ifDir) {
        bindings.push(createBinding(el, ifDir, instance));
    } else if (elseIfDir) {
        bindings.push(createBinding(el, elseIfDir, instance));
    } else if (elseDir) {
        bindings.push(createBinding(el, elseDir, instance));
    }

    directives.forEach((dir) => {
        if (["if", "else-if", "else"].includes(dir.name)) return;
        bindings.push(createBinding(el, dir, instance));
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

function createBinding(el, dirInfo, instance) {
    const { name, expression, arg, modifiers } = dirInfo;

    let value;
    if (expression) {
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
 * @param {string} html - 模板 HTML 字符串（<template> 内的内容）
 * @param {string[]} slotPropNames - 插槽暴露的 prop 名列表，如 ['item', 'index']
 * @returns {Function} render(slotData) → DocumentFragment
 */
export function compileSlotTemplate(html, slotPropNames) {
    if (!html || !html.trim()) return () => document.createDocumentFragment();

    // 每次调用时构建新的 DOM
    return function renderSlot(slotData) {
        const temp = document.createElement("template");
        temp.innerHTML = html;
        const content = temp.content;

        // 遍历所有文本节点，替换插值表达式
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        textNodes.forEach((textNode) => {
            const text = textNode.textContent;
            if (!interpolationRE.test(text)) {
                interpolationRE.lastIndex = 0;
                return;
            }
            interpolationRE.lastIndex = 0;

            textNode.textContent = text.replace(interpolationRE, (_, expr) => {
                const trimmed = expr.trim();
                return evaluateWithScope(trimmed, slotData, slotPropNames);
            });
        });

        // 处理 da-bind / :attr
        processSlotBindings(content, slotData, slotPropNames);

        return content;
    };
}

/**
 * 在插槽作用域中求值表达式
 * 表达式中的变量优先匹配 slotData 的 prop，否则返回 undefined
 */
function evaluateWithScope(expr, slotData, slotPropNames) {
    try {
        // 构建作用域变量列表
        const scopeVars = {};
        if (slotData && typeof slotData === "object") {
            for (const key of slotPropNames) {
                scopeVars[key] = slotData[key];
            }
        }

        // 在作用域中求值
        const keys = Object.keys(scopeVars);
        const values = keys.map((k) => scopeVars[k]);
        const fn = new Function(...keys, `return (${expr})`);
        const result = fn(...values);
        return result !== undefined && result !== null ? String(result) : "";
    } catch {
        return "";
    }
}

/**
 * 处理插槽模板中的 da-bind / :attr 指令
 */
function processSlotBindings(root, slotData, slotPropNames) {
    const elements = root.querySelectorAll("*");
    elements.forEach((el) => {
        if (!el.attributes) return;
        const toRemove = [];
        Array.from(el.attributes).forEach((attr) => {
            const match = attr.name.match(/^:(.+)/);
            if (match) {
                const propName = match[1];
                const expr = attr.value.trim();
                const value = evaluateWithScope(expr, slotData, slotPropNames);

                if (propName === "class") {
                    el.className = value;
                } else if (propName === "style") {
                    el.style.cssText = value;
                } else {
                    el.setAttribute(propName, value);
                }
                toRemove.push(attr.name);
            }
        });
        toRemove.forEach((name) => el.removeAttribute(name));
    });
}

// ============================================================
// 更新函数
// ============================================================

export function updateTextBindings(textBindings) {
    textBindings.forEach((b) => b.update());
}

export function updateDirectiveBindings(bindings, instance) {
    bindings.forEach((b) => {
        if (b.directive && isFunction(b.directive.update)) {
            const newValue = evaluateExpression(b.expression, instance);
            b.binding.oldValue = b.binding.value;
            b.binding.value = newValue;
            b.directive.update(b.el, b.binding);
        }
    });

    bindings.forEach((b) => {
        if (b.type === "text") {
            b.update();
        }
    });
}
