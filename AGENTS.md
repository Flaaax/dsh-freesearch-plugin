# 项目协作约束

- 项目文档、源码注释和协作交流默认使用中文。
- 凡涉及本机 DeepSeek Harness 的安装位置、版本、运行时、Profile 行为、插件安装或验证，必须先读取并遵循：

  ```text
  E:\Projects\Python\PythonWorkspace\Project_DeepSeekHarness\README.md
  ```

- 第一版只实现 DSH 原生 `web_search` provider，不注册、不选择、不修改 `web_fetch` provider。
- 未经用户明确授权，不修改真实 `desktop` Profile；开发和集成验证使用隔离的 `plugin-dev` Profile。
- 不提交 `_references/`、临时包、测试输出、日志、凭据或 DSH Profile 内容。

