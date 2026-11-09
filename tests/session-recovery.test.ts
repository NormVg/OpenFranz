import assert from "node:assert/strict";
import test from "node:test";
import { ClientError } from "eve/client";
import {
  classifySessionProbe,
  isStaleSessionError,
} from "../shared/utils/session-recovery.ts";

test("a definitive 404 marks the session recoverable", () => {
  assert.equal(classifySessionProbe(404), "recover");
  assert.equal(classifySessionProbe(404, ""), "recover");
  assert.equal(classifySessionProbe(404, '{"code":"anything"}'), "recover");
});

test("a live or temporarily failing probe resumes normally", () => {
  assert.equal(classifySessionProbe(200), "resume");
  assert.equal(classifySessionProbe(204), "resume");
  assert.equal(classifySessionProbe(401), "resume");
  assert.equal(classifySessionProbe(429), "resume");
  assert.equal(classifySessionProbe(500), "resume");
  assert.equal(classifySessionProbe(503), "resume");
  assert.equal(classifySessionProbe(null), "resume");
});

test("only a stranded 409 recovers; every other 409 resumes", () => {
  assert.equal(
    classifySessionProbe(409, '{"code":"session_stranded"}'),
    "recover",
  );
  assert.equal(
    classifySessionProbe(409, '{"code":"session_not_active"}'),
    "resume",
  );
  assert.equal(
    classifySessionProbe(409, '{"code":"session_not_ready"}'),
    "resume",
  );
  assert.equal(classifySessionProbe(409, "not json"), "resume");
  assert.equal(classifySessionProbe(409), "resume");
});

test("stale client errors are recognized by status and code", () => {
  assert.equal(isStaleSessionError(new ClientError(404, "", {})), true);
  assert.equal(
    isStaleSessionError(new ClientError(404, '{"code":"http_error"}', {})),
    true,
  );
  assert.equal(
    isStaleSessionError(
      new ClientError(409, '{"code":"session_stranded"}', {}),
    ),
    true,
  );
  assert.equal(
    isStaleSessionError(
      new ClientError(400, '{"code":"session_version_unsupported"}', {}),
    ),
    true,
  );
});

test("transient client errors and lookalikes are not stale", () => {
  assert.equal(isStaleSessionError(new ClientError(500, "", {})), false);
  assert.equal(isStaleSessionError(new ClientError(401, "", {})), false);
  assert.equal(
    isStaleSessionError(new ClientError(409, '{"code":"session_not_active"}', {})),
    false,
  );
  assert.equal(isStaleSessionError(new Error("boom")), false);
  assert.equal(isStaleSessionError(undefined), false);

  const lookalike = Object.assign(new Error("lookalike"), {
    status: 404,
    code: "http_error",
  });
  assert.equal(isStaleSessionError(lookalike), false);
});
