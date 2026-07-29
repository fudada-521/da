/**
 * da-once 指令
 *
 * 只渲染元素和组件一次，数据变化时不再重新更新。
 * 首次 mount 后跳过所有后续 update。
 */

const directive = {
  name: 'once',

  mount(el) {
    el._daOnce = true
    // 标记指令系统跳过该元素的更新
    el.setAttribute('data-da-once', '')
  },

  update() {
    // 不做任何更新
  },

  unmount() {
    // noop
  },
}

export default directive
