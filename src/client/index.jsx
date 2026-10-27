// Desktop 插件配置页的 client 面：把配置卡片注册到 Plugins 页面的
// 顶层 `plugins.bundle.config` slot，读取共享配置表单（configForms）并注入 store 与写操作。

import { SettingsCard, BUNDLE_CONFIG_KEY, SETTINGS_ENTRY_ID, settingsForm } from './settings-card.jsx'

export const name = 'dsh-minimal-free-search'
export const inject = ['slots', 'configForms']

export function apply(ctx) {
  ctx.effect(function* () {
    const settings = ctx.configForms.get(SETTINGS_ENTRY_ID)
    const { form, store } = settingsForm(settings)
    yield () => { form.dispose() }

    yield ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
      name: 'plugins.bundle.config',
      key: BUNDLE_CONFIG_KEY,
      inject: () => ({ hooks: { settingsCard: store }, ...form.actions() }),
    }, SettingsCard))
  }, 'dsh-minimal-free-search client')
}
