/* 由 scripts/build.mjs 生成，请勿手工编辑。 */
window.__ModuleLoader__.load({
  id: "dsh-minimal-free-search-plugin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/settings-card.jsx
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime = require("react/jsx-runtime");
var SETTINGS_ENTRY_ID = "web-search-minimal-free";
var BUNDLE_CONFIG_KEY = "dsh-minimal-free-search-plugin";
function booleanField(field) {
  return {
    field,
    format: (value) => value === true ? "true" : value === false ? "false" : "",
    parse: (text) => text === "true" || text === "false" ? { kind: "set", value: text === "true" } : void 0
  };
}
function enumField(field) {
  return {
    field,
    format: (value) => typeof value === "string" ? value : "",
    parse: (text) => text === "" ? { kind: "clear" } : { kind: "set", value: text }
  };
}
function settingsForm(scope) {
  const form = new import_dsh_client_ui_primitives.SettingsFormModel(scope, [
    booleanField("takeover"),
    enumField("preferredEngine"),
    booleanField("fallback"),
    enumField("market"),
    enumField("safeSearch"),
    (0, import_dsh_client_ui_primitives.settingsNumberField)("timeoutMs"),
    (0, import_dsh_client_ui_primitives.settingsNumberField)("maxResults")
  ]);
  const store = form.bind(() => ({
    ...form.shell(),
    takeover: form.field("takeover"),
    preferredEngine: form.field("preferredEngine"),
    fallback: form.field("fallback"),
    market: form.field("market"),
    safeSearch: form.field("safeSearch"),
    timeoutMs: form.field("timeoutMs"),
    maxResults: form.field("maxResults")
  }));
  return { form, store };
}
var ENGINE_OPTIONS = [
  { value: "bing", label: "Bing" },
  { value: "duckduckgo", label: "DuckDuckGo" }
];
var MARKET_OPTIONS = [
  { value: "zh-CN", label: "\u4E2D\u6587" },
  { value: "en-US", label: "\u82F1\u6587" }
];
var SAFE_SEARCH_OPTIONS = [
  { value: "off", label: "\u5173\u95ED" },
  { value: "moderate", label: "\u4E2D\u7B49" },
  { value: "strict", label: "\u4E25\u683C" }
];
function SwitchRow({ title, description, checked, disabled, onChange, label }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: "4px 0 0", opacity: 0.7, fontSize: 13 }, children: description })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Switch, { checked, label, disabled, onChange })
  ] });
}
function SegmentRow({ title, description, id, value, options, disabled, onChange, label }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: "4px 0 0", opacity: 0.7, fontSize: 13 }, children: description })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.SegmentedControl, { id, value, options, label, disabled, onChange })
  ] });
}
function NumberRow({ title, description, value, disabled, onChange, label, min, max, step }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: "4px 0 0", opacity: 0.7, fontSize: 13 }, children: description })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_dsh_client_ui_primitives.Input,
      {
        type: "number",
        inputMode: "numeric",
        min,
        max,
        step,
        "aria-label": label,
        value,
        disabled,
        onChange: (event) => {
          onChange(event.target.value);
        }
      }
    )
  ] });
}
var Divider = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 1, margin: "16px 0", background: "var(--dsw-alias-border-subtle, rgba(127,127,127,.2))" } });
function SettingsCard(props) {
  const state = props.useSettingsCard((snapshot) => snapshot);
  if (props.view === "summary") return null;
  const disabled = !state.writable || state.saving;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    import_dsh_client_ui_primitives.SettingsForm,
    {
      labels: {
        unavailable: "\u63D2\u4EF6\u8BBE\u7F6E\u6682\u4E0D\u53EF\u7528\u3002",
        readOnly: "\u5F53\u524D\u914D\u7F6E\u4E3A\u53EA\u8BFB\u3002",
        saveFailed: "\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002",
        save: "\u4FDD\u5B58",
        saving: "\u6B63\u5728\u4FDD\u5B58\u2026"
      },
      state,
      onSave: props.save,
      onDiscard: props.discard,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          SwitchRow,
          {
            title: "\u542F\u7528\u641C\u7D22\u63A5\u7BA1",
            description: "\u52A0\u8F7D\u672C\u63D2\u4EF6\u540E\uFF0C\u628A\u5F53\u524D Search Provider \u5207\u6362\u4E3A minimal-free-search\uFF1B\u5173\u95ED\u5E76\u4FDD\u5B58\u53EF\u64A4\u9500\u63A5\u7BA1\u3002",
            checked: state.takeover.text === "true",
            disabled,
            label: "\u542F\u7528\u641C\u7D22\u63A5\u7BA1",
            onChange: (next) => {
              props.edit("takeover", String(next));
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          SegmentRow,
          {
            title: "\u9996\u9009\u641C\u7D22\u5F15\u64CE",
            description: "\u9996\u9009\u5931\u8D25\u65F6\u4F1A\u4E32\u884C\u56DE\u9000\u5230\u53E6\u4E00\u4E2A\u56FA\u5B9A\u5F15\u64CE\u3002",
            id: "preferredEngine",
            value: state.preferredEngine.text,
            options: ENGINE_OPTIONS,
            disabled,
            label: "\u9996\u9009\u641C\u7D22\u5F15\u64CE",
            onChange: (next) => {
              props.edit("preferredEngine", next);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          SwitchRow,
          {
            title: "\u5931\u8D25\u56DE\u9000",
            description: "\u9996\u9009\u5F15\u64CE\u5931\u8D25\u65F6\uFF0C\u5C1D\u8BD5\u53E6\u4E00\u4E2A\u56FA\u5B9A\u5F15\u64CE\u3002",
            checked: state.fallback.text === "true",
            disabled,
            label: "\u5931\u8D25\u56DE\u9000",
            onChange: (next) => {
              props.edit("fallback", String(next));
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          SegmentRow,
          {
            title: "\u641C\u7D22\u5E02\u573A",
            description: "\u51B3\u5B9A\u641C\u7D22\u5F15\u64CE\u8BF7\u6C42\u7684\u5E02\u573A\u4E0E\u8BED\u8A00\u53C2\u6570\u3002",
            id: "market",
            value: state.market.text,
            options: MARKET_OPTIONS,
            disabled,
            label: "\u641C\u7D22\u5E02\u573A",
            onChange: (next) => {
              props.edit("market", next);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          SegmentRow,
          {
            title: "\u5B89\u5168\u641C\u7D22\u7EA7\u522B",
            description: "\u63A7\u5236\u641C\u7D22\u5F15\u64CE\u8FD4\u56DE\u5185\u5BB9\u7684\u5B89\u5168\u8FC7\u6EE4\u5F3A\u5EA6\u3002",
            id: "safeSearch",
            value: state.safeSearch.text,
            options: SAFE_SEARCH_OPTIONS,
            disabled,
            label: "\u5B89\u5168\u641C\u7D22\u7EA7\u522B",
            onChange: (next) => {
              props.edit("safeSearch", next);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          NumberRow,
          {
            title: "\u8BF7\u6C42\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",
            description: "\u5355\u4E2A\u5F15\u64CE\u8BF7\u6C42\u7684\u8D85\u65F6\u65F6\u95F4\uFF0C\u8303\u56F4 1000\u201320000\u3002",
            value: state.timeoutMs.text,
            disabled,
            label: "\u8BF7\u6C42\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",
            min: 1e3,
            max: 2e4,
            step: 100,
            onChange: (text) => {
              props.edit("timeoutMs", text);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Divider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          NumberRow,
          {
            title: "\u6700\u5927\u7ED3\u679C\u6570",
            description: "\u5355\u6B21\u67E5\u8BE2\u6700\u591A\u8FD4\u56DE\u7684\u7ED3\u679C\u6570\u91CF\uFF0C\u8303\u56F4 1\u201310\u3002",
            value: state.maxResults.text,
            disabled,
            label: "\u6700\u5927\u7ED3\u679C\u6570",
            min: 1,
            max: 10,
            step: 1,
            onChange: (text) => {
              props.edit("maxResults", text);
            }
          }
        )
      ]
    }
  );
}

// src/client/index.jsx
var name = "dsh-minimal-free-search";
var inject = ["slots", "configForms"];
function apply(ctx) {
  ctx.effect(function* () {
    const settings = ctx.configForms.get(SETTINGS_ENTRY_ID);
    const { form, store } = settingsForm(settings);
    yield () => {
      form.dispose();
    };
    yield ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
      name: "plugins.bundle.config",
      key: BUNDLE_CONFIG_KEY,
      inject: () => ({ hooks: { settingsCard: store }, ...form.actions() })
    }, SettingsCard));
  }, "dsh-minimal-free-search client");
}

    return module.exports;
  }
});
