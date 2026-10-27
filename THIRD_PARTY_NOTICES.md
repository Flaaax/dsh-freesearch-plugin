# 第三方声明

## dsh-free-search

- 项目：<https://github.com/DDDMUC/dsh-free-search>
- 固定版本：`a5843427e894b365c6bd622f4f9a3f7a889fe577`（`v0.9.16`）
- 参考文件：`lib/index.js`
- 改编内容：Bing 结果链接解包、Bing 结果块识别、DuckDuckGo Lite 结果块识别的实现思路。

本项目重新组织并缩小了上述逻辑，只保留两个固定搜索入口，不包含原项目的 fetch provider、设置桥、凭据、多引擎、缓存或附加工具。适用许可证如下：

```text
MIT License

Copyright (c) 2026 dsh-free-search contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
