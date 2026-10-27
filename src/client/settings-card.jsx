// Desktop 插件配置页卡片：渲染本插件的 7 个 volatile 配置字段。
// 表单外壳与字段读写复用 DSH 的 ui-primitives（SettingsForm / SettingsFormModel），
// 配置值通过 configForms（ui-settings）按 entry id 共享，不直接读写 Profile 文件。

import {
  Input,
  SegmentedControl,
  SettingsForm,
  SettingsFormModel,
  settingsNumberField,
  Switch,
} from '@deepseek-ai/dsh-client-ui-primitives'

/** configForms.get 使用的 Host 插件 entry id（对应 cordis.patch.yml 里 insert 的 id）。 */
export const SETTINGS_ENTRY_ID = 'web-search-minimal-free'

/** Plugins 页面顶层（bundle）配置 slot 的 key（包名）。 */
export const BUNDLE_CONFIG_KEY = 'dsh-minimal-free-search-plugin'

/** 布尔字段：Switch 用 'true'/'false' 文本暂存。 */
function booleanField(field) {
  return {
    field,
    format: value => (value === true ? 'true' : value === false ? 'false' : ''),
    parse: text => (text === 'true' || text === 'false' ? { kind: 'set', value: text === 'true' } : undefined),
  }
}

/** 枚举字段：SegmentedControl 直接用枚举值字符串暂存。 */
function enumField(field) {
  return {
    field,
    format: value => (typeof value === 'string' ? value : ''),
    parse: text => (text === '' ? { kind: 'clear' } : { kind: 'set', value: text }),
  }
}

/** 用共享配置表单构造本卡片的暂存模型和快照 store。 */
export function settingsForm(scope) {
  const form = new SettingsFormModel(scope, [
    booleanField('takeover'),
    enumField('preferredEngine'),
    booleanField('fallback'),
    enumField('market'),
    enumField('safeSearch'),
    settingsNumberField('timeoutMs'),
    settingsNumberField('maxResults'),
  ])
  const store = form.bind(() => ({
    ...form.shell(),
    takeover: form.field('takeover'),
    preferredEngine: form.field('preferredEngine'),
    fallback: form.field('fallback'),
    market: form.field('market'),
    safeSearch: form.field('safeSearch'),
    timeoutMs: form.field('timeoutMs'),
    maxResults: form.field('maxResults'),
  }))
  return { form, store }
}

const ENGINE_OPTIONS = [
  { value: 'bing', label: 'Bing' },
  { value: 'duckduckgo', label: 'DuckDuckGo' },
]

const MARKET_OPTIONS = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: '英文' },
]

const SAFE_SEARCH_OPTIONS = [
  { value: 'off', label: '关闭' },
  { value: 'moderate', label: '中等' },
  { value: 'strict', label: '严格' },
]

/** 一行开关（标题 + 说明 + Switch）。 */
function SwitchRow({ title, description, checked, disabled, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div>{title}</div>
        <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 13 }}>{description}</p>
      </div>
      <Switch checked={checked} label={label} disabled={disabled} onChange={onChange} />
    </div>
  )
}

/** 一行分段选择（标题 + 说明 + SegmentedControl）。 */
function SegmentRow({ title, description, id, value, options, disabled, onChange, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <div>{title}</div>
        <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 13 }}>{description}</p>
      </div>
      <SegmentedControl id={id} value={value} options={options} label={label} disabled={disabled} onChange={onChange} />
    </div>
  )
}

/** 一行数字输入（标题 + 说明 + Input）。 */
function NumberRow({ title, description, value, disabled, onChange, label, min, max, step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div>{title}</div>
        <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 13 }}>{description}</p>
      </div>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => { onChange(event.target.value) }}
      />
    </div>
  )
}

const Divider = () => <div style={{ height: 1, margin: '16px 0', background: 'var(--dsw-alias-border-subtle, rgba(127,127,127,.2))' }} />

/** 插件配置卡片。`summary` 视图不渲染内容；`page` 视图渲染完整表单。 */
export function SettingsCard(props) {
  const state = props.useSettingsCard(snapshot => snapshot)
  if (props.view === 'summary') return null
  const disabled = !state.writable || state.saving
  return (
    <SettingsForm
      labels={{
        unavailable: '插件设置暂不可用。',
        readOnly: '当前配置为只读。',
        saveFailed: '保存失败，请重试。',
        save: '保存',
        saving: '正在保存…',
      }}
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
      <SwitchRow
        title="启用搜索接管"
        description="加载本插件后，把当前 Search Provider 切换为 minimal-free-search；关闭并保存可撤销接管。"
        checked={state.takeover.text === 'true'}
        disabled={disabled}
        label="启用搜索接管"
        onChange={(next) => { props.edit('takeover', String(next)) }}
      />
      <Divider />
      <SegmentRow
        title="首选搜索引擎"
        description="首选失败时会串行回退到另一个固定引擎。"
        id="preferredEngine"
        value={state.preferredEngine.text}
        options={ENGINE_OPTIONS}
        disabled={disabled}
        label="首选搜索引擎"
        onChange={(next) => { props.edit('preferredEngine', next) }}
      />
      <Divider />
      <SwitchRow
        title="失败回退"
        description="首选引擎失败时，尝试另一个固定引擎。"
        checked={state.fallback.text === 'true'}
        disabled={disabled}
        label="失败回退"
        onChange={(next) => { props.edit('fallback', String(next)) }}
      />
      <Divider />
      <SegmentRow
        title="搜索市场"
        description="决定搜索引擎请求的市场与语言参数。"
        id="market"
        value={state.market.text}
        options={MARKET_OPTIONS}
        disabled={disabled}
        label="搜索市场"
        onChange={(next) => { props.edit('market', next) }}
      />
      <Divider />
      <SegmentRow
        title="安全搜索级别"
        description="控制搜索引擎返回内容的安全过滤强度。"
        id="safeSearch"
        value={state.safeSearch.text}
        options={SAFE_SEARCH_OPTIONS}
        disabled={disabled}
        label="安全搜索级别"
        onChange={(next) => { props.edit('safeSearch', next) }}
      />
      <Divider />
      <NumberRow
        title="请求超时（毫秒）"
        description="单个引擎请求的超时时间，范围 1000–20000。"
        value={state.timeoutMs.text}
        disabled={disabled}
        label="请求超时（毫秒）"
        min={1000}
        max={20000}
        step={100}
        onChange={(text) => { props.edit('timeoutMs', text) }}
      />
      <Divider />
      <NumberRow
        title="最大结果数"
        description="单次查询最多返回的结果数量，范围 1–10。"
        value={state.maxResults.text}
        disabled={disabled}
        label="最大结果数"
        min={1}
        max={10}
        step={1}
        onChange={(text) => { props.edit('maxResults', text) }}
      />
    </SettingsForm>
  )
}
