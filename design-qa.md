# Selected trainer design QA

final result: passed

## Evidence and normalization

- Selected visual truth: `design/reference.png`, copied and normalized from the approved ImageGen result `exec-1e9d1ad7-71ca-44a3-9810-b835eda9b985.png` (1487 × 1058).
- Browser implementation: `http://127.0.0.1:5173/`; raw capture `design/implementation-desktop.png`; normalized screenshot `design/preview.png`.
- CSS viewport: 1440 × 1023, compared at 1440 × 1024. The existing browser zoom is 67%, devicePixelRatio 0.67. Viewport capability set to 965 × 686 gives the measured CSS viewport. The screenshot backend returns 2149 × 1527 with an unused right/bottom area; normalization crops the measured top-left CSS viewport, then adjusts its height by one pixel. It does not scale the app to fit the oversized capture canvas.
- Full-view paired comparison: `design/comparison.png`. Detail comparison of card typography, suit icons, question and answer controls: `design/comparison-focus.png`.
- State: light theme, preflop opening range, BTN, unanswered. Actual cards and counts are generated training content; they intentionally differ from the mock's AJs and sample 8/2 score. Questions retain their course wording.
- Additional browser-rendered states: `design/settings-normalized.png`, `design/postflop-normalized.png`, `design/mobile.png`.
- Temporary viewport overrides were reset before handoff.

## Required fidelity surfaces

- Typography: neutral system sans serif, no poster headings; medium-weight 24px question, 18px desktop answers, quieter 13–16px context and navigation. Numbers and court-card ranks are plain editable text. Chinese copy stays readable. Local Windows font metrics differ slightly from the generated mock.
- Layout: centered practice area, compact header navigation and unit toolbar, no dashboard/sidebar/outer exercise panel. Two 160 × 230 rounded tiles, 28px spacing, pale 86px answer controls. Postflop retains the centered structure and wraps required filters naturally.
- Colors: neutral #f5f5f7 base, white cards, pale gray controls, charcoal foreground. Green/red feedback appears after grading only. No green interface framing.
- Assets: suit and gear/close icons come from the Phosphor library. Cards contain dynamic ranks and standard suit icons, with no ornamental artwork or mirrored corners. All course source charts remain available through the existing source action.
- Copy: product, stage navigation, module selectors, question, three exact frequency choices, keyboard help and minimal footer follow the selected design. No account, saved progress, analytics or other new product features.

## Comparison history and fixes

1. First normalized paired view found [P2] small context/answer typography and insufficient spacing between cards relative to the selected mock. Increased desktop context/answer sizes, card gap, and navigation padding; calibrated vertical spacing. Re-captured and reviewed full/detail paired evidence. No remaining P0/P1/P2 difference in the main preflop state.
2. Narrow-window five-card review found [P2] public cards consumed the page's side padding. Constrained mobile board card sizes and gap. Re-tested at approximately 391 × 843 CSS pixels: board left 16px/right 353px within a 368px document content width, document scrollWidth equals clientWidth. No horizontal overflow.
3. Additional postflop view required more space for its real action history and filters. Reduced non-preflop exercise top spacing. Longer hands, explanations and source charts intentionally use vertical scrolling rather than shrinking all content.
4. Hidden visual selector labels initially lost their accessible name. Added explicit aria-label to all reusable selectors and confirmed browser snapshots expose position/scenario/category/unit names.

## Functional verification

- Browser-tested position selection, answer grading, immediate explanation and current-round count, Enter next question, opening/closing settings, stage/unit navigation, postflop cards and six-class reading/showdown.
- Browser error log: empty after tested interactions.
- Existing automated suite: 11/11 passed; production build passed.
- No changes to question generation, frequencies, course strategy rules, or persistence behavior.

## Follow-up polish

- [P3] Native select arrows and Windows system font rendering differ slightly from the static mock; keeping native selectors preserves accessibility and existing behavior.
- Dynamic question content, suit color and answer counts legitimately vary from the conceptual screenshot.

## Implementation checklist

- [x] Apply approved neutral rounded visual system.
- [x] Preserve all existing practice interactions and strategy data.
- [x] Capture and compare full and focused desktop views.
- [x] Verify settings, postflop and narrow five-card states.
- [x] Run existing tests, build, and browser error inspection.
- [x] Restore viewport and keep the local app open.
# 翻后引导学习验证（旧版原型记录，2026-10-09）

- 翻后默认入口进入六个基础专题；原有源表专项保留为「课程专项」。
- 每个专题贯通示范、单条件变化、原因选择、动作执行、撤去提示的独立练习。
- 在浏览器逐项检查六专题的决策与错误解析，验证正确自动前进、不知道计错、切换阶段后计数保留、学习与独立练习计数隔离。
- 1440×1023桌面示范：开始练习按钮和页脚同时可见；391×843窄屏无水平溢出。
- 无浏览器错误。20项测试通过，包含720组教学场景牌张合法性、直接花听9张补牌、85在对应转牌形成顺子、河牌示例牌的实际强弱与源节点答案。
- 最终截图：`design/postflop-learning-preview.png`。教学假设始终标注，未把示例牌回应当作完整范围或求解结果。

# 翻后教学重构（当前版本，2026-10-09）

- 已替换旧版六专题原型。当前为九章、112个学习步骤，完整的范围/收益/条件概率实验与75个课程案例身份。
- 学习答后停留，独立练习收起提示、答对自动前进；不知道计错。正确答案、各组变化与原因链并排展示。
- 保持既有圆润极简样式。大屏揭示答案后分为牌面与收益、对手范围、解析三列，窄屏按阅读顺序排列，未增加仪表盘或长期统计。
- 25项自动检查通过，最终生产构建通过；浏览器检查桌面、窄窗口、正确跳题、并列范围、转牌对照、课程手牌分工、章节完成与专项入口。
- 详细边界与验收记录见 `design/翻后教学_实现与验收.md`。当前截图为 `design/postflop-curriculum-preview.png`。
