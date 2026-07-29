/**
 * UserCard 组件
 *
 * 演示：作用域插槽 :prop / da-slot / #简写
 *
 * 使用：
 *   <da-user-card>
 *     <template #default="{ user, isAdmin }">{{ user.name }}</template>
 *   </da-user-card>
 */

import { Component } from '../../src/da.js'

class UserCard extends Component {
  static tagName = 'da-user-card'

  static template = `
    <style>
      :host { display: block; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; }
      .card-header { font-size: 14px; color: #999; margin-bottom: 12px; }
      .card-body { min-height: 40px; }
      .card-footer { font-size: 12px; color: #bbb; margin-top: 8px; text-align: right; }
      .btn-show { padding: 6px 14px; background: #42b883; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
      .btn-show:hover { background: #359b6c; }
    </style>

    <div class="card-header">👤 用户信息卡片</div>
    <div class="card-body">
      <slot :user="currentUser" :is-admin="isAdmin"></slot>
    </div>
    <div class="card-footer">
      <button class="btn-show" @click="toggleUser">切换用户</button>
    </div>
  `

  users = [
    { name: '张三', role: '前端工程师', email: 'zhangsan@example.com' },
    { name: '李四', role: '后端工程师', email: 'lisi@example.com' },
    { name: '王五', role: '设计师', email: 'wangwu@example.com' },
  ]

  currentIndex = 0
  isAdmin = true

  get currentUser() {
    return this.users[this.currentIndex]
  }

  toggleUser() {
    this.currentIndex = (this.currentIndex + 1) % this.users.length
    this.isAdmin = !this.isAdmin
  }
}

export default UserCard
