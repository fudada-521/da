/**
 * da-for 指令
 *
 * 列表渲染，支持 (item, index) in items 语法。
 * 基于 key 追踪元素变化，最小化 DOM 操作。
 *
 * 语法：da-for="(item, index) in items"  或  da-for="item in items"
 * 需配合 key 属性使用：:key="item.id"
 *
 * @format
 */

import { evaluateExpression } from "../shared/utils.js";
import { compile } from "../core/compile.js";

/** 解析 da-for 表达式 */
const forAliasRE = /(?:(.+?)\s+)?\s+in\s+(.+)/;
const stripParenRE = /^\(|\)$/g;

const directive = {
    name: "for",

    mount(el, binding) {
        const { instance, expression } = binding;
        if (!instance) return;

        // 解析 da-for 表达式
        const parsed = parseForExpression(expression);
        if (!parsed) {
            console.warn(`[Da da-for] invalid expression: "${expression}"`);
            return;
        }

        const { itemName, indexName, sourceExpr } = parsed;
        const parent = el.parentNode;
        if (!parent) return;

        // 存储元数据到 el
        el._daFor = { itemName, indexName, sourceExpr, instance, parent };
        el._daForKey = getKey(el);

        // 用注释占位替换原始节点
        const anchor = document.createComment(`da-for: ${expression}`);
        el._daForAnchor = anchor;
        parent.replaceChild(anchor, el);

        // 首次渲染
        renderList(el, anchor);
    },

    update(el, binding) {
        const { instance } = binding;
        if (!instance || !el._daFor) return;

        renderList(el, el._daForAnchor, instance);
    },

    unmount(el) {
        // 清理所有渲染的子节点
        if (el._daForAnchor && el._daForAnchor.parentNode) {
            let sibling = el._daForAnchor.nextSibling;
            while (sibling && sibling._daForItem !== undefined) {
                const next = sibling.nextSibling;
                if (sibling.parentNode) sibling.parentNode.removeChild(sibling);
                sibling = next;
            }
        }
        delete el._daFor;
        delete el._daForAnchor;
    },
};

// ============================================================
// 解析
// ============================================================

function parseForExpression(expression) {
    const trimmed = (expression || "").trim();
    const match = trimmed.match(/^(.+?)\s+in\s+(.+)$/);
    if (!match) return null;

    let alias = (match[1] || "").trim();
    const sourceExpr = match[2].trim();

    if (!alias) return null;

    // 支持 `(todo, index)` 或 `todo, index` 这两种写法
    if (alias.startsWith("(") && alias.endsWith(")")) {
        alias = alias.slice(1, -1).trim();
    }

    const parts = alias
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (parts.length === 0) return null;

    return {
        itemName: parts[0],
        indexName: parts[1] || null,
        sourceExpr,
    };
}

// ============================================================
// 渲染
// ============================================================

function getKey(el) {
    // 尝试从模板节点上获取 key attribute
    const keyAttr = el.getAttribute && el.getAttribute(":key");
    if (keyAttr) return keyAttr.trim();
    const vBindKey = Array.from(el.attributes || []).find((a) => a.name === ":key" || a.name === "da-bind:key");
    return vBindKey ? vBindKey.value.trim() : null;
}

function renderList(templateEl, anchor, instance = templateEl._daFor?.instance) {
    const { itemName, indexName, sourceExpr, parent } = templateEl._daFor;
    const keyExpr = templateEl._daForKey;

    // 获取源数据
    const source = evaluateExpression(sourceExpr, instance);
    if (!Array.isArray(source)) return;

    // 1. 收集旧节点：按 key 建索引
    let sibling = anchor.nextSibling;
    const oldNodes = [];
    const keyToNode = new Map();
    while (sibling && sibling._daForItem !== undefined) {
        oldNodes.push(sibling);
        if (sibling._daForKeyValue !== undefined) {
            keyToNode.set(sibling._daForKeyValue, sibling);
        }
        sibling = sibling.nextSibling;
    }

    // 2. 遍历新列表：key 匹配则复用节点（支持重排），否则新建
    let insertPoint = anchor;
    const reused = new Set();

    source.forEach((item, index) => {
        const scope = { [itemName]: item };
        if (indexName) scope[indexName] = index;
        const keyValue = keyExpr ? evaluateExpressionInScope(keyExpr, instance, scope) : undefined;

        let node = keyValue !== undefined ? keyToNode.get(keyValue) : undefined;

        if (node) {
            // 复用：更新实时作用域数据并重渲染（支持 FLIP 移动动画）
            reused.add(node);
            // 从索引中移除，避免重复 key 把同一节点复用两次
            if (keyValue !== undefined) keyToNode.delete(keyValue);
            node._daForItem = item;
            node._daForIndex = index;
            node._daForKeyValue = keyValue;
            if (node._daForScopeTarget) {
                node._daForScopeTarget[itemName] = item;
                if (indexName) node._daForScopeTarget[indexName] = index;
            }
            if (node._daForCompileResult) {
                node._daForCompileResult.update();
            }
        } else {
            // 新建
            node = templateEl.cloneNode(true);
            delete node._daFor;
            delete node._daForAnchor;
            node._daForItem = item;
            node._daForIndex = index;
            if (keyValue !== undefined) node._daForKeyValue = keyValue;

            // 实时作用域 target（复用更新时直接改它）
            const scopeTarget = { ...scope };
            node._daForScopeTarget = scopeTarget;
            const scopedInstance = createScopedInstance(instance, scope, scopeTarget);
            const result = compile(node, scopedInstance);
            result.mount();
            result.update(); // {{ }} 文本插值渲染
            node._daForCompileResult = result;
        }

        // 3. 保证节点顺序正确（移动节点会触发 transition-group 的 FLIP）
        if (insertPoint.nextSibling !== node) {
            parent.insertBefore(node, insertPoint.nextSibling);
        }
        insertPoint = node;
    });

    // 4. 移除未复用的旧节点（key 已不存在）
    for (const node of oldNodes) {
        if (reused.has(node)) continue;
        if (node._daForCompileResult) {
            try { node._daForCompileResult.unmount(); } catch (e) {}
        }
        if (node.parentNode) node.parentNode.removeChild(node);
    }
}

function createScopedInstance(parentInstance, scope, scopeTarget) {
    // scopeTarget 为实时作用域对象（复用节点更新 item 时直接改它）
    const target = scopeTarget || { ...scope };
    const scopeData = new Proxy(
        target,
        {
            get(t, key) {
                if (key in t) return t[key];
                if (parentInstance && parentInstance.$data && key in parentInstance.$data) {
                    return parentInstance.$data[key];
                }
                return undefined;
            },
            set(t, key, value) {
                t[key] = value;
                return true;
            },
            has(t, key) {
                return key in t || (parentInstance && parentInstance.$data && key in parentInstance.$data);
            },
        },
    );

    return new Proxy(
        {
            $data: scopeData,
            $props: parentInstance?.$props || {},
            $slots: parentInstance?.$slots || {},
        },
        {
            get(t, key) {
                if (key in target) return target[key];
                if (key in t) return t[key];
                if (parentInstance && parentInstance.$data && key in parentInstance.$data) {
                    return parentInstance.$data[key];
                }
                return undefined;
            },
            has(t, key) {
                return (
                    key in target ||
                    key in t ||
                    (parentInstance && parentInstance.$data && key in parentInstance.$data)
                );
            },
        },
    );
}

/** 在增强作用域中求值 */
function evaluateExpressionInScope(expr, instance, scope) {
    try {
        const keys = Object.keys(scope);
        const values = keys.map((k) => scope[k]);
        const fn = new Function("$data", "$props", ...keys, `with($data) { return (${expr}) }`);
        return fn(instance.$data, instance.$props, ...values);
    } catch {
        return undefined;
    }
}

/** 处理子节点的文本插值和指令（简化版本，后面细化） */
function processScopedExpressions(root, scope, instance) {
    // 处理文本节点中的插值
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, null);
    while (walker.nextNode()) {
        const node = walker.currentNode;

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (/\{\{(.+?)\}\}/.test(text)) {
                node.textContent = text.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
                    const val = evaluateExpressionInScope(expr.trim(), instance, scope);
                    return val !== undefined && val !== null ? String(val) : "";
                });
            }
        }

        // 处理 da-bind / da-on 等指令（简化为需要手动实现）
    }
}

export default directive;
