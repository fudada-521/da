/**
 * Counter 组件
 *
 * 演示：Class 风格组件、Props、响应式数据、da-on、da-bind、da-show
 *
 * 使用：<da-counter :title="'我的计数器'"></da-counter>
 */

import { Component } from '../../src/da.js'

class Counter extends Component {
  static tagName = 'da-counter'

  static template = `
    <style>
      :host {
        display: inline-block;
        padding: 20px;
        border: 2px solid #42b883;
        border-radius: 12px;
        font-family: sans-serif;
        text-align: center;
      }
      .value { font-size: 48px; font-weight: bold; color: #42b883; margin: 16px 0; }
      button {
        font-size: 18px; padding: 8px 20px; margin: 0 6px;
        border: 1px solid #42b883; background: #fff;
        border-radius: 8px; cursor: pointer;
      }
      button:hover { background: #42b883; color: #fff; }
      .even { color: #35495e; font-size: 14px; margin-top: 8px; }
      .odd  { color: #999; font-size: 14px; margin-top: 8px; }
    </style>
    <div>
      <p class="value">{{ count }}</p>
      <button @click="decrement">−</button>
      <button @click="increment">+</button>
      <button @click="reset">重置</button>
      <p :class="count % 2 === 0 ? 'even' : 'odd'">
        当前数字是{{ count % 2 === 0 ? '偶数' : '奇数' }}
      </p>
      <p da-show="count > 5" style="color: red">⚠️ 超过 5 了！</p>
    </div>
  `

  static props = {
    title: { type: String, default: '计数器' },
  }

  count = 0

  increment() { this.count++ }
  decrement() { this.count-- }
  reset() { this.count = 0 }

  onMounted() {
    console.log(`[${this.$tag}] mounted, title:`, this.$props.title)
  }
}

export default Counter
