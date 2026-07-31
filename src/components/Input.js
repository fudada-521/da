/**
 * DaInput — 输入框组件
 *
 * Props:
 *   modelValue  — 输入值（da-model 默认绑定），优先于 value
 *   value       — 输入值兼容别名（da-model:value / 静态属性预填）
 *   type        — 'text' | 'password' | 'email' | 'number'，默认 'text'
 *   placeholder — 占位文本
 *   disabled    — Boolean
 *   readonly    — Boolean
 *   size        — 'small' | 'medium' | 'large'，默认 'medium'
 *   clearable   — Boolean（显示清空按钮）
 *
 * 事件：输入时派发 `update:value` 和 `update:modelValue` 两个事件，
 * 因此 `<da-input da-model="x">`（监听 update:modelValue）和
 * `<da-input da-model:value="x">`（监听 update:value）都能工作。
 *
 * 使用：
 *   <da-input da-model="name" placeholder="请输入姓名"></da-input>
 *   <da-input da-model.number="age" type="number"></da-input>
 *   <da-input da-model:value="msg"></da-input>
 *   <da-input :model-value="val" @update:model-value="val = $event"></da-input>
 *
 * @format
 */

import { Component } from "../da.js";

class DaInput extends Component {
    static tagName = "da-input";

    static props = {
        modelValue: { type: String, default: "" },
        value: { type: String, default: "" },
        type: { type: String, default: "text" },
        placeholder: { type: String, default: "" },
        disabled: { type: Boolean, default: false },
        readonly: { type: Boolean, default: false },
        size: { type: String, default: "medium" },
        clearable: { type: Boolean, default: false },
    };

    /** 实际显示的输入值：modelValue 优先，value 兜底 */
    get displayValue() {
        return this.$props.modelValue || this.$props.value || "";
    }

    static template = `
    <style>
      :host {
        display: inline-block;
        width: 100%;
      }

      .wrapper {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
      }

      input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        color: #333;
        background: #fff;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      input:focus {
        border-color: #42b883;
        box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.15);
      }
      input::placeholder {
        color: #bbb;
      }
      input:disabled {
        background: #f5f5f5;
        color: #999;
        cursor: not-allowed;
      }
      input:read-only {
        background: #fafafa;
        cursor: default;
      }

      /* size */
      input.small  { padding: 4px 10px; font-size: 12px; border-radius: 4px; }
      input.medium { padding: 8px 12px; font-size: 14px; }
      input.large  { padding: 12px 16px; font-size: 16px; border-radius: 8px; }

      /* clear button */
      .clear {
        position: absolute;
        right: 8px;
        display: none;
        align-items: center;
        justify-content: center;
        width: 18px; height: 18px;
        border: none;
        border-radius: 50%;
        background: #d9d9d9;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        line-height: 1;
        padding: 0;
      }
      .clear:hover { background: #bbb; }
      .wrapper:hover .clear.show { display: flex; }
    </style>

    <div class="wrapper">
      <input
        :value="displayValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="size"
        @input="onInput"
        @change="$emit('change', $event.target.value)"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />
      <button
        da-show="clearable && displayValue.length > 0"
        class="clear show"
        @click="onClear"
      >✕</button>
    </div>
  `;

    onInput(event) {
        let value = event.target.value;
        if (this.type === "number") {
            value = value === "" ? "" : parseFloat(value) || 0;
        }
        // 同时派发两个事件：update:modelValue（da-model 默认）与 update:value（da-model:value / 别名）
        this.$emit("update:modelValue", value);
        this.$emit("update:value", value);
    }

    onClear() {
        this.$emit("update:modelValue", "");
        this.$emit("update:value", "");
        // 聚焦输入框
        const input = this.$el.querySelector("input");
        if (input) input.focus();
    }
}

// 自动注册
if (!customElements.get(DaInput.tagName)) {
    DaInput.define();
}

export default DaInput;
