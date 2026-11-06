const HOOK_RULES = [
  {
    id: "scene",
    label: "场景痛点",
    pattern:
      /上个月|那天|去年|换季|天一冷|一天能|突然|半夜|回家|打开门|最近|刚开始|第一次/g,
    advice: "有一个具体时间和场景，读者更容易立刻代入。",
  },
  {
    id: "pitfall",
    label: "踩坑经历",
    pattern:
      /跟风|踩雷|翻车|白花钱|不死心|结果|买了|又换|受了两茬罪|后悔|才知道/g,
    advice: "踩坑和反转是小红书软文里很强的推进器。",
  },
  {
    id: "warning",
    label: "劝告口吻",
    pattern: /劝.{0,12}(别|先别|不要)|千万别|不要再|听我一句|真心建议/g,
    advice: "劝告型开头有对象感，但标题不要制造过度恐慌。",
  },
  {
    id: "contrast",
    label: "前后反差",
    pattern:
      /本来以为|没想到|才知道|后来才|换之前|换之后|以前.{0,12}现在|从.{0,8}变成/g,
    advice: "反差要落到具体观察，不要直接写成疗效结论。",
  },
  {
    id: "identity",
    label: "人群标签",
    pattern:
      /玻璃胃|新手养猫|第一次养猫|多猫家庭|幼猫|小奶猫|体弱猫|杯状|鼻支|挑食猫/g,
    advice: "身份标签能让同类用户快速停下来。",
  },
  {
    id: "symptom",
    label: "症状细节",
    pattern:
      /打喷嚏|软便|窜稀|眼角糊|眼泪|不吃|不喝|挑食|难喂|呕吐|口臭|精神差|没胃口/g,
    advice: "症状细节比“免疫力差”更有画面，但要注意医疗边界。",
  },
  {
    id: "numbers",
    label: "数字证据",
    pattern: /\d+(?:\.\d+)?\s?(?:mg|毫克|元|块|天|周|个月|年|次|%|颗|粒|瓶|盒)/gi,
    advice: "数字能增强可信度，同时要核对来源和单位。",
  },
  {
    id: "friend",
    label: "熟人推荐",
    pattern: /朋友|闺蜜|同事|养了.{0,8}年|兽医|医生|大白/g,
    advice: "熟人介入能推动转折，但不要虚构专业背书。",
  },
  {
    id: "honesty",
    label: "坦白感",
    pattern: /大实话|说真的|说实话|不是拉踩|纯个人|真实记录|交作业/g,
    advice: "坦白感适合开头，后面仍要用具体细节支撑。",
  },
  {
    id: "emotion",
    label: "情绪钩子",
    pattern: /崩溃|气死|受罪|心疼|自责|手忙脚乱|一边.{0,8}一边|真的会谢/g,
    advice: "情绪要配一个动作或场景，避免只有夸张形容词。",
  },
  {
    id: "curiosity",
    label: "悬念",
    pattern: /原来|真相|问题不在|才发现|直到|到底|为什么|怎么会/g,
    advice: "悬念后面要尽快给答案，不要连续卖关子。",
  },
];

const RISK_RULES = [
  {
    id: "medical-treatment",
    label: "疾病治疗功效",
    severity: "high",
    pattern: /抑制.{0,5}病毒|抗病毒|治愈|根治|治疗|治好|药到病除|消炎|杀灭/g,
    advice:
      "营养补充品不要写成治疗或抗病毒结论。改成“品牌定位是日常营养补充，不能代替就医和药物”。",
  },
  {
    id: "disease-certainty",
    label: "疾病与产品效果绑定",
    severity: "high",
    pattern:
      /杯状.{0,20}(好了|稳定|不复发)|鼻支.{0,20}(好了|根治)|黄脓.{0,12}清涕|再也不会犯|再也不复发/g,
    advice:
      "可以记录观察到的状态变化，但不要暗示产品改变疾病结果，也不要承诺不复发。",
  },
  {
    id: "absolute-efficacy",
    label: "绝对化功效",
    severity: "high",
    pattern:
      /保证有效|一定有效|肯定有效|必然有效|立刻见效|马上见效|立竿见影|一次见效|彻底解决|百分百|100%有效/g,
    advice: "删掉确定性和时间承诺，改成“个体体验，需长期观察”。",
  },
  {
    id: "unsupported-mechanism",
    label: "未经证实的机制",
    severity: "high",
    pattern:
      /吸收.{0,4}上限|胃酸.{0,12}(损耗|消耗|破坏)|吸收率.{0,8}(提不上去|只有|高达|达到)|100%吸收|直接抑制/g,
    advice: "这类机制结论需要可靠来源。没有来源时只写产品标注，不推断人体或猫体的吸收比例。",
  },
  {
    id: "competitor-attack",
    label: "踩竞品风险",
    severity: "high",
    pattern: /智商税|大冤种|垃圾|一点用没有|完全没用|别买.{0,8}(款|品牌)|割韭菜/g,
    advice: "不要用侮辱性或未经验证的结论评价竞品，改成个人适配和取舍。",
  },
  {
    id: "absolute-choice",
    label: "绝对化选购结论",
    severity: "medium",
    pattern:
      /所有猫|任何猫|闭眼入|首选|只适合|只能选|健康猫就选|玻璃胃就选|肯定不会/g,
    advice: "把“必须、只能、就选”改成“可以重点比较、更适合我的情况”。",
  },
  {
    id: "medical-authority",
    label: "专业人士背书",
    severity: "medium",
    pattern: /兽医说|医生说|大白说|医生推荐|兽医推荐/g,
    advice: "只有真实可核实时才保留专业背书，并注意不要把营养补充写成处方。",
  },
  {
    id: "body-sensation",
    label: "身体改善承诺",
    severity: "medium",
    pattern:
      /喷嚏.{0,12}(没了|不打了|消失了)|软便.{0,12}(好了|稳住了|不再反复)|精神.{0,8}好多了/g,
    advice: "保留个人观察时加上“我观察到、个体差异很大”，避免写成普遍功效。",
  },
  {
    id: "number-source",
    label: "数字需要来源",
    severity: "low",
    pattern: /\d+(?:\.\d+)?\s?(?:mg|毫克|元|天|周|个月|%|倍)/gi,
    advice: "核对数字来自包装、详情页还是个人估算，必要时标出来源。",
  },
  {
    id: "official-tone",
    label: "官方腔偏重",
    severity: "low",
    pattern:
      /本品|该产品|赋能|协同增效|全链路|全面提升|科学配比|打造|助力|构筑|核心优势|精准养护|呵护健康/g,
    advice:
      "把成分和功能翻译成用户能看见的结果，例如好不好喂、适合什么场景、需要接受什么代价。",
  },
  {
    id: "copy-risk",
    label: "原文搬运痕迹",
    severity: "low",
    pattern: /中国人不骗中国人|绝了|真香|闭眼冲|姐妹们冲|谁懂啊|救命/g,
    advice: "这类高传播句式可以用作研究素材，正式成稿尽量换成自己的表达。",
  },
];

const DISCLAIMER_PATTERN =
  /医生|兽医|就医|医院|个体差异|仅供参考|不能代替|不替代|因猫而异/g;

const FILLER_PATTERN = /真的|非常|特别|超级|然后|后来|其实|说实话/g;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function splitParagraphs(text) {
  return normalizeText(text)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[。！？!?；;])\s*|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findMatches(text, pattern) {
  const matches = [];
  for (const match of text.matchAll(pattern)) {
    const phrase = match[0]?.trim();
    if (phrase && !matches.includes(phrase)) matches.push(phrase);
  }
  return matches;
}

function sentenceForMatch(text, phrase) {
  if (!phrase) return "";
  return (
    splitSentences(text).find((sentence) => sentence.includes(phrase)) || phrase
  );
}

function titleFromText(text) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const first = lines[0] || "";
  return first.replace(/^标题[:：]\s*/, "").slice(0, 80);
}

export function analyzeHooks(text) {
  const normalized = normalizeText(text);
  const title = titleFromText(normalized);
  const opening = splitSentences(normalized).slice(0, 3).join(" ");
  const combined = `${title} ${opening}`;
  const hooks = [];

  for (const rule of HOOK_RULES) {
    const fullMatches = findMatches(normalized, rule.pattern);
    if (!fullMatches.length) continue;
    const openingMatches = findMatches(combined, rule.pattern);
    hooks.push({
      id: rule.id,
      label: rule.label,
      count: fullMatches.length,
      inOpening: openingMatches.length > 0,
      examples: fullMatches.slice(0, 3),
      advice: rule.advice,
    });
  }

  const openingLabels = new Set(
    hooks.filter((hook) => hook.inOpening).map((hook) => hook.id),
  );
  let score = 30;
  score += Math.min(openingLabels.size * 12, 36);
  score += Math.min(hooks.length * 3, 24);
  if (/\d/.test(title)) score += 5;
  if (/劝|跟风|两瓶|别再|结果|原来|大实话/.test(title)) score += 5;
  score = Math.max(0, Math.min(100, score));

  const suggestions = [];
  if (!hooks.some((hook) => hook.inOpening)) {
    suggestions.push("标题和前两行还没有明显钩子，可以把痛点、反差或劝告提前。");
  }
  if (!hooks.some((hook) => ["scene", "symptom"].includes(hook.id))) {
    suggestions.push("补一个具体场景或症状细节，让读者知道“这事也发生在我家”。");
  }
  if (!hooks.some((hook) => ["contrast", "curiosity"].includes(hook.id))) {
    suggestions.push("可以增加一次认知反转，例如“后来才发现问题不在我以为的地方”。");
  }
  if (!hooks.some((hook) => hook.id === "numbers")) {
    suggestions.push("如果有真实规格或价格，可以加一个数字证据，不要为了效果编数据。");
  }

  return {
    title,
    opening,
    score,
    hookTypes: hooks.map((hook) => hook.label),
    hooks,
    suggestions,
  };
}

export function analyzeRisks(text) {
  const normalized = normalizeText(text);
  const issues = [];

  for (const rule of RISK_RULES) {
    const matches = findMatches(normalized, rule.pattern);
    if (!matches.length) continue;
    for (const phrase of matches.slice(0, 6)) {
      issues.push({
        id: rule.id,
        label: rule.label,
        severity: rule.severity,
        phrase,
        sentence: sentenceForMatch(normalized, phrase),
        advice: rule.advice,
      });
    }
  }

  const diseaseMention = /杯状|鼻支|疱疹|猫癣|口炎|生病|确诊/.test(
    normalized,
  );
  if (diseaseMention && !DISCLAIMER_PATTERN.test(normalized)) {
    issues.push({
      id: "missing-disclaimer",
      label: "缺少就医边界",
      severity: "medium",
      phrase: "提到疾病但没有免责声明",
      sentence: "",
      advice:
        "补一句“持续不适要先就医，营养补充不能代替诊疗”，并说明个体差异。",
    });
  }

  const high = issues.filter((issue) => issue.severity === "high").length;
  const medium = issues.filter((issue) => issue.severity === "medium").length;
  const low = issues.filter((issue) => issue.severity === "low").length;
  const score = Math.max(0, 100 - high * 22 - medium * 10 - low * 3);

  return {
    score,
    high,
    medium,
    low,
    issues,
    summary:
      high > 0
        ? "有高风险表达，建议先改再交。"
        : medium > 0
          ? "整体可用，但还有几处需要补边界。"
          : low > 0
            ? "没有明显高风险，再核对数字和原创度即可。"
            : "没有扫到明显风险，仍建议逐句核对事实。",
  };
}

export function inspectStructure(text) {
  const normalized = normalizeText(text);
  const paragraphs = splitParagraphs(normalized);
  const sentences = splitSentences(normalized);
  const longestSentence = sentences.reduce(
    (best, sentence) =>
      sentence.length > best.length ? sentence : best,
    "",
  );
  const fillerMatches = findMatches(normalized, FILLER_PATTERN);
  const totalLength = normalized.replace(/\s/g, "").length;
  const suggestions = [];

  if (totalLength > 700) {
    suggestions.push("全文偏长，可先删掉重复症状和重复心理活动，压到 500—650 字。");
  } else if (totalLength < 180) {
    suggestions.push("篇幅偏短，建议补一个具体场景和一次转折。");
  }
  if (paragraphs.length > 5) {
    suggestions.push("段落偏多，把同一阶段的描述合并成一段，手机上更好读。");
  }
  if (longestSentence.length > 75) {
    suggestions.push(`有一句长达 ${longestSentence.length} 字，建议拆成两句。`);
  }
  if (fillerMatches.length >= 4) {
    suggestions.push(
      `“真的、非常、后来”等填充词出现 ${fillerMatches.length} 次，可以删掉一半。`,
    );
  }
  if (!/[？?]/.test(normalized) && totalLength > 250) {
    suggestions.push("没有一个问句，标题或结尾可以加一个用户会想问的问题。");
  }

  return {
    totalLength,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    longestSentence,
    fillerCount: fillerMatches.length,
    suggestions,
  };
}

export function generateHooks(input = {}) {
  const audience = String(input.audience || "新手养猫人").trim();
  const pain = String(input.pain || "猫换季总打喷嚏").trim();
  const action = String(input.action || "跟风买乳铁蛋白").trim();
  const product = String(input.product || "这款乳铁蛋白").trim();
  const evidence = String(input.evidence || "成分和喂法更符合我的需求").trim();

  return [
    {
      type: "劝告型",
      title: `劝${audience}先别急着${action}`,
      opening: `先别急着${action}。我也是踩过坑以后，才发现${pain}这件事不能只看别人怎么说。`,
    },
    {
      type: "场景痛点型",
      title: `${pain}那阵子，我才知道自己买错了什么`,
      opening: `最崩溃的不是${pain}，是一边收拾现场，一边还要判断这东西到底有没有用。`,
    },
    {
      type: "反差型",
      title: `本来以为买贵一点就行，结果我忽略了这个`,
      opening: `一开始我只盯着价格和含量，后来才明白，${evidence}才是决定体验的关键。`,
    },
    {
      type: "自嘲型",
      title: `钱花了双份，猫受了两茬罪`,
      opening: `${action}之后，我第一次认真做功课。不是我想折腾，是猫的状态实在让人不敢乱试。`,
    },
    {
      type: "边界型",
      title: `${product}到底适合谁？我先说清楚这几点`,
      opening: `这篇不替所有猫下结论，只记录我为什么换成${product}，以及哪些情况我不会推荐。`,
    },
    {
      type: "问题型",
      title: `同样是乳铁蛋白，为什么我家猫吃了反应不一样？`,
      opening: `后来我才发现，选这类产品不能只问“含量高不高”，还要看${evidence}。`,
    },
  ];
}

export function makeRiskSafeSuggestions(text) {
  const replacements = [
    [/抑制.{0,5}病毒|抗病毒/g, "日常营养补充"],
    [/一定有效|保证有效/g, "我的个人体验是"],
    [/立刻见效|马上见效|立竿见影/g, "需要观察一段时间"],
    [/智商税|大冤种/g, "不适合我的情况"],
    [/所有猫/g, "很多猫"],
    [/首选/g, "可以重点看"],
  ];
  let output = normalizeText(text);
  for (const [pattern, value] of replacements) {
    output = output.replace(pattern, value);
  }
  return output;
}

export function textPreview(text, length = 120) {
  const clean = normalizeText(text).replace(/\n/g, " ");
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

export function todayISO() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

