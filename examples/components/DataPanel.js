/**
 * DataPanel 组件
 *
 * 演示：命名插槽 + 作用域插槽组合
 *
 * 使用：
 *   <da-panel>
 *     <span slot="title">标题</span>
 *     <template da-slot:content="{ data, meta }">{{ data }}</template>
 *   </da-panel>
 */

import { Component } from '../../src/da.js'

class DataPanel extends Component {
  static tagName = 'da-panel'

  static template = `
    <style>
      :host { display: block; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }
      .panel-header { background: #35495e; color: #fff; padding: 10px 16px; font-weight: bold; }
      .panel-body { padding: 16px; }
      .panel-footer { background: #f5f5f5; padding: 8px 16px; font-size: 12px; color: #666; }
    </style>

    <div class="panel-header">
      <slot name="title">{{ panelTitle }}</slot>
    </div>
    <div class="panel-body">
      <slot name="content" :data="panelData" :meta="panelMeta"></slot>
    </div>
    <div class="panel-footer">
      <slot name="footer">默认底部</slot>
    </div>
  `

  panelTitle = '面板标题'
  panelData = 42
  panelMeta = { updated: '2026-07-24', status: 'ok' }
}

export default DataPanel
