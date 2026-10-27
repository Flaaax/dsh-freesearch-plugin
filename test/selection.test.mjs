import assert from 'node:assert/strict'
import test from 'node:test'
import { createSelectionController, OFFICIAL_PROVIDER_ID, PROVIDER_ID } from '../lib/provider.js'

test('仅在为空或官方默认 provider 时接管', async () => {
  for (const initial of [undefined, OFFICIAL_PROVIDER_ID]) {
    let current = initial
    const controller = createSelectionController({
      readSelection: () => current,
      writeSelection: async value => { current = value },
      takeoverEnabled: () => true,
    })
    await controller.reconcile()
    assert.equal(current, PROVIDER_ID)
  }
})

test('已显式选择其他 provider 时不抢占', async () => {
  let current = 'another-provider'
  let writes = 0
  const controller = createSelectionController({
    readSelection: () => current,
    writeSelection: async value => { writes++; current = value },
    takeoverEnabled: () => true,
  })
  await controller.reconcile()
  assert.equal(current, 'another-provider')
  assert.equal(writes, 0)
})

test('UI 撤销和 dispose 只在当前仍指向本插件时恢复', async () => {
  let enabled = false
  let current = PROVIDER_ID
  const controller = createSelectionController({
    readSelection: () => current,
    writeSelection: async value => { current = value },
    takeoverEnabled: () => enabled,
  })
  await controller.reconcile()
  assert.equal(current, OFFICIAL_PROVIDER_ID)
  enabled = true
  await controller.reconcile()
  assert.equal(current, PROVIDER_ID)
  current = 'user-choice'
  await controller.stop()
  assert.equal(current, 'user-choice')
})

test('选择写入串行执行', async () => {
  let current = OFFICIAL_PROVIDER_ID
  let active = 0
  let maximum = 0
  const controller = createSelectionController({
    readSelection: () => current,
    takeoverEnabled: () => true,
    writeSelection: async value => {
      active++
      maximum = Math.max(maximum, active)
      await Promise.resolve()
      current = value
      active--
    },
  })
  await Promise.all([controller.reconcile(), controller.reconcile()])
  assert.equal(maximum, 1)
})
