/**
 * TodoList 组件
 *
 * 演示：da-for 列表渲染、da-model 双向绑定、da-if 条件、:class 动态样式
 *
 * 使用：<da-todo></da-todo>
 */

import { Component } from '../../src/da.js'

class TodoList extends Component {
  static tagName = 'da-todo'

  static template = `
    <style>
      :host { display: block; font-family: sans-serif; }
      .add-bar { display: flex; gap: 8px; margin-bottom: 16px; }
      .add-bar input { flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
      .add-bar button { padding: 8px 16px; background: #42b883; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
      .add-bar button:hover { background: #359b6c; }
      .item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #eee; }
      .item.done span { text-decoration: line-through; color: #999; }
      .item span { flex: 1; }
      .item button { background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 16px; }
      .stats { margin-top: 12px; font-size: 13px; color: #666; }
    </style>

    <div class="add-bar">
      <input da-model="newTodo" @keyup.enter="addTodo" placeholder="输入待办..." />
      <button @click="addTodo" :disabled="!newTodo.trim()">添加</button>
    </div>

    <div da-if="todos.length === 0" style="color:#999;text-align:center;padding:20px;">
      暂无待办，添加一条吧 ✨
    </div>

    <div da-for="(todo, index) in todos" :key="todo.id" class="item">
      <input type="checkbox" da-model="todo.done" />
      <span :class="{ done: todo.done }">{{ todo.text }}</span>
      <button @click="removeTodo(index)">✕</button>
    </div>

    <div class="stats">
      <span>总计：{{ todos.length }}</span> | <span>已完成：{{ completedCount }}</span>
    </div>
  `

  newTodo = ''
  todos = [
    { id: 1, text: '学习 Da 框架', done: true },
    { id: 2, text: '写一个示例', done: false },
    { id: 3, text: '完善文档', done: false },
  ]

  get completedCount() {
    return this.todos.filter((t) => t.done).length
  }

  addTodo() {
    const text = this.newTodo.trim()
    if (!text) return
    this.todos.push({ id: Date.now(), text, done: false })
    this.newTodo = ''
  }

  removeTodo(index) {
    this.todos.splice(index, 1)
  }

  onMounted() {
    console.log('[da-todo] 已挂载，初始待办数:', this.todos.length)
  }
}

export default TodoList
