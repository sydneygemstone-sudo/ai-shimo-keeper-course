# `lesson-1.html`「盘子的秘密」闭环严谨性专项 QA

审查范围仅限 `lesson-1.html` 的「盘子的秘密」「蓝盘子上的香蕉」两页、它们依赖的页内 JavaScript 状态，以及会影响这两页先后顺序的 `js/slides.js` 导航入口。课程方向不重审。本轮结论是：**教学命题成立，但当前实现还不是一个可信的“训练—测试—诊断—修复—重训—留出复测”闭环。** 主要原因不是少一句解释，而是顺序未真正受控、预测和测试证据被提前泄露、状态没有成为唯一事实源、复测也没有使用独立留出集。

## 第一节：对 8 条候选漏洞的逐条裁决

### 1. 训练→挑战顺序没有被界面锁定

**裁决：确认，P0；并且实际绕过面比候选描述更大。**

证据：

- `lesson-1.html:L128` 声称“十张全部喂完，挑战门才会打开”，但 `feed()` 在 `L236` 只递增 `fed` 和更新数字，没有解锁标志，也没有控制翻页。
- 挑战页 `st1` 从初始 DOM 起就是可点击状态（`L137—142`）。
- `js/slides.js:L20、L43—50、L56—60、L69—70` 的圆点、左右键、空格、PageDown、底部箭头、触摸滑动、`End`、URL hash 都可进入挑战页或更后页面；所有入口最终调用的 `go()` 没有前置条件。
- 刷新时页面 hash 会保留，但训练状态会回到 `fed=0`。因此在 `#13` 刷新会直接落在挑战页，形成“页面在挑战、内存却从未训练”的矛盾状态。

修复要求不是只把“下一页”按钮置灰，而是让**所有导航入口共用同一个守卫**：

- 进入挑战页：仅当 `state.trained === true`。
- 从挑战页进入「拆假规律」及任何后续页：仅当 `state.complete === true`。
- 后退到训练页始终允许。
- 圆点、键盘、滑动、hash、`window.deckGo()`、底部按钮都必须经过同一 `canNavigate()`；不能各自补丁。
- 被拦截时显示可操作原因，而不是无反应：`还差 3 张训练卡。喂满 10 张，再让毛球消化。`

### 2. 缺“训练/消化”节点

**裁决：修正确认，P0。缺的是可观察、可提交的“训练状态转移”，不建议再加一套同训练卡上的所谓练习题。**

当前十张卡的动作只完成了“把带标签的例子放进训练集”；第十张点击后没有“开始训练/消化”，也没有“训练完成”的状态。挑战页因而无法证明毛球已从例子生成过任何规律。修复阶段同样如此：`feedFix()` 在第一张反例后就显示“重新学习中”，但代码从未执行独立的重新训练状态；第二张后直接露出复测按钮。

建议的严格顺序是：

`喂满 10 张 → 点击“让毛球消化” → 明确显示“训练完成” → 才能挑战`

以及：

`喂满 2 张反例 → 比较两条规律的新成绩 → 点击“重新消化 12 张” → 明确显示“重训完成” → 才能复测`

不建议增加“拿原来的十张再练一遍”。在训练集上重复演示全对，只能说明记住/拟合训练卡，不能提供新证据，还会让儿童把训练成绩误当泛化能力。页面可用短动画表现“规律正在长出来”，但动画不能是唯一状态依据；最终必须落到可验证的 `trained` / `retrained` 布尔状态。

### 3. 揭晓台词提前给出“它看盘子”的结论

**裁决：确认，P0；还需把“事实输出”和“原因推断”严格拆开。**

`毛球：“蓝盘子……不是水果！”` 已经把盘色写进毛球的推理台词。孩子还没开线索放大镜，课件就替他们宣布了原因。正确证据顺序应是：

1. 只显示行为输出：`毛球答案：不是水果 ✗`。
2. 回收孩子此前的预测；此时只说“结果一致/不一致”，不解释原因。
3. 开放大镜，把十张训练卡按食物标签和盘色排开。
4. 让孩子回答：训练集上“看食物”“看盘子”分别能对几张。
5. 再结合蓝盘香蕉的错误，揭示这只**纸上模拟毛球**的隐藏规则是按盘色作答。

结论话术也要收紧。`两条规律在十张训练卡上都能 10/10；这只纸上毛球刚才的回答符合“按盘色”的隐藏规则。现实模型可能抓颜色，也可能抓别的共同线索，所以真实模型要靠更多换样测试来查。` 比“它就是看盘子”“它挑了最省事的一条”更严谨。若保留“省事”隐喻，应限定为本课件预设的纸上规则，而不是声称看见了真实模型内部。

### 4. “猜毛球”的预测没有被记录和回收

**裁决：确认，P0。当前预测既悬空，也可被多次改写。**

`guess(which, btn)` 完全丢弃 `which`，只给按钮加类名并解锁 `st3`。两个按钮都仍可点击，因此孩子可以先后留下两个 `.picked`；`ans()` 也有同样问题，第二次点击会改写 `r1`。这不是“记录预测”，只是用任意点击当作开锁钥匙。

至少应保存：

- `humanFirstAnswer`：孩子第一次真实判断，永久保留。
- `humanFinalAnswer`：如允许改判，另存最终判断，不能覆盖第一次。
- `modelPrediction`：`food` / `plate` / `uncertain`，提交后锁定。
- `predictionFeedbackShown`：确保揭晓后已按分支回收。

分支话术：

- 预测“看食物”：`你预测它会看食物。刚才结果和预测不一样；先别急着改解释，我们开镜找证据。`
- 预测“看盘子”：`你预测它会看盘子。结果和预测一致，但答错一题还不能把原因说死；把十张记忆排开核对。`
- 预测“不确定/可能两个都看”：`你说现在证据还不够，这是很科学的回答。新样本给了第一条线索，再看完整训练记录。`

建议增加第三个按钮“现在还不能确定”。训练集本来就同时支持两条规律，强迫孩子二选一反而惩罚最严谨的回答。

### 5. 复测复用了刚喂的反例

**裁决：确认核心判断，P0；但“只换成灰盘西瓜/灰盘牛奶”仍不够强。**

当前 `r4` 再次使用香蕉和蛋糕，而这两张刚刚进入修复训练集；最多证明课件会对这两张熟卡显示正确答案，不能支持“学会看食物”。而且 `retest()` 不是一个测试过程：它一次点击就把两个正确答案整体显示出来，没有让孩子先判真标签、没有逐项/批量提交、没有计分、没有失败分支。

留出复测必须满足：

- 物体类别未出现在原训练集或修复集。
- 测试卡永远不进入训练数组；界面明确标记“只考试，不喂进去”。
- 同一种新食物换盘后答案不变，用行为证据直接对抗盘色捷径。
- 先锁定测试集和真标签，再让毛球一次交卷，避免边测边学的误解。

建议的首选四卡留出集：

| 留出卡 | 真标签 | 旧盘色规律的答案 | 修复后纸上毛球答案 |
|---|---|---|---|
| 蓝盘西瓜 | 水果 | 不是（错） | 水果（对） |
| 红盘西瓜 | 水果 | 水果（对） | 水果（对） |
| 蓝盘牛奶 | 不是水果 | 不是（对） | 不是（对） |
| 红盘牛奶 | 不是水果 | 水果（错） | 不是（对） |

这四张同时满足“新物体”和“同一物体换盘”。如果课堂时间只能容纳两张，最低配置是“蓝盘西瓜＝水果、红盘牛奶＝不是水果”；灰盘新物体可作为额外迁移测试，但**只用灰盘**无法直接比较“同一物体换盘是否不变”，也没有正面对抗原来的红/蓝映射。

通过话术必须是有限结论：`这轮 4 张新样本全部通过；旧的红/蓝盘规律解释不了这些回答。我们有更强证据说它这轮没有继续沿用旧盘色捷径，但不能保证它以后永远不会错。`

### 6. 孩子回答“不是水果”的分支生硬

**裁决：确认，P1；但不能顺手把人和纸上毛球说成用了同一种内部机制。**

当前台词 `再想想——香蕉是水果哦！改判` 立即覆盖错误，既丢掉了儿童的第一反应，也浪费了“人也会被无关线索带偏”的现场证据。建议改为：

`已记录：你先选了“不是水果”。我们不擦掉第一次答案——蓝盘也可能把人带偏。现在查食物本身：香蕉是水果，所以真标签是“水果”。能发现并改回来，比假装第一次全对更有慧眼。`

如果全班分票：

`班里出现了两种答案，先把分歧原样留下。查事实：香蕉是水果。等会儿看看盘色是不是也影响了毛球。`

注意限定：孩子和纸上毛球都可能受盘色影响，但不能仅凭两个错误断言二者内部原因完全相同。页面要维持两条轨道：`孩子的第一判断/核实后的事实标签` 与 `毛球的预测/输出`。

### 7. 无“重置本关”按钮

**裁决：确认，P1；重置必须覆盖真实状态，不只是把几个 DOM 隐藏回去。**

建议两页固定放置教师控制按钮 `↺ 重置盘子关`，二次确认后执行 `resetPlateLoop()`：

- 清空 10 张训练卡的翻转和唯一计数。
- 清空第一次/最终人类答案、模型预测、诊断选择、修复方案、两张反例、留出集作答与得分。
- 恢复所有按钮的 `disabled`、`.picked`、反馈文本和渐进区块。
- 清除 `sessionStorage` 中本关状态。
- 把页面送回「盘子的秘密」，显示 `0/10`。
- 不重置孵化页、全屏状态或整章其他互动，严格限定“本关”。

另建议用带版本号的 `sessionStorage` 保存本关状态，使误刷新能恢复；若没有持久化，至少在加载 `#13` 时发现 `trained=false` 就退回训练页，绝不能保留 hash 却丢掉状态。

### 8. L1 纸上模拟与 L2 真模型的分工不清

**裁决：修正确认，P1；现有“下一章正式开喂养台”已有一点承接，但不足以标清证据身份。**

两章应明确分工：

- **L1：确定性纸上模拟。** 结果由课件按隐藏规则预设，用来练实验顺序：训练集与测试集分开、先预测、看错误、找混淆规律、加反例、重训、拿新样复测。它不声称浏览器现场真的训练了一个模型。
- **L2：真实模型操作。** 孩子实际采样、点击训练、观察真实输出；结果可能受光线、角度、背景和随机训练影响，教师必须照屏幕说，不预演必错或必修好。

建议在 L1 两页均加不泄露答案的角标：`纸上模拟｜毛球按一条隐藏规律作答`。闭环完成后的承接台词：

`今天我们用纸上毛球练会了抓捷径的六步：喂、训、测、查、修、再测。下一章才训练真正的图像模型；它会抓到哪条线索不预设，我们只按屏幕证据说话。`

这样 L1 是“学会怎么做实验”，L2 是“把实验方法用于真模型”，不是重复两次喂养。

## 第二节：候选清单漏掉的闭环问题

### A. 锁定区仍然可见，预测和修复答案在提交前已经泄露【P0】

这是当前最直接的实验污染。`.stepbox.locked` 只有 `opacity:.38` 和 `pointer-events:none`，并没有隐藏内容。因此挑战页一打开，孩子已经能看见：

- `毛球：“蓝盘子……不是水果！”`；
- 红盘/蓝盘十张证据；
- 两张修复反例；
- 灰盘复测的两个正确答案；
- 页面底部“例子太整齐会学捷径”的结论。

换言之，哪怕点击顺序受控，预测也已被视觉答案污染。训练页 `L131` 的教师提示还直接写着“水果全在红盘、不是水果全在蓝盘”，而本套 deck 自称是投影教具；若该提示投给孩子，“留心但先不点破”事实上已经点破。

修复原则：

- 未到达的步骤使用原生 `hidden` 或 `display:none`，不能用半透明表示秘密状态。
- 已完成步骤可折叠成只读“收据条”，保留孩子答案；当前步骤展开；未来步骤完全不进视觉树。
- 教师提示移入不投影的讲者备注/教师模式，或至少默认折叠且不含答案。
- 结论大字块只在 `state.complete=true` 后出现。

### B. 只管挑战入口，没有管挑战出口【P0】

即使补上“10/10 才进挑战”，用户仍可在完成任何步骤前翻到「拆假规律」，看到标准结论和“第二关通过”，甚至继续孵化。闭环需要双门禁：

`trained 才能进入挑战；complete 才能离开挑战进入结论及后续。`

第二关通过不能由“来到第 14 页”触发，而要由完整状态谓词计算。

### C. DOM 样式被当成状态，事件处理器没有阶段守卫【P0】

当前权威分散在 `fed`、`fixN`、`display:none`、`.locked`、`.picked` 和按钮 `disabled` 中。`ans()`、`guess()`、`lens()`、`retest()` 都不校验当前阶段；按钮样式和业务状态可能分离，多次点击还会同时选中互斥答案。

必须改为单一 `state` 对象＋`dispatch(event)`＋`render(state)`：

- 事件先检查“当前 phase 是否允许”。
- 状态更新成功后统一渲染 DOM。
- CSS 类只呈现状态，不能反过来充当状态。
- 唯一训练卡用 ID/`Set` 去重，互斥选择提交后禁用同组按钮。
- 非法事件不静默执行，开发环境记录告警，课堂界面显示简短阻塞原因。

### D. 放大镜直接宣讲答案，没有“儿童完成诊断”的动作【P1】

当前 `lens()` 一打开就显示“两条都能全对”和最终解释。孩子只负责点放大镜，证据推理仍由课件代做。建议把放大镜改为一个小诊断任务：

`十张训练卡上，看食物能对几张？看盘子能对几张？`

可用三个按钮：`只有看食物 10/10`、`只有看盘子 10/10`、`两条都 10/10`。选错时不惩罚，逐行高亮后再答；只有确认“两条都 10/10”才进入修复。这样“例子太窄”的结论是儿童用证据得出的，不是教师口号。

### E. 没有先提出修复假设，也没有展示反例为何有效【P1】

当前界面直接把正确修复方案摆出来。更完整的因果闭环应先让孩子选：

- `再加红盘水果和蓝盘非水果`；
- `加入蓝盘水果和红盘非水果`。

若选第一种：`卡片变多了，但两条规律仍都能全对；多，不等于多样。`

若选第二种，再喂蓝盘香蕉和红盘蛋糕。两张都喂完后先显示规律成绩变化：

- 看食物：`12/12`；
- 看盘子：`10/12`。

然后才允许点击“重新消化 12 张”。这一步把“为什么是反例”变成可见证据，避免孩子只记住“老师说换两张就好了”。

### F. 模拟结果的证据身份未标注，结论又超出证据【P0】

这两页没有真实训练算法；所有答案是课件脚本确定显示的。因此页面可以用于教学，但必须称为“纸上模拟”，不能让孩子误以为浏览器刚从十张 emoji 真训练出一个图像分类器。复测通过也只能说明预设模拟按设计完成了这一轮，不能证明真实 AI “已经学会看食物”。

最低口径：

`这是纸上模拟毛球。课件先藏了一条规则，让我们练习怎么用新样本把它抓出来。`

### G. 缺少可审计的完成条件与重载恢复策略【P1】

当前没有 `complete`，因此“第二关通过”不是状态结论。建议完成谓词至少为：

`10 张唯一训练卡已喂入 ∧ 初训完成 ∧ 人类第一答案已记录 ∧ 毛球预测已记录 ∧ 固定错误已揭晓 ∧ 两规律诊断完成 ∧ 两张反例已喂入 ∧ 重训完成 ∧ 四张留出卡真标签已确认且毛球已一次交卷 ∧ 结果解释已读出`。

状态可写入版本化 `sessionStorage`。恢复时要校验数组 ID、phase 与布尔不变量；校验失败就安全回到训练页，不从一个半完成 DOM 猜测进度。

### H. “测试卡进入训练集”的时点没有显式标记【P1】

蓝盘香蕉第一次出现时是挑战卡；诊断后，它可以被正式移入修复训练集，这是合理的“从失败样本学习”。但一旦移入，它就失去留出测试资格。界面应明确演出这个动作：

`刚才它是考卷，现在我们把这张错题收进训练册。它不能再拿来证明自己会做新题。`

这句话能自然解释为什么最终必须换西瓜和牛奶，而不是只说“不要背题”。

## 第三节：修复后的完整状态机设计

### 3.1 设计不变量

实现前先锁死以下规则；任何 UI 改版都不能破坏：

1. **训练集、修复集、留出测试集是三份不同数据。** `TRAIN_BASE`、`REPAIR_SET`、`HOLDOUT_SET` 分开定义，留出集不得被 `feed`。
2. **孩子的回答、事实标签、毛球的预测、毛球的实际输出是四个字段。** 不用一个文本框互相覆盖。
3. **第一次回答不可擦除。** 允许改判时另存 `final`，呈现“第一次→核实后”。
4. **先锁预测，后揭晓结果；先看结果，后解释原因。** 任何未来文本不得提前可见。
5. **反例喂完不等于已经重训；重训完成不等于已经泛化。** 两处都要有独立状态。
6. **复测必须是未训练的新物体，并一次性锁卷后交卷。** 测试过程中模拟毛球不更新。
7. **完成只由状态谓词产生。** 到达某页、按钮变绿、出现某段 DOM 都不是完成证据。
8. **所有翻页共用门禁。** 不能只防鼠标点击。

### 3.2 数据与状态结构

建议数据常量：

```js
const TRAIN_BASE = [
  // 现有 10 张：5 张红盘水果，5 张蓝盘非水果；每张有唯一 id
];

const REPAIR_SET = [
  { id: 'repair-blue-banana', item: '香蕉', plate: 'blue', truth: 'fruit' },
  { id: 'repair-red-cake', item: '蛋糕', plate: 'red', truth: 'not_fruit' }
];

const HOLDOUT_SET = [
  { id: 'test-blue-watermelon', item: '西瓜', plate: 'blue', truth: 'fruit' },
  { id: 'test-red-watermelon', item: '西瓜', plate: 'red', truth: 'fruit' },
  { id: 'test-blue-milk', item: '牛奶', plate: 'blue', truth: 'not_fruit' },
  { id: 'test-red-milk', item: '牛奶', plate: 'red', truth: 'not_fruit' }
];
```

建议单一状态：

```js
const initialPlateState = {
  version: 2,
  phase: 'FEEDING',
  fedTrainIds: [],
  trained: false,
  humanFirstAnswer: null,       // fruit | not_fruit | split | unsure
  humanFinalAnswer: null,
  modelPrediction: null,        // food | plate | unsure
  preRepairOutput: null,        // 固定为 not_fruit，但揭晓前保持 null
  diagnosisAnswer: null,
  diagnosisConfirmed: false,
  repairAttempts: [],           // same_pattern | cross_plate
  repairFedIds: [],
  retrained: false,
  postRepairPrediction: null,   // follows_food | follows_plate | unsure
  holdoutTruthAnswers: {},
  holdoutLocked: false,
  holdoutOutputs: {},
  explanationAcknowledged: false,
  complete: false
};
```

模拟规则必须在代码和教师说明中诚实存在：

```js
function paperMaoqiu(card, state) {
  if (!state.trained) throw new Error('model not trained');
  if (!state.retrained) return card.plate === 'red' ? 'fruit' : 'not_fruit';
  return card.truth; // 修复后的纸上模拟规则；不是现场训练结果
}
```

`complete` 每次渲染前由谓词重算，不允许任意 handler 直接写 `true`：

```js
function isLoopComplete(s) {
  return s.fedTrainIds.length === 10 &&
    s.trained && s.humanFirstAnswer !== null &&
    s.modelPrediction !== null && s.preRepairOutput !== null &&
    s.diagnosisConfirmed && s.repairFedIds.length === 2 &&
    s.retrained && s.holdoutLocked &&
    HOLDOUT_SET.every(x => s.holdoutTruthAnswers[x.id] && s.holdoutOutputs[x.id]) &&
    s.explanationAcknowledged;
}
```

### 3.3 状态、转移条件、界面与逐步话术

| 状态 | 进入时只显示什么 | 允许事件与转移条件 | 儿童主话术 / 页面反馈 |
|---|---|---|---|
| `S0 FEEDING` | 十张未翻训练卡、`0/10`、纸上模拟角标 | `FEED_TRAIN(id)`；仅未喂 ID 可计数。`10/10 → S1` | `先说食物本身，再翻标签。现在是在喂训练卡，不是在考试。` |
| `S1 READY_TO_TRAIN` | 十张已喂收据、按钮“让毛球消化 10 张” | 只有 `START_TRAIN`；点击后进入短动画 `S2` | `十张只是放进肚子，还没有长成规律。现在让它消化。` |
| `S2 TRAINING` | “毛球正在找共同点……”；禁入挑战 | 动画完成或“继续”显式事件 `TRAIN_DONE → S3`；需有 reduced-motion/fallback | `训练完成：10 张记忆已收好。它长出了一条隐藏规律，但我们还不知道是哪条。挑战门打开。` |
| `S3 HUMAN_TRUTH` | 蓝盘香蕉；只显示人类判断按钮 | `ANSWER_HUMAN(value)` 一次；保存 first/final 后 `→ S4` | `先不猜毛球。只看食物本身：香蕉是不是水果？照实答。` |
| `S4 MODEL_PREDICTION` | 人类答案收据；“看食物/看盘子/不能确定” | `PREDICT_MODEL(value)` 一次并锁定；显示“揭晓”按钮，`REVEAL_PRE_OUTPUT → S5` | `现在换问题：这只纸上毛球会怎样答？把预测锁住，结果出来后不改。` |
| `S5 PRE_OUTPUT_REVEALED` | `毛球答案：不是水果 ✗`，以及按预测分支的回收话术 | 仅 `OPEN_LENS → S6` | `先记行为，不急着讲原因。开线索放大镜，检查十张训练记录。` |
| `S6 DIAGNOSIS` | 十张卡按两种维度排布；三选一诊断题 | `ANSWER_DIAGNOSIS`；错误可再答，正确 `→ S7` | `在这十张里，看食物能对几张？看盘子又能对几张？` 正确后：`两条都是 10/10，所以只看训练成绩抓不出假规律。结合新香蕉，这只纸上毛球暴露了盘色捷径。` |
| `S7 REPAIR_HYPOTHESIS` | 两种修复方案，不提前显示正确反例 | `CHOOSE_REPAIR(same_pattern)` 留在本状态；`cross_plate → S8` | `如果再加同样整齐的卡，卡变多了，假规律还活着。要让水果也上蓝盘、非水果也上红盘。` |
| `S8 FEED_REPAIR` | 蓝盘香蕉、红盘蛋糕两张反例 | 每张唯一 `FEED_REPAIR(id)`；两张齐才 `→ S9` | 第一张：`这张挑战错题现在正式收进训练册。` 第二张：`两边都交叉了。旧盘色规律在 12 张里只能 10/12；看食物仍是 12/12。` |
| `S9 READY_TO_RETRAIN` | 规则成绩对比、按钮“重新消化 12 张” | `START_RETRAIN`，完成后 `→ S10` | `喂进去不等于学完。现在让纸上毛球重新找规律。` |
| `S10 RETRAINED_PREDICT` | “重训完成”；留出集仍盖住；复测预测三选一 | `PREDICT_POST(value) → S11` | `如果修复真的有效，同一种新食物换盘，答案应该变还是不变？先押一个预测。` |
| `S11 HOLDOUT_LABELING` | 四张新卡；角标“考试卡，不喂入” | 每张记录儿童真标签；四张都有事实核对后才允许 `LOCK_HOLDOUT → S12` | `西瓜和牛奶都没进过训练册。先把真标签写在考卷上；这四张锁卷后一起交给毛球。` |
| `S12 HOLDOUT_REVEAL` | 四张已锁考卷、按钮“毛球一次交卷” | `REVEAL_HOLDOUT` 一次，批量计算；`→ S13` | `测试期间不加新例子、不重训。现在一次揭晓。` |
| `S13 RESULT_EXPLANATION` | 毛球 4/4；旧盘色规律 2/4；同物换盘对照 | `ACK_EXPLANATION → S14` | `这轮新样 4/4；同一种食物换盘，答案没有变。旧红/蓝捷径解释不了整组结果。我们只说“通过这一轮”，不说“以后永远全对”。` |
| `S14 COMPLETE` | 结论口号、完成收据、“继续”按钮 | `complete` 谓词为真才可进入后页 | `例子太窄，会长出假规律；换样测试，才能抓到它。第二关通过。` |

`S2` 和重训动画可以很短，但不能靠一个容易丢失的 `setTimeout` 独自决定完成。可监听 `animationend`，同时提供无动画路径和一次性 fallback；最终仍由明确事件写入 `trained/retrained`。

### 3.4 儿童真实反应分支

以下分支应写进 `renderFeedback(state)` 或对应文案表，而不是靠教师临场猜：

| 儿童反应 | 系统应记录 | 立即回应 | 后续是否改变主流程 |
|---|---|---|---|
| 训练卡判断正确 | 不必把它当测试成绩；只记录卡已喂 | `标签确认，放进训练册。` | 否 |
| 训练卡喊错 | 保留课堂反应可选，不影响训练标签 | `先别急，翻开真标签；训练时喂给毛球的是核实后的标签。` | 否 |
| 还没答就误点翻卡 | 卡不应立即计入；提供“确认喂入”或教师撤销 | `这张先翻开了，还没喂。大家核实标签后再放进去。` | 否；避免误触污染计数 |
| 提前发现所有水果在红盘 | `earlyPlateNotice=true`（可选） | `你发现了训练卡里的共同点。先别宣布毛球一定会用它；等新样本来取证。` | 否 |
| 香蕉答“水果” | `humanFirstAnswer=fruit` | `已记录：你按食物本身答“水果”。事实标签：水果 ✓。` | 否 |
| 香蕉答“不是水果” | `humanFirstAnswer=not_fruit`，核实后 `humanFinalAnswer=fruit` | `第一次答案保留。蓝盘也可能把人带偏；查事实后改回来，就是慧眼。` | 否 |
| 全班分票 | `humanFirstAnswer=split` | `两种答案都留下；事实标签是水果。等会儿比较盘色怎样影响判断。` | 否 |
| 孩子说“不确定” | `humanFirstAnswer=unsure` | `说不确定比装作知道可靠。查事实：香蕉是水果。` | 否 |
| 预测“看食物” | `modelPrediction=food` | 揭晓后：`结果和预测不同，去找证据。` | 否 |
| 预测“看盘子” | `modelPrediction=plate` | 揭晓后：`结果和预测一致，但一题还不能把原因说死。` | 否 |
| 预测“两个都可能/不知道” | `modelPrediction=unsure` | `训练集确实分不出；用挑战结果和完整记录继续判断。` | 否 |
| 看到错误后说“我早知道” | 不改已锁预测 | `可以早发现，但科学记录不倒改；我们按刚才锁住的预测继续。` | 否 |
| 诊断时只选“看食物 10/10” | 保存一次错误尝试 | 逐行点亮红/蓝盘：`再算一次，看盘色在这十张会错哪张？` | 留在 `S6` |
| 诊断时只选“看盘子 10/10” | 保存一次错误尝试 | 点亮物体标签：`看食物本身，在这十张会错哪张？` | 留在 `S6` |
| 修复提议“再多喂几张同样的” | `repairAttempts += same_pattern` | `数量变多，但盘色和答案还绑在一起；假规律仍能全对。` | 留在 `S7` |
| 修复提议“把盘子换乱/交叉” | `repairAttempts += cross_plate` | `这能让两条规律不再同时全对。开始喂反例。` | 进入 `S8` |
| 修复提议“用灰盘” | 可视为 `cross_plate` 的好方向 | `灰盘能当额外考试，但训练里还要直接加入蓝盘水果、红盘非水果，把旧规律撞破。` | 引导到 `S8` |
| 孩子质疑“它只是背了香蕉和蛋糕” | 不改状态 | `所以香蕉和蛋糕不参加最后复测；最后只用没喂过的西瓜和牛奶。` | 否 |
| 留出集真标签答错 | 保存 first，再保存核实后的 final | `测试毛球前先把答案尺校准；我们核实食物本身，不让盘色替我们答。` | 真标签全部确认后继续 |
| 孩子问“这就证明它只看食物了吗” | `skepticQuestion=true`（可选） | `只能证明旧盘色捷径解释不了这轮结果；更多新样仍可能发现别的问题。` | 否；应表扬 |
| 想提前翻页 | 不改变 phase | `挑战门还没完成：当前在“重训/复测”等具体步骤。` | 阻止导航 |
| 连点/点两个互斥答案 | 只接受当前 phase 的第一次合法提交 | `预测已经锁住；需要重来请用“重置盘子关”。` | 否 |

### 3.5 页面结构建议

「盘子的秘密」页：

```html
<section data-t="盘子的秘密" data-loop="plate-training">
  <span class="evtag">纸上模拟｜按一条隐藏规律作答</span>
  <div id="trainCards"></div>
  <p id="feedProgress" aria-live="polite">0 / 10</p>
  <button id="trainBtn" hidden>让毛球消化 10 张</button>
  <div id="trainReceipt" hidden></div>
  <button class="resetPlateLoop">↺ 重置盘子关</button>
  <!-- 教师答案提示不得默认投影 -->
</section>
```

「蓝盘子上的香蕉」页只挂载当前步骤与已完成收据：

```html
<section data-t="香蕉挑战" data-loop="plate-challenge">
  <div id="completedReceipts"></div>
  <div id="currentStep" aria-live="polite"></div>
  <div id="loopConclusion" hidden></div>
  <button class="resetPlateLoop">↺ 重置盘子关</button>
</section>
```

不要把未来的 `st3/st4` 带答案 DOM 先放在页面里再降透明度。若保留静态节点，至少全部用 `hidden`，由 `render()` 依据 phase 逐个解除。

### 3.6 事件处理与渲染骨架

```js
let plateState = loadValidatedState() ?? structuredClone(initialPlateState);

function dispatch(event) {
  const next = reducePlateState(plateState, event); // 内部校验 phase 与唯一 ID
  if (!next) return showBlockedReason(event);
  plateState = next;
  plateState.complete = isLoopComplete(plateState);
  sessionStorage.setItem('lesson1.plateLoop.v2', JSON.stringify(plateState));
  renderPlateLoop(plateState);
}

function renderPlateLoop(s) {
  // 1. 先隐藏全部未来步骤；2. 渲染已完成收据；3. 只展开当前 phase；
  // 4. 从 state 设置 picked/disabled/text；5. 更新导航可达性。
}
```

每个 handler 只发事件，不直接改 DOM：

```js
onTrainCardClick(id)       => dispatch({ type: 'FEED_TRAIN', id });
onHumanAnswer(value)       => dispatch({ type: 'ANSWER_HUMAN', value });
onModelPrediction(value)   => dispatch({ type: 'PREDICT_MODEL', value });
onRevealPreOutput()        => dispatch({ type: 'REVEAL_PRE_OUTPUT' });
onDiagnosis(value)         => dispatch({ type: 'ANSWER_DIAGNOSIS', value });
onRepairChoice(value)      => dispatch({ type: 'CHOOSE_REPAIR', value });
onRepairFeed(id)           => dispatch({ type: 'FEED_REPAIR', id });
onRetrain()                => dispatch({ type: 'START_RETRAIN' });
onHoldoutTruth(id, value)  => dispatch({ type: 'ANSWER_HOLDOUT_TRUTH', id, value });
onHoldoutReveal()          => dispatch({ type: 'REVEAL_HOLDOUT' });
```

### 3.7 全局导航门禁

`js/slides.js` 的 `go()` 需要一个通用钩子，使 lesson 页面可以声明自己的教学门禁，而不把 lesson-1 逻辑硬编码进共享引擎：

```js
function go(i, source = 'api') {
  const target = Math.max(0, Math.min(slides.length - 1, i));
  const verdict = window.deckCanGo?.({ from: cur, to: target, source });
  if (verdict && verdict.ok === false) {
    window.deckOnBlocked?.(verdict);
    return false;
  }
  // 原 go() 的切页逻辑
  return true;
}
```

lesson-1 注册：

```js
window.deckCanGo = ({ to }) => {
  const trainIndex = 11;      // 第 12 页，实际实现时按 data-t 查找更稳
  const challengeIndex = 12;  // 第 13 页

  if (to === challengeIndex && !plateState.trained) {
    return { ok: false, code: 'NEED_TRAIN', message: remainingTrainMessage() };
  }
  if (to > challengeIndex && !plateState.complete) {
    return { ok: false, code: 'NEED_LOOP_COMPLETE', message: currentStepMessage() };
  }
  return { ok: true };
};
```

实际实现时优先用 `data-t` / `data-loop` 查索引，避免前面插页后 `11/12` 失效。圆点的可视状态也应同步：不可达圆点加锁图标和 `aria-disabled=true`，但真正的安全性仍由 `go()` 守卫提供。

初始 hash 也必须经过守卫。若从 `#13` 或更后页打开而 `sessionStorage` 没有合法完成态，自动落回训练页并提示原因；不能先显示被禁止页面再闪回。

### 3.8 重置与验收用例

`resetPlateLoop()`：

```js
function resetPlateLoop() {
  if (!confirm('只重置“盘子的秘密”这一关？')) return;
  sessionStorage.removeItem('lesson1.plateLoop.v2');
  plateState = structuredClone(initialPlateState);
  renderPlateLoop(plateState);
  window.deckGo(findSlideIndex('盘子的秘密'));
}
```

上线前至少手测/自动测以下路径：

1. `0/10` 时用箭头、空格、圆点、滑动、`End`、`#13`、`deckGo()`，均不能进入挑战或后页。
2. 同一训练卡连点十次仍是 `1/10`；十张唯一卡后才出现训练按钮。
3. `10/10` 但未点击消化，仍不能进挑战；初训完成后可以。
4. 挑战页初始看不到毛球答案、放大镜答案、反例、复测答案和总结。
5. 人类答案和毛球预测各只能提交一次；允许改判时 first/final 同时保留。
6. 猜“看食物”“看盘子”“不能确定”三条分支均有对应回收，且都能继续。
7. 只喂一张反例不能重训；两张齐但未重训不能复测。
8. 最终四张留出卡不在任何训练数组；揭晓前四张都已锁卷；揭晓后一次得到 4/4。
9. 复测结束前不能翻到「拆假规律」；完成谓词为真后才能进入，并显示“第二关通过”。
10. 任意中间状态刷新能恢复；篡改/过期存储则安全退回训练页。
11. “重置盘子关”只清本关，并把 UI、状态、存储、导航同时恢复，不影响孵化互动。
12. 页面在 iPad 小屏下只显示当前步骤，结论不因滚动位置或半透明区块提前泄露。

达到这 12 条后，这两页才形成严谨闭环：**训练数据先封口，儿童预测先锁定，错误结果再出现，证据支持诊断，反例改变可区分性，重训独立发生，最后由未见新样本检验，并且结论只说到证据允许的范围。**
