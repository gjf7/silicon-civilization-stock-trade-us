import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSseChunk } from "../lib/deepseek";

// DeepSeek streams the reply as Server-Sent Events. The transport may split an
// event across reads, so the parser has to tolerate a partial tail and let the
// caller carry it into the next read.

test("parses a complete SSE event into text", () => {
  const { text, rest } = parseSseChunk('data: {"choices":[{"delta":{"content":"hello"}}]}\n\n');
  assert.equal(text, "hello");
  assert.equal(rest.trim(), "");
});

test("concatenates multiple events in order", () => {
  const chunk =
    'data: {"choices":[{"delta":{"content":"{\\"sig"}}]}\n' +
    'data: {"choices":[{"delta":{"content":"nals\\":[]}"}}]}\n';
  const { text } = parseSseChunk(chunk);
  assert.equal(text, '{"signals":[]}');
});

test("carries a split event into the next read instead of losing it", () => {
  // The first read ends mid-JSON; nothing should be emitted yet.
  const first = parseSseChunk('data: {"choices":[{"delta":{"content":"AB');
  assert.equal(first.text, "");
  assert.equal(first.rest, 'data: {"choices":[{"delta":{"content":"AB');

  // The second read completes it.
  const second = parseSseChunk(first.rest + 'C"}}]}\n');
  assert.equal(second.text, "ABC");
});

test("ignores the [DONE] sentinel and keep-alive comments", () => {
  const chunk = ": keep-alive\ndata: [DONE]\n";
  const { text } = parseSseChunk(chunk);
  assert.equal(text, "");
});

test("skips blank and non-data lines", () => {
  const chunk = "\n\nevent: message\ndata: {\"choices\":[{\"delta\":{\"content\":\"x\"}}]}\n";
  const { text } = parseSseChunk(chunk);
  assert.equal(text, "x");
});

test("a malformed payload does not throw", () => {
  const chunk = 'data: {not json}\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n';
  const { text } = parseSseChunk(chunk);
  assert.equal(text, "ok");
});
