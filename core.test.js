import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeHooks,
  analyzeRisks,
  generateHooks,
  inspectStructure,
} from "./core.js";

const sample = `标题：跟风买乳铁蛋白结果踩大雷了……

上个月换季，我家猫一天打十几个喷嚏，软便也反反复复。
看到很多人推荐乳铁蛋白，我就跟风买了一款，结果喂了两天就开始软便。
后来才知道，不能只看含量。`;

test("hook analysis identifies the opening story devices", () => {
  const result = analyzeHooks(sample);
  assert.ok(result.hookTypes.includes("场景痛点"));
  assert.ok(result.hookTypes.includes("踩坑经历"));
  assert.ok(result.hookTypes.includes("症状细节"));
  assert.ok(result.score >= 50);
});

test("risk analysis catches medical and unsupported claims", () => {
  const result = analyzeRisks(
    "这款能抑制病毒繁殖，250mg刚好是吸收的上限。喂完喷嚏再也没有了，所有猫肯定有效。",
  );
  assert.ok(result.high >= 3);
  const ids = new Set(result.issues.map((issue) => issue.id));
  assert.ok(ids.has("medical-treatment"));
  assert.ok(ids.has("unsupported-mechanism"));
  assert.ok(ids.has("absolute-choice"));
});

test("missing disclaimer is reported for disease stories", () => {
  const result = analyzeRisks(
    "我家猫确诊杯状后，吃这款乳铁蛋白，喷嚏少了很多。",
  );
  assert.ok(result.issues.some((issue) => issue.id === "missing-disclaimer"));
});

test("official jargon is flagged for colloquial rewriting", () => {
  const result = analyzeRisks(
    "本品采用科学配比，协同增效，全面提升核心优势，助力精准养护。",
  );
  assert.ok(result.issues.some((issue) => issue.id === "official-tone"));
});

test("generated hooks return six editable starts", () => {
  const hooks = generateHooks({
    audience: "玻璃胃猫家长",
    pain: "换季软便",
    action: "跟风买乳铁",
    product: "艾尼欧",
    evidence: "0乳糖和适口性",
  });
  assert.equal(hooks.length, 6);
  assert.ok(hooks.every((hook) => hook.title && hook.opening));
});

test("structure analysis flags an overlong article", () => {
  const result = inspectStructure(
    `标题：测试\n\n${"我家猫换季打喷嚏，软便反复。后来我认真看成分，不再只跟风买东西。".repeat(38)}`,
  );
  assert.ok(result.totalLength > 700);
  assert.ok(result.suggestions.some((item) => item.includes("偏长")));
});

