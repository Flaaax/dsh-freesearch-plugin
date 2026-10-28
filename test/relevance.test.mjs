import assert from 'node:assert/strict'
import test from 'node:test'
import { isCjk, looksRelevant, queryOverlapTokens } from '../lib/relevance.js'

test('isCjk 检测中文字符', () => {
  assert.equal(isCjk('清华大学'), true)
  assert.equal(isCjk('hello'), false)
  assert.equal(isCjk('iPhone 17 价格'), true)
})

test('queryOverlapTokens 提取 CJK 二字词与拉丁词', () => {
  assert.deepEqual(queryOverlapTokens('清华大学 官网'), ['清华', '华大', '大学', '官网'])
  assert.deepEqual(queryOverlapTokens('OpenAI API'), ['openai', 'api'])
  assert.deepEqual(queryOverlapTokens('???'), [])
})

test('相关结果判定为相关', () => {
  assert.equal(looksRelevant('清华大学 官网', [{ title: '清华大学', url: 'https://www.tsinghua.edu.cn' }]), true)
})

test('明显错页判定为无关', () => {
  assert.equal(looksRelevant('清华大学 官网', [{ title: '多多招财', snippet: '拼多多', url: 'https://pinduoduo.example/x' }]), false)
})

test('纯符号查询不拦截', () => {
  assert.equal(looksRelevant('???', [{ title: '任意内容', url: 'https://x.example/a' }]), true)
})

test('跨语言品牌别名不误判（苹果→Apple）', () => {
  assert.equal(looksRelevant('苹果 官网', [{ title: 'Apple (中国大陆) - 官方网站', url: 'https://www.apple.com.cn' }]), true)
})
