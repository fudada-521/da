/**
 * DaInput — 输入框组件
 *
 * Props:
 *   value       — 输入值（支持 da-model）
 *   type        — 'text' | 'password' | 'email' | 'number'，默认 'text'
 *   placeholder — 占位文本
 *   disabled    — Boolean
 *   readonly    — Boolean
 *   size        — 'small' | 'medium' | 'large'，默认 'medium'
 *   clearable   — Boolean（显示清空按钮）
 *
 * 使用：
 *   <da-input da-model="name" placeholder="请输入姓名"></da-input>
 *   <da-input da-model.number="age" type="number"></da-input>
 *   <da-input :value="val" @update:modelValue="val = $event"></da-input>
 *
 * @format
 */

import { Component } from "../da.js";

class DaInput extends Component {
    static tagName = "da-input";

    static props = {
        value: { type: String, default: "" },
        type: { type: String, default: "text" },
        placeholder: { type: String, default: "" },
        disabled: { type: Boolean, default: false },
        readonly: { type: Boolean, default: false },
        size: { type: String, default: "medium" },
        clearable: { type: Boolean, default: false },
    };

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
        :value="value"
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
        da-show="clearable && value.length > 0"
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
        // 调试日志：记录每次输入的值并派发 update:value
        this.$emit("update:value", value);
    }

    onClear() {
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
