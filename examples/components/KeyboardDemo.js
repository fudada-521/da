/**
 * KeyboardDemo 组件
 *
 * 演示：da-on 键盘修饰符 .enter / .esc / .up / .down / .ctrl
 *
 * 使用：<da-keyboard-demo></da-keyboard-demo>
 */

import { Component } from '../../src/da.js'

class KeyboardDemo extends Component {
  static tagName = 'da-keyboard-demo'

  static template = `
    <style>
      :host { display: block; }
      .demo-box { border: 2px dashed #ccc; border-radius: 12px; padding: 20px; margin: 12px 0; }
      .demo-box:focus-within { border-color: #42b883; }
      input { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
      input:focus { outline: none; border-color: #42b883; }
      .log { background: #1a1a2e; width: 100%; box-sizing: border-box; }
      .hint { font-size: 12px; color: #999; margin-top: 6px; }
    </style>

    <div class="demo-box">
      <label><strong>按 Enter 提交</strong></label>
      <input @keyup.enter="submit" placeholder="输入内容后按 Enter..." />
      <div class="hint">@keyup.enter</div>
    </div>

    <div class="demo-box">
      <label><strong>按 Esc 取消</strong></label>
      <input @keyup.esc="cancel" placeholder="按 Esc 测试..." />
      <div class="hint">@keyup.esc</div>
    </div>

    <div class="demo-box">
      <label><strong>方向键（↑ ↓ ← →）</strong></label>
      <input @keyup.up="move('up')" @keyup.down="move('down')" @keyup.left="move('left')" @keyup.right="move('right')" placeholder="按方向键..." />
      <div class="hint">@keyup.up / @keyup.down / @keyup.left / @keyup.right</div>
    </div>

    <div class="demo-box">
      <label><strong>带系统修饰符（Ctrl + Enter）</strong></label>
      <input @keydown.ctrl.enter="ctrlEnter" placeholder="按 Ctrl+Enter..." />
      <div class="hint">@keydown.ctrl.enter</div>
    </div>

    <div class="demo-box">
      <label><strong>快捷键：</strong></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button @click.prevent.ctrl="shortcut">Ctrl+单击</button>
        <button @click.prevent.shift="shortcut">Shift+单击</button>
        <button @click.prevent.alt="shortcut">Alt+单击</button>
      </div>
      <div class="hint">@click.prevent.ctrl / .shift / .alt</div>
    </div>

    <div class="demo-box">
      <label><strong>操作日志</strong></label>
      <div class="log">{{ logText || '等待操作...' }}</div>
    </div>
  `

  logText = ''

  _log(msg) {
    this.logText = `[${new Date().toLocaleTimeString()}] ${msg}\n${this.logText}`
    const lines = this.logText.split('\n')
    if (lines.length > 10) {
      this.logText = lines.slice(0, 10).join('\n')
    }
  }

  submit(event) {
    this._log(`✅ 提交：${event.target.value}`)
    event.target.value = ''
  }

  cancel() {
    this._log('❌ 取消（Esc）')
  }

  move(dir) {
    this._log(`➡️ 方向：${dir}`)
  }

  ctrlEnter() {
    this._log('⌨️ Ctrl + Enter')
  }

  shortcut(event) {
    const mods = []
    if (event.ctrlKey) mods.push('Ctrl')
    if (event.shiftKey) mods.push('Shift')
    if (event.altKey) mods.push('Alt')
    this._log(`🖱️ ${mods.join('+')} + 单击`)
  }
}

export default KeyboardDemo
