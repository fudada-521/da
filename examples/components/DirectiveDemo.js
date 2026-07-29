/**
 * DirectiveDemo 组件
 *
 * 演示：自定义指令 da-highlight / da-focus / da-number、内置 da-once
 *
 * 使用：<da-directive-demo></da-directive-demo>
 */

import { Component } from '../../src/da.js'

class DirectiveDemo extends Component {
  static tagName = 'da-directive-demo'

  static template = `
    <style>
      :host { display: block; }
      .demo-card { border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; margin: 12px 0; }
      .demo-card h4 { margin: 0 0 8px; color: #35495e; }
      button { padding: 6px 14px; border: 1px solid #42b883; background: #fff; color: #42b883; border-radius: 6px; cursor: pointer; font-size: 13px; margin: 2px; }
      button:hover { background: #42b883; color: #fff; }
    </style>

    <div class="demo-card">
      <h4>🔦 da-highlight — 高亮指令</h4>
      <p da-highlight="'lightyellow'">鼠标悬停时高亮这一行。</p>
      <p da-highlight="'#e8f5e9'">绿色高亮</p>
      <p da-highlight="'#e3f2fd'">蓝色高亮</p>
    </div>

    <div class="demo-card">
      <h4>📌 da-focus — 自动聚焦</h4>
      <input da-focus type="text" placeholder="自动聚焦到这里" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;" />
    </div>

    <div class="demo-card">
      <h4>🔢 da-number — 数字格式化</h4>
      <p>价格：<span da-number="2">{{ price }}</span> 元</p>
      <p>比例：<span da-number="3">{{ ratio }}</span>%</p>
    </div>

    <div class="demo-card">
      <h4>🧱 da-once — 一次性渲染</h4>
      <p>普通绑定：<strong>{{ dynamic }}</strong>（会更新）</p>
      <p da-once>一次性绑定：<strong>{{ dynamic }}</strong>（不会更新）</p>
      <button @click="dynamic = dynamic + '!'">追加感叹号</button>
    </div>
  `

  price = 19.9
  ratio = 3.14159
  dynamic = 'Hello'
}

export default DirectiveDemo
