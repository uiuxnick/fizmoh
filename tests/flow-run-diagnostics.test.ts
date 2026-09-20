import { test, expect } from 'bun:test'
import { flowRunDiagnosis } from '@/lib/flow-run-diagnostics'
test('diagnostics classify failures without exposing raw provider secrets', () => {
  expect(flowRunDiagnosis('FAILED', '401 token secret-example')).toContain('authorization')
  expect(flowRunDiagnosis('FAILED', '401 token secret-example')).not.toContain('secret-example')
  expect(flowRunDiagnosis('FAILED', 'patient name private-example')).not.toContain('private-example')
  expect(flowRunDiagnosis('FAILED', 'HTTP 429')).toContain('rate limit')
  expect(flowRunDiagnosis('WAITING', null)).toContain('Waiting')
  expect(flowRunDiagnosis('EXPIRED', null)).toContain('expired')
})
