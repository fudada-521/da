/**
 * DaButton — 按钮组件
 *
 * Props:
 *   type     — 'primary' | 'default' | 'danger' | 'text'，默认 'default'
 *   size     — 'small' | 'medium' | 'large'，默认 'medium'
 *   disabled — Boolean
 *   loading  — Boolean（显示加载状态，禁用点击）
 *   block    — Boolean（块级按钮，width: 100%）
 *
 * 使用：
 *   <da-button type="primary" @click="handleClick">提交</da-button>
 *   <da-button :disabled="isDisabled">取消</da-button>
 *   <da-button :loading="saving">保存中...</da-button>
 */

import { Component } from '../da.js'

class DaButton extends Component {
  static tagName = 'da-button'

  static props = {
    type: { type: String, default: 'default' },
    size: { type: String, default: 'medium' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    block: { type: Boolean, default: false },
  }

  static template = `
    <style>
      :host {
        display: inline-block;
      }
      :host([block]) {
        display: block;
      }

      button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid transparent;
        border-radius: 6px;
        font-family: inherit;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
        line-height: 1.4;
        width: 100%;
      }
      button:focus-visible {
        box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.3);
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* size */
      button.small  { padding: 4px 12px; font-size: 12px; border-radius: 4px; }
      button.medium { padding: 8px 20px; font-size: 14px; }
      button.large  { padding: 12px 28px; font-size: 16px; border-radius: 8px; }

      /* type: default */
      button.default {
        background: #fff;
        border-color: #d9d9d9;
        color: #333;
      }
      button.default:hover:not(:disabled) {
        border-color: #42b883;
        color: #42b883;
      }
      button.default:active:not(:disabled) {
        background: #f0f9f4;
      }

      /* type: primary */
      button.primary {
        background: #42b883;
        border-color: #42b883;
        color: #fff;
      }
      button.primary:hover:not(:disabled) {
        background: #359b6c;
        border-color: #359b6c;
      }
      button.primary:active:not(:disabled) {
        background: #2d8a5e;
      }

      /* type: danger */
      button.danger {
        background: #e74c3c;
        border-color: #e74c3c;
        color: #fff;
      }
      button.danger:hover:not(:disabled) {
        background: #c0392b;
        border-color: #c0392b;
      }
      button.danger:active:not(:disabled) {
        background: #a93226;
      }

      /* type: text */
      button.text {
        background: transparent;
        border-color: transparent;
        color: #42b883;
      }
      button.text:hover:not(:disabled) {
        background: rgba(66, 184, 131, 0.08);
      }
      button.text:active:not(:disabled) {
        background: rgba(66, 184, 131, 0.15);
      }

      /* loading spinner */
      .spinner {
        display: inline-block;
        width: 14px; height: 14px;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>

    <button :disabled="disabled || loading" :class="type" @click="onClick">
      <span da-show="loading" class="spinner"></span>
      <slot></slot>
    </button>
  `

  onClick(event) {
    if (this.loading || this.disabled) {
      event.stopPropagation()
      event.preventDefault()
    }
  }
}

// 自动注册
if (!customElements.get(DaButton.tagName)) {
  DaButton.define()
}

export default DaButton
