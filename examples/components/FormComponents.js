/**
 * 表单相关组件（组件 da-model 演示）
 *
 * DaInput    — 自定义输入框，da-model="val"
 * DaForm     — 表单容器，多个 da-model
 * DaFullName — 双 da-model：da-model:first / da-model:last
 */

import { Component } from '../../src/da.js'

// ───── 自定义输入框 ─────
class DaInput extends Component {
  static tagName = 'da-input'

  static template = `
    <style>
      :host { display: inline-block; }
      input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box; }
      input:focus { outline: none; border-color: #42b883; }
    </style>
    <input :value="modelValue" @input="onInput" />
  `

  static props = {
    modelValue: { type: String, default: '' },
  }

  onInput(event) {
    this.$emit('update:modelValue', event.target.value)
  }
}

// ───── 表单组件 ─────
class DaForm extends Component {
  static tagName = 'da-form'

  static template = `
    <style>
      :host { display: block; }
      .field { margin-bottom: 12px; }
      .field label { display: block; margin-bottom: 4px; font-size: 13px; color: #666; }
      .field input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
      .field input:focus { outline: none; border-color: #42b883; }
      .preview { background: #f0f9f4; padding: 12px; border-radius: 8px; margin-top: 12px; }
      .preview p { margin: 4px 0; }
    </style>
    <h3>📝 用户信息</h3>
    <div class="field"><label>姓名</label><da-input da-model="name"></da-input></div>
    <div class="field"><label>邮箱</label><da-input da-model="email"></da-input></div>
    <div class="field"><label>年龄</label><da-input da-model.number="age"></da-input></div>
    <div class="preview">
      <p><strong>实时预览：</strong></p>
      <p>姓名：{{ name }}</p>
      <p>邮箱：{{ email }}</p>
      <p>年龄：{{ age }}</p>
    </div>
  `

  name = '张三'
  email = 'zhangsan@example.com'
  age = 28
}

// ───── 全名输入组件（多 da-model） ─────
class DaFullName extends Component {
  static tagName = 'da-full-name'

  static template = `
    <style>
      :host { display: flex; gap: 8px; align-items: center; }
      input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
      input:focus { outline: none; border-color: #42b883; }
      span { font-size: 18px; color: #999; }
    </style>
    <input :value="first" @input="$emit('update:first', $event.target.value)" placeholder="姓" />
    <span>·</span>
    <input :value="last" @input="$emit('update:last', $event.target.value)" placeholder="名" />
  `

  static props = {
    first: { type: String, default: '' },
    last: { type: String, default: '' },
  }
}

export { DaInput, DaForm, DaFullName }
