/**
 * da-text 指令
 *
 * 更新元素的 textContent。
 */

const directive = {
  name: 'text',

  mount(el, binding) {
    el.textContent = binding.value ?? ''
  },

  update(el, binding) {
    el.textContent = binding.value ?? ''
  },

  unmount() {
    // noop
  },
}

export default directive
