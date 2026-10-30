#!/usr/bin/env node
import assert from 'node:assert/strict';
import { convertMessages } from '../lib/convert.js';

const id = 'call-59f32be0-caa7-4f18-b083-dc18098aba9f-349|fc_26a12e66-fb9e-9af1-8cf5-cbf6d475ce85_0';
const call = (callId = id, name = 'lookup_value') => ({
  role: 'assistant',
  content: [{ type: 'tool-call', id: callId, name, arguments: '{"key":"answer"}' }],
  source: { provider: 'openai-codex', model: 'test-model' },
});
const result = (callId = id, content = [{ type: 'text', text: '42' }]) => ({
  role: 'tool', toolCallId: callId, content,
  source: { kind: 'tool', callId },
});
const model = 'claude-sonnet-5-5';
const runtime = 'claude-sonnet-5-5-medium';

const converted = convertMessages([call(), result()], model, runtime);
assert.equal(converted[0].parts[0].functionCall.name, 'lookup_value');
assert.equal(converted[1].parts[0].functionResponse?.name, 'lookup_value',
  'DSH role:tool message must become a functionResponse, not plain text');
assert.equal(converted[1].parts[0].functionResponse.id, converted[0].parts[0].functionCall.id,
  'foreign-provider call IDs must match after sanitization');
assert.deepEqual(converted[1].parts[0].functionResponse.response, { output: '42' });

const parallel = convertMessages([
  { role: 'assistant', content: [call('a', 'first').content[0], call('b', 'second').content[0]] },
  result('a', 'one'), result('b', 'two'),
  { role: 'user', content: 'Continue.' },
], model, runtime);
assert.equal(parallel.length, 3);
assert.deepEqual(parallel[1].parts.map(p => p.functionResponse.id), ['a', 'b']);
assert.deepEqual(parallel[1].parts.map(p => p.functionResponse.name), ['first', 'second']);
assert.deepEqual(parallel[2].parts, [{ text: 'Continue.' }]);

const failure = convertMessages([call(), { ...result(), isError: true }], model, runtime);
assert.deepEqual(failure[1].parts[0].functionResponse.response, { error: '42' });
const empty = convertMessages([call(), result(id, [])], model, runtime);
assert.deepEqual(empty[1].parts[0].functionResponse.response, { output: '' });
const foreign = convertMessages([call(), result()], 'gemini-4-argon', 'gemini-4-argon-medium');
assert.equal(foreign[1].parts[0].functionResponse.name, 'lookup_value');
assert.equal(foreign[1].parts[0].functionResponse.id, undefined);

const inline = convertMessages([call(), { role: 'user', content: [
  { type: 'tool-result', toolCallId: id, content: [{ type: 'text', text: '42' }] },
] }], model, runtime);
assert.deepEqual(inline[1].parts[0].functionResponse, converted[1].parts[0].functionResponse,
  'legacy inline tool-result blocks remain supported');
assert.equal(convertMessages([{ role: 'user', content: 'hello' }], model, runtime)[0].parts[0].text, 'hello');

// Cross-model thought signature protection:
const claudeMsgWithThought = {
  role: 'assistant',
  content: [
    { type: 'reasoning', text: 'Thinking step' },
    { type: 'text', text: 'Result' },
  ],
  source: {
    provider: 'agy-next',
    model: 'claude-sonnet-5-5',
    replayState: {
      kind: 'antigravity',
      version: 1,
      provider: 'agy-next',
      model: 'claude-sonnet-5-5',
      runtimeModel: 'claude-sonnet-5-5-medium',
      blocks: [
        { type: 'reasoning', thinkingSignature: 'claude-signature-xyz' },
        { type: 'text' },
      ],
    },
  },
};

// Replay to the same model: preserves thoughtSignature
const sameModel = convertMessages([claudeMsgWithThought], 'claude-sonnet-5-5', 'claude-sonnet-5-5-medium');
assert.equal(sameModel[0].parts[0].thought, true);
assert.equal(sameModel[0].parts[0].thoughtSignature, 'claude-signature-xyz');

// Switch to Gemini: foreign thoughtSignature is stripped, reasoning cleanly degrades to plain text
const switchedToGemini = convertMessages([claudeMsgWithThought], 'gemini-3.8-flash', 'gemini-3.8-flash-tiered');
assert.equal(switchedToGemini[0].parts[0].thought, undefined);
assert.equal(switchedToGemini[0].parts[0].thoughtSignature, undefined);
assert.equal(switchedToGemini[0].parts[0].text, 'Thinking step');

console.log('PASS: top-level DSH tool results, paired IDs, parallel calls, errors, empty results, Gemini, legacy inline results, cross-model thought-signature safety');
