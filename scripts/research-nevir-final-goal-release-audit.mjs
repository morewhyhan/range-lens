import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const route = read('learner-goal-route-canonical.json');
const routeConsistency = read('route-consistency-audit.json');
const screen = read('first-pass-screen-coverage-matrix.json');
const screenAudit = read('first-pass-screen-coverage-reconcile-audit.json');
const proseRouteAudit = read('canonical-prose-route-audit.json');
const golden = read('first-pass-golden-path.json');
const runtime = read('runtime-route-attachment-audit.json');
const stateMachine = read('first-lesson-visible-state-machine.json');
const stateCrosswalkAudit = read('first-pass-state-crosswalk-audit.json');
const goal = read('goal-level-acceptance-matrix.json');
const compiler = read('strategy-to-course-compiler-contract.json');
const firstCourse = read('first-course-closure-audit.json');
const crossAge = read('cross-age-low-baseline-acceptance.json');
const stopObservation = read('low-baseline-stop-observation-crosswalk.json');
const cognitiveBridge = read('route-cognitive-slow-execution-bridge.json');
const unitCanonicalBridge = read('unit-canonical-route-bridge.json');
const fullCoveragePlan = read('full-course-coverage-and-release-contract.json');
const sessionQueue = read('session-question-queue-contract.json');
const answerProvenance = read('answer-provenance-and-grading-identity-contract.json');
const firstPassUserScript = read('first-pass-user-facing-script-contract.json');
const firstPassHandoffLedger = read('first-pass-handoff-ledger.json');
const learnerArchitectureAudit = read('first-pass-learner-architecture-audit.json');
const learnerSessionProgression = read('learner-session-progression-contract.json');
const firstPassExplanationDeck = read('first-pass-explanation-deck.json');
const questionGenerationCrossAudit = read('question-generation-cross-contract-audit.json');
const unitThreeCardSkeleton = read('unit-three-card-skeleton.json');
const unitThreeCardFrontier = read('unit-three-card-compilation-frontier.json');
const unitIdentityPromotionFrontier = read('unit-identity-promotion-frontier.json');
const canonicalIdentifiersRegistry = read('canonical-identifiers-registry.json');
const targetBenchmark = read('target-readiness-and-nl50-benchmark-contract.json');
const transfer = read('slow-transfer-ladder.json');
const unified = read('unified-learner-evidence-release-gates.json');
const units = read('unit-course-manifest.json');
const qqqBridge = read('qqq-v2-course-bridge-audit.json');
const repo = read('external-repo-current-capability-report.json');
const visualCompiler = read('solver-course-visual-compiler-contract.json');
const visualAudit = read('solver-course-visual-audit.json');
const c0c9Crosswalk = read('c0-c9-visible-route-crosswalk.json');
const c0c9Audit = read('c0-c9-visible-route-audit.json');
const unitC0C9Crosswalk = read('unit-c0-c9-release-crosswalk.json');
const unitC0C9Audit = read('unit-c0-c9-release-audit.json');
const unitFieldQueue = read('unit-field-completion-queue.json');
const unitReadinessLedger = read('unit-release-readiness-ledger.json');
const unitReadinessAudit = read('unit-release-readiness-audit.json');
const goalRouteCrosswalk = read('goal-route-requirement-crosswalk.json');
const referenceIntake = read('reference-snapshot-intake-and-match-contract.json');
const sessionEvidence = read('session-evidence-and-target-report-contract.json');
const unitReferenceRequests = read('unit-reference-snapshot-request-manifest.json');
const simplificationCalibration = read('course-simplification-and-edge-calibration-contract.json');
const goalTrialProtocol = read('goal-trial-and-target-benchmark-protocol.json');
const firstMatchedDecision = read('first-matched-package-resource-and-release-decision.json');
const a72QuestionFixtures = read('a72-fact-and-stop-question-fixtures.json');
const targetStandard = read('target-standard-sequential-teaching-and-nl50-closure-contract.json');
const principleCoverage = read('first-pass-principle-coverage.json');
const firstHandPrincipleAudit = read('first-hand-principle-frame-audit.json');
const firstHandGapCards = read('first-hand-gap-frame-cards.json');
const crosswalkAudit = read('goal-standard-crosswalk-audit.json');
const userStandardRequirementAudit = read('user-standard-requirement-audit.json');
const stageAliasBridge = read('release-stage-alias-bridge.json');
const userStageRuntimeContract = read('user-stage-runtime-adoption-contract.json');
const userFirstCompleteRoute = read('user-first-complete-route-contract.json');
const authorCourseFrontier = read('author-course-compilation-frontier.json');
const targetConfigSourceLedger = read('target-config-source-ledger.json');
const targetConfigResolutionPlan = read('target-config-resolution-plan.json');
const referenceCourseClosureLedger = read('reference-course-closure-ledger.json');
const referenceCourseClosureAudit = read('reference-course-closure-audit.json');
const lowBaselineVisualLanguageAudit = read('low-baseline-visual-language-audit.json');
const goalEvidenceStageAudit = read('goal-evidence-stage-audit.json');
const principleTransferAudit = read('principle-transfer-readiness-audit.json');
assert.equal(firstPassHandoffLedger.id, 'FIRST_PASS_HANDOFF_LEDGER_V1');
assert.equal(firstPassHandoffLedger.rows.length, 13);
assert.deepEqual(firstPassHandoffLedger.route, firstPassUserScript.canonicalRoute);
assert.equal(firstPassHandoffLedger.currentEvidence.runtimeAttached, false);
assert.equal(unitReadinessLedger.id, 'UNIT_RELEASE_READINESS_LEDGER_V1');
assert.equal(unitReadinessLedger.rows.length, 35);
assert.equal(unitReadinessLedger.counts.failures, 0);
assert.equal(unitReadinessAudit.id, 'UNIT_RELEASE_READINESS_AUDIT_V1');
assert.equal(unitReadinessAudit.checks.failures, 0);
assert.equal(referenceCourseClosureLedger.id, 'REFERENCE_COURSE_CLOSURE_LEDGER_V1');
assert.equal(referenceCourseClosureLedger.counts.phases, 9);
assert.equal(referenceCourseClosureLedger.currentEvidence.coursePolicyCompiled, false);
assert.equal(referenceCourseClosureAudit.id, 'REFERENCE_COURSE_CLOSURE_AUDIT_V1');
assert.equal(referenceCourseClosureAudit.checks.failures, 0);
assert.equal(lowBaselineVisualLanguageAudit.id, 'LOW_BASELINE_VISUAL_LANGUAGE_AUDIT_V1');
assert.equal(lowBaselineVisualLanguageAudit.counts.failures, 0);
assert.equal(lowBaselineVisualLanguageAudit.currentEvidence.lowBaselineTrialObserved, false);
assert.equal(goalEvidenceStageAudit.id, 'GOAL_EVIDENCE_STAGE_AUDIT_V1');
assert.equal(goalEvidenceStageAudit.counts.failures, 0);
assert.equal(goalEvidenceStageAudit.currentEvidence.NL50Evidence, false);
assert.equal(principleTransferAudit.id, 'PRINCIPLE_TRANSFER_READINESS_AUDIT_V1');
assert.equal(principleTransferAudit.counts.failures, 0);
assert.equal(principleTransferAudit.counts.unitsWithExactContrastField, 0);
assert.equal(principleTransferAudit.counts.unitsWithObservedTransfer, 0);
assert.equal(learnerArchitectureAudit.id, 'FIRST_PASS_LEARNER_ARCHITECTURE_AUDIT_V1');
assert.equal(learnerArchitectureAudit.failures.length, 0);
assert.equal(learnerArchitectureAudit.currentEvidence.runtimeObserved, false);
assert.equal(learnerSessionProgression.id, 'LEARNER_SESSION_PROGRESSION_CONTRACT_V1');
assert.equal(learnerSessionProgression.stages.length, 8);
assert.equal(learnerSessionProgression.currentEvidence.runtimeScheduler, false);
assert.equal(firstPassExplanationDeck.id, 'FIRST_PASS_EXPLANATION_DECK_V1');
assert.equal(firstPassExplanationDeck.rows.length, 13);
assert.equal(firstPassExplanationDeck.currentEvidence.runtimeAttached, false);
assert.equal(questionGenerationCrossAudit.id, 'QUESTION_GENERATION_CROSS_CONTRACT_AUDIT_V1');
assert.equal(questionGenerationCrossAudit.findings.length, 14);
assert.equal(questionGenerationCrossAudit.currentEvidence.runtimeQuestionGenerator, false);
assert.equal(unitThreeCardSkeleton.id, 'UNIT_THREE_CARD_SKELETON_V1');
assert.equal(unitThreeCardSkeleton.unitCount, 35);
assert.equal(unitThreeCardSkeleton.cardCount, 105);
assert.equal(unitThreeCardSkeleton.currentEvidence.all105AnswersCompiled, false);
assert.equal(unitThreeCardFrontier.id, 'UNIT_THREE_CARD_COMPILATION_FRONTIER_V1');
assert.equal(unitThreeCardFrontier.rows.length, 105);
assert.equal(unitThreeCardFrontier.summary.answerCompiled, 0);
assert.equal(unitIdentityPromotionFrontier.id, 'UNIT_IDENTITY_PROMOTION_FRONTIER_V1');
assert.equal(unitIdentityPromotionFrontier.summary.totalUnits, 35);
assert.equal(unitIdentityPromotionFrontier.summary.candidatePartial, 16);
assert.equal(unitIdentityPromotionFrontier.currentEvidence.canonicalStrategyReady, 0);
assert.equal(canonicalIdentifiersRegistry.id, 'CANONICAL_IDENTIFIERS_REGISTRY_V1');
assert.equal(canonicalIdentifiersRegistry.unitCount, 35);
assert.equal(canonicalIdentifiersRegistry.currentEvidence.runtimeUsesRegistry, false);
assert.equal(firstHandPrincipleAudit.id, 'FIRST_HAND_PRINCIPLE_FRAME_AUDIT_V1');
assert.equal(firstHandPrincipleAudit.status, 'paper_crosswalk_all_principles_have_frame_or_stop_not_strategy_ready');
assert.deepEqual(firstHandPrincipleAudit.counts, { totalPrinciples: 12, covered: 6, partial: 6, missing: 0 });
assert.equal(firstHandPrincipleAudit.releaseRules.nestedCardsAreInsideParent, true);
assert.equal(firstHandGapCards.id, 'FIRST_HAND_GAP_FRAME_CARDS_V1');
assert.equal(firstHandGapCards.currentEvidence.p10HasExplicitStopCard, true);
assert.equal(principleCoverage.currentEvidence.allPrinciplesHaveFrameOrStop, true);

const canonicalRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const innerRoute = ['p1','p2','p3','p4','p5','p6','p7'];
const objectiveRequirements = [
  {
    id: 'O1_nested_sequential_route',
    statement: '学习者面对一条顺序推进、父子嵌套、关闭子层后回到原父帧的路线，不看到平铺能力菜单。',
    paperEvidence: ['learner-goal-route-canonical.json','canonical-identifiers-registry.json','first-pass-screen-coverage-matrix.json','first-pass-user-facing-script-contract.json','first-pass-handoff-ledger.json','first-pass-learner-architecture-audit.json','learner-session-progression-contract.json','first-pass-explanation-deck.json','question-generation-cross-contract-audit.json','canonical-prose-route-audit.json','goal-route-requirement-crosswalk.json','target-standard-sequential-teaching-and-nl50-closure-contract.json','215_目标标准的顺序教学与NL50结果闭环合同.md','goal-standard-crosswalk-audit.json','216_目标标准与既有合同交叉审计.md','user-standard-requirement-audit.json','217_用户最终标准逐条验收审计.md','release-stage-alias-bridge.json','218_训练阶段别名与唯一用户进阶桥.md','user-stage-runtime-adoption-contract.json','219_U0_U7用户进阶运行时采用合同.md'],
    runtimeEvidence: ['runtime-route-attachment-audit.json','runtime_trace_with_parent_restore'],
    learnerEvidence: [],
    status: 'paper_contract_only',
    completionRequires: ['runtime_reads_canonical_next_chain','parent_restore_observed']
  },
  {
    id: 'O2_low_baseline_comprehension',
    statement: '低扑克基础、阅读慢或操作慢的学习者能看懂当前问题、当前层、下一步和错误回退。',
    paperEvidence: ['cross-age-low-baseline-acceptance.json','188_跨年龄低基础可理解性与操作验收合同.md','low-baseline-stop-observation-crosswalk.json','200_低基础逐停点观察与四通道证据交叉合同.md','low-baseline-visual-language-audit.json','first-pass-user-facing-script-contract.json','first-pass-handoff-ledger.json','first-pass-learner-architecture-audit.json','learner-session-progression-contract.json','first-pass-explanation-deck.json','question-generation-cross-contract-audit.json','206_首遍13帧用户执行脚本与双层回放合同.md','session-evidence-and-target-report-contract.json','209_单次会话证据与目标级报告合同.md','goal-trial-and-target-benchmark-protocol.json','212_一遍学习、迁移、连续路线与目标级复核实验协议.md','target-standard-sequential-teaching-and-nl50-closure-contract.json','215_目标标准的顺序教学与NL50结果闭环合同.md','goal-standard-crosswalk-audit.json','216_目标标准与既有合同交叉审计.md','user-standard-requirement-audit.json','217_用户最终标准逐条验收审计.md','release-stage-alias-bridge.json','218_训练阶段别名与唯一用户进阶桥.md','user-stage-runtime-adoption-contract.json','219_U0_U7用户进阶运行时采用合同.md'],
    runtimeEvidence: ['first_pass_observation_records'],
    learnerEvidence: ['real_low_baseline_trial'],
    status: 'paper_contract_only',
    completionRequires: ['per_stop_and_per_channel_observation','no_leading_answer']
  },
  {
    id: 'O3_no_step_omitted',
    statement: '从桌面、翻前、起始范围到翻后七步、结算和迁移，每个必要步骤都有可见交接或明确停止卡。',
    paperEvidence: ['first-pass-screen-coverage-matrix.json','first-pass-state-evidence-crosswalk.json','first-pass-state-crosswalk-audit.json','first-pass-architecture-goal-contract.json','route-cognitive-slow-execution-bridge.json','201_路线脑内架构与慢执行交叉合同.md','unit-canonical-route-bridge.json','202_35项单元到唯一用户停点的交叉合同.md','full-course-coverage-and-release-contract.json','203_35项全量练习覆盖与嵌套释放计量合同.md','unit-three-card-skeleton.json','unit-three-card-compilation-frontier.json','principle-transfer-readiness-audit.json','unit-identity-promotion-frontier.json','unit-c0-c9-release-crosswalk.json','unit-field-completion-queue.json','unit-reference-snapshot-request-manifest.json','210_35项单元参考快照请求与发布队列.md','course-simplification-and-edge-calibration-contract.json','211_课程简化、边缘牌与阈值校准合同.md','first-matched-package-resource-and-release-decision.json','213_首个匹配首手课包的资源选择与停止决策.md','a72-fact-and-stop-question-fixtures.json','214_A72事实题与停止题的自动出题样板.md','goal-route-requirement-crosswalk.json','first-pass-handoff-ledger.json','first-pass-explanation-deck.json','first-pass-learner-architecture-audit.json','question-generation-cross-contract-audit.json','first-hand-principle-frame-audit.json','first-hand-gap-frame-cards.json','144_首遍原理覆盖与结构记忆合同.md'],
    runtimeEvidence: ['complete_first_pass_runtime_trace'],
    learnerEvidence: ['first_pass_order_recall','handoff_recall'],
    status: 'paper_frames_only',
    completionRequires: ['all_canonical_states_visited','every_handoff_consumed']
  },
  {
    id: 'O4_first_pass_builds_mental_model',
    statement: '跟完一次后，学习者能复述路线、定位未见层、说出交接、错误回退和缺资料时的停止位置。',
    paperEvidence: ['cross-age-low-baseline-acceptance.json','structure-formation-acceptance-contract.json','architecture-replay-contract.json','route-cognitive-slow-execution-bridge.json','201_路线脑内架构与慢执行交叉合同.md','low-baseline-visual-language-audit.json','first-pass-user-facing-script-contract.json','first-pass-handoff-ledger.json','first-pass-learner-architecture-audit.json','learner-session-progression-contract.json','first-pass-explanation-deck.json','206_首遍13帧用户执行脚本与双层回放合同.md','goal-trial-and-target-benchmark-protocol.json','212_一遍学习、迁移、连续路线与目标级复核实验协议.md','target-standard-sequential-teaching-and-nl50-closure-contract.json','215_目标标准的顺序教学与NL50结果闭环合同.md','goal-standard-crosswalk-audit.json','216_目标标准与既有合同交叉审计.md','user-standard-requirement-audit.json','217_用户最终标准逐条验收审计.md','release-stage-alias-bridge.json','218_训练阶段别名与唯一用户进阶桥.md','user-stage-runtime-adoption-contract.json','219_U0_U7用户进阶运行时采用合同.md'],
    runtimeEvidence: ['first_pass_replay_trace'],
    learnerEvidence: ['one_pass_architecture_evidence'],
    status: 'paper_contract_only',
    completionRequires: ['first_answer_before_help','three_unseen_layer_locations','two_error_recoveries','one_field_transfer']
  },
  {
    id: 'O5_slow_executable_decision',
    statement: '在资料充分的陌生节点，学习者能慢速完成定位、读牌、范围、比较、执行和更新，而不是只记住示例。',
    paperEvidence: ['final-goal-observable-acceptance.json','goal-evidence-stage-audit.json','principle-transfer-readiness-audit.json','slow-single-step-execution-contract.json','session-question-queue-contract.json','answer-provenance-and-grading-identity-contract.json','solver-course-visual-compiler-contract.json','c0-c9-visible-route-crosswalk.json','unit-canonical-route-bridge.json','full-course-coverage-and-release-contract.json','unit-c0-c9-release-crosswalk.json','unit-field-completion-queue.json','unit-reference-snapshot-request-manifest.json','210_35项单元参考快照请求与发布队列.md','course-simplification-and-edge-calibration-contract.json','211_课程简化、边缘牌与阈值校准合同.md','first-matched-package-resource-and-release-decision.json','213_首个匹配首手课包的资源选择与停止决策.md','a72-fact-and-stop-question-fixtures.json','214_A72事实题与停止题的自动出题样板.md','goal-route-requirement-crosswalk.json','session-evidence-and-target-report-contract.json','209_单次会话证据与目标级报告合同.md','goal-trial-and-target-benchmark-protocol.json','212_一遍学习、迁移、连续路线与目标级复核实验协议.md','target-standard-sequential-teaching-and-nl50-closure-contract.json','215_目标标准的顺序教学与NL50结果闭环合同.md','goal-standard-crosswalk-audit.json','216_目标标准与既有合同交叉审计.md','user-standard-requirement-audit.json','217_用户最终标准逐条验收审计.md','release-stage-alias-bridge.json','218_训练阶段别名与唯一用户进阶桥.md','user-stage-runtime-adoption-contract.json','219_U0_U7用户进阶运行时采用合同.md'],
    runtimeEvidence: ['heldout_slow_single_step_trace'],
    learnerEvidence: ['independent_first_attempt_before_explanation'],
    status: 'blocked_reference_and_trial',
    completionRequires: ['matched_or_declared_policy','amount_checked','range_after_or_stop']
  },
  {
    id: 'O6_reference_to_course_correctness',
    statement: '课程简化与参考策略分开保存，动作、EV、范围变化和后继有可追溯差异；不能把权益或局部示例当成GTO答案。',
    paperEvidence: ['solver-snapshot-to-lesson-package.json','strategy-to-course-compiler-contract.json','reference-course-policy-ledger-contract.json','answer-provenance-and-grading-identity-contract.json','solver-course-visual-compiler-contract.json','solver-course-visual-audit.json','reference-snapshot-intake-and-match-contract.json','208_参考快照接入、配置匹配与发布合同.md','unit-reference-snapshot-request-manifest.json','210_35项单元参考快照请求与发布队列.md','course-simplification-and-edge-calibration-contract.json','211_课程简化、边缘牌与阈值校准合同.md','reference-course-closure-ledger.json','reference-course-closure-audit.json','first-matched-package-resource-and-release-decision.json','213_首个匹配首手课包的资源选择与停止决策.md','a72-fact-and-stop-question-fixtures.json','214_A72事实题与停止题的自动出题样板.md','c0-c9-visible-route-crosswalk.json','c0-c9-visible-route-audit.json','target-standard-sequential-teaching-and-nl50-closure-contract.json','215_目标标准的顺序教学与NL50结果闭环合同.md','goal-standard-crosswalk-audit.json','216_目标标准与既有合同交叉审计.md','user-standard-requirement-audit.json','217_用户最终标准逐条验收审计.md','release-stage-alias-bridge.json','218_训练阶段别名与唯一用户进阶桥.md','user-stage-runtime-adoption-contract.json','219_U0_U7用户进阶运行时采用合同.md'],
    runtimeEvidence: [],
    learnerEvidence: [],
    status: 'blocked_matched_reference_missing',
    completionRequires: ['matched_input_fingerprint','reference_snapshot','course_policy','difference_ledger','successor_graph']
  },
  {
    id: 'O7_transfer_and_continuity',
    statement: '学习者能在只改变一个字段的陌生题中重新定位，并把翻牌、转牌、河牌的范围、账本、行动权和后继连续起来。',
    paperEvidence: ['slow-transfer-ladder.json','continuous-state-ledger-contract.json','session-question-queue-contract.json','unified-learner-evidence-release-gates.json','solver-course-visual-compiler-contract.json','c0-c9-visible-route-crosswalk.json','session-evidence-and-target-report-contract.json','209_单次会话证据与目标级报告合同.md','goal-trial-and-target-benchmark-protocol.json','212_一遍学习、迁移、连续路线与目标级复核实验协议.md','target-standard-sequential-teaching-and-nl50-closure-contract.json','215_目标标准的顺序教学与NL50结果闭环合同.md','goal-standard-crosswalk-audit.json','216_目标标准与既有合同交叉审计.md','user-standard-requirement-audit.json','217_用户最终标准逐条验收审计.md','release-stage-alias-bridge.json','218_训练阶段别名与唯一用户进阶桥.md','user-stage-runtime-adoption-contract.json','219_U0_U7用户进阶运行时采用合同.md'],
    runtimeEvidence: ['continuous_three_street_runtime_trace'],
    learnerEvidence: ['heldout_transfer_trial','continuous_three_street_trial'],
    status: 'blocked_successor_and_trial_missing',
    completionRequires: ['exactly_one_changed_field','successor_or_stop_for_every_open_node','range_and_ledger_conservation']
  },
  {
    id: 'O8_target_level_evidence',
    statement: '在冻结的六人现金桌、100BB和匹配参考上，未曝光题、独立复核和真实决策审计共同支持目标级能力评估。',
    paperEvidence: ['169_最终标准可观察验收与NL50边界合同.md','04_正确性与NL50验收方案.md','target-readiness-and-nl50-benchmark-contract.json','goal-evidence-stage-audit.json','solver-course-visual-compiler-contract.json','session-evidence-and-target-report-contract.json','209_单次会话证据与目标级报告合同.md','goal-trial-and-target-benchmark-protocol.json','212_一遍学习、迁移、连续路线与目标级复核实验协议.md','target-standard-sequential-teaching-and-nl50-closure-contract.json','215_目标标准的顺序教学与NL50结果闭环合同.md','goal-standard-crosswalk-audit.json','216_目标标准与既有合同交叉审计.md','user-standard-requirement-audit.json','217_用户最终标准逐条验收审计.md','release-stage-alias-bridge.json','218_训练阶段别名与唯一用户进阶桥.md','user-stage-runtime-adoption-contract.json','219_U0_U7用户进阶运行时采用合同.md'],
    runtimeEvidence: ['frozen_target_runtime_trace'],
    learnerEvidence: ['external_review','real_decision_audit'],
    status: 'blocked_target_benchmark_missing',
    completionRequires: ['matched_external_reference','heldout_continuous_route','independent_review','real_decision_audit']
  }
];
for (const id of ['O1_nested_sequential_route','O3_no_step_omitted','O4_first_pass_builds_mental_model']) {
  const requirement = objectiveRequirements.find((item) => item.id === id);
  if (!requirement.paperEvidence.includes('user-first-complete-route-contract.json')) {
    requirement.paperEvidence.push('user-first-complete-route-contract.json');
  }
}
for (const id of ['O5_slow_executable_decision','O6_reference_to_course_correctness']) {
  const requirement = objectiveRequirements.find((item) => item.id === id);
  if (!requirement.paperEvidence.includes('author-course-compilation-frontier.json')) {
    requirement.paperEvidence.push('author-course-compilation-frontier.json');
  }
}
const targetRequirement = objectiveRequirements.find((item) => item.id === 'O8_target_level_evidence');
if (!targetRequirement.paperEvidence.includes('target-config-source-ledger.json')) {
  targetRequirement.paperEvidence.push('target-config-source-ledger.json');
}
if (!targetRequirement.paperEvidence.includes('target-config-resolution-plan.json')) {
  targetRequirement.paperEvidence.push('target-config-resolution-plan.json');
}
const objectiveEvidenceAudit = (() => {
  const expected = ['O1_nested_sequential_route','O2_low_baseline_comprehension','O3_no_step_omitted','O4_first_pass_builds_mental_model','O5_slow_executable_decision','O6_reference_to_course_correctness','O7_transfer_and_continuity','O8_target_level_evidence'];
  const ids = objectiveRequirements.map(x => x.id);
  const paperSources = objectiveRequirements.flatMap(x => x.paperEvidence);
  const localSources = [...new Set(paperSources.filter(x => /\.(json|md)$/.test(x)))];
  const missingLocalSources = localSources.filter(x => !fs.existsSync(path.join(dir, x)));
  return {
    status: missingLocalSources.length === 0 ? 'paper_evidence_inventory_complete_runtime_and_learner_missing' : 'paper_evidence_inventory_has_missing_sources',
    allEightRegistered: JSON.stringify(ids) === JSON.stringify(expected),
    allHavePaperEvidence: objectiveRequirements.every(x => x.paperEvidence.length > 0),
    allHaveCompletionRequires: objectiveRequirements.every(x => x.completionRequires.length > 0),
    allHaveStatus: objectiveRequirements.every(x => typeof x.status === 'string' && x.status.length > 0),
    localPaperSourcesChecked: localSources.length,
    missingLocalSources
  };
})();
assert.equal(objectiveEvidenceAudit.allEightRegistered, true);
assert.equal(objectiveEvidenceAudit.allHavePaperEvidence, true);
assert.equal(objectiveEvidenceAudit.allHaveCompletionRequires, true);
assert.equal(objectiveEvidenceAudit.allHaveStatus, true);
assert.deepEqual(objectiveEvidenceAudit.missingLocalSources, []);

const gates = [
  {
    id: 'R0',
    name: 'canonical_nested_surface',
    requirement: '学习者只有一条顺序主线；内层按需打开并返回原父帧。',
    evidence: ['learner-goal-route-canonical.json','route-consistency-audit.json','first-pass-screen-coverage-matrix.json','first-pass-golden-path.json','canonical-prose-route-audit.json','first-pass-state-evidence-crosswalk.json','first-pass-learner-architecture-audit.json','goal-route-requirement-crosswalk.json'],
    status: route.currentEvidence.paperRoute && routeConsistency.currentEvidence.allLegacyCheckListsExact && screenAudit.checks.canonicalRouteMatchesGoldenPath && golden.frames.length === 13 && proseRouteAudit.status === 'paper_canonical_route_and_legacy_boundaries_consistent' && read('first-pass-state-evidence-crosswalk.json').status === 'paper_state_frame_memory_evidence_crosswalk_closed' ? 'pass' : 'blocked',
    runtimeRequired: true,
    runtimeObserved: runtime.currentEvidence.runtimeCanonicalRouteAttached && stateMachine.currentEvidence.runtimeImplemented,
    learnerTrialRequired: false,
    learnerTrialObserved: false
  },
  {
    id: 'R1',
    name: 'runtime_nested_route',
    requirement: 'React/桌面运行时实际读取 canonical next 链，保存父帧，关闭子层后恢复。',
    evidence: ['runtime-route-attachment-audit.json','first-lesson-visible-state-machine.json'],
    status: runtime.currentEvidence.runtimeCanonicalRouteAttached && stateMachine.currentEvidence.runtimeImplemented ? 'pass' : 'blocked',
    runtimeRequired: true,
    runtimeObserved: runtime.currentEvidence.runtimeCanonicalRouteAttached && stateMachine.currentEvidence.runtimeImplemented,
    learnerTrialRequired: false,
    learnerTrialObserved: false
  },
  {
    id: 'R2',
    name: 'complete_course_content',
    requirement: '35 个后台单元全部具备街次、角色、动作状态、范围、后继和停止边界。',
    evidence: ['unit-course-manifest.json','unit-canonical-route-bridge.json','full-course-coverage-and-release-contract.json','session-question-queue-contract.json','unit-outcome-matrix.json','goal-level-acceptance-matrix.json','unit-c0-c9-release-crosswalk.json','unit-c0-c9-release-audit.json','unit-field-completion-queue.json','unit-release-readiness-ledger.json','unit-release-readiness-audit.json','unit-reference-snapshot-request-manifest.json','course-simplification-and-edge-calibration-contract.json','material-policy-classification.json','material-policy-classification-audit.json','material-unit-crosswalk.json','material-unit-crosswalk-audit.json','course-policy-candidate-ledger.json','course-policy-candidate-ledger-audit.json'],
    status: units.counts?.canonicalComplete === 35 || goal.currentEvidence.all35CompleteExecution ? 'pass' : 'blocked',
    runtimeRequired: false,
    runtimeObserved: false,
    learnerTrialRequired: false,
    learnerTrialObserved: false
  },
  {
    id: 'R3',
    name: 'matched_reference',
    requirement: '至少一套与课程固定配置完全匹配的逐组合参考策略、动作后范围和后继树已经取得。',
    evidence: ['first-course-closure-audit.json','strategy-to-course-compiler-contract.json','answer-provenance-and-grading-identity-contract.json','reference-snapshot-intake-and-match-contract.json','208_参考快照接入、配置匹配与发布合同.md','unit-reference-snapshot-request-manifest.json','210_35项单元参考快照请求与发布队列.md','course-simplification-and-edge-calibration-contract.json','first-matched-package-resource-and-release-decision.json','213_首个匹配首手课包的资源选择与停止决策.md','qqq-v2-course-bridge-audit.json','reference-course-closure-ledger.json','reference-course-closure-audit.json','material-unit-crosswalk.json','material-unit-crosswalk-audit.json','course-policy-candidate-ledger.json','course-policy-candidate-ledger-audit.json','solver-course-visual-compiler-contract.json','solver-course-visual-audit.json','c0-c9-visible-route-crosswalk.json','c0-c9-visible-route-audit.json'],
    status: firstCourse.currentEvidence.a72ReferenceSolved && qqqBridge.currentEvidence.matchedTargetReferenceForAllUnits ? 'pass' : 'blocked',
    runtimeRequired: false,
    runtimeObserved: false,
    learnerTrialRequired: false,
    learnerTrialObserved: false
  },
  {
    id: 'R4',
    name: 'course_policy_compiler',
    requirement: 'GTO 参考与课程简化分开保存；简化变化、祖先重编译和停止原因可追溯。',
    evidence: ['strategy-to-course-compiler-contract.json','answer-provenance-and-grading-identity-contract.json','course-simplification-calibration.json','course-package-field-crosswalk.json','reference-snapshot-intake-and-match-contract.json','unit-reference-snapshot-request-manifest.json','course-simplification-and-edge-calibration-contract.json','reference-course-closure-ledger.json','reference-course-closure-audit.json','material-policy-classification.json','material-policy-classification-audit.json','course-policy-candidate-ledger.json','course-policy-candidate-ledger-audit.json','solver-course-visual-compiler-contract.json','solver-course-visual-audit.json','c0-c9-visible-route-crosswalk.json','c0-c9-visible-route-audit.json'],
    status: compiler.currentEvidence.compilerImplemented && compiler.currentEvidence.matchedA72Reference ? 'pass' : 'blocked',
    runtimeRequired: false,
    runtimeObserved: false,
    learnerTrialRequired: false,
    learnerTrialObserved: false
  },
  {
    id: 'R5',
    name: 'low_baseline_first_pass',
    requirement: '低基础、慢阅读或慢操作用户能完整跟完首遍，并能回忆路线、定位层、错误回退和单变量变化。',
    evidence: ['cross-age-low-baseline-acceptance.json','low-baseline-stop-observation-crosswalk.json','low-baseline-visual-language-audit.json','route-cognitive-slow-execution-bridge.json','first-pass-user-facing-script-contract.json','first-pass-full-guided-administration-audit.json','session-evidence-and-target-report-contract.json','goal-trial-and-target-benchmark-protocol.json','goal-level-acceptance-matrix.json'],
    status: crossAge.currentEvidence.crossAgeTrial && crossAge.currentEvidence.routeComprehension ? 'pass' : 'blocked',
    runtimeRequired: true,
    runtimeObserved: runtime.currentEvidence.runtimeCanonicalRouteAttached,
    learnerTrialRequired: true,
    learnerTrialObserved: crossAge.currentEvidence.crossAgeTrial && crossAge.currentEvidence.routeComprehension
  },
  {
    id: 'R6',
    name: 'unseen_single_step_transfer',
    requirement: '在未见题中只改变一个字段，用户先作答，再解释并回到正确层。',
    evidence: ['slow-transfer-ladder.json','principle-transfer-readiness-audit.json','route-cognitive-slow-execution-bridge.json','session-question-queue-contract.json','unified-learner-evidence-release-gates.json','session-evidence-and-target-report-contract.json','goal-trial-and-target-benchmark-protocol.json','goal-level-acceptance-matrix.json'],
    status: transfer.currentEvidence?.heldoutTransfer ? 'pass' : 'blocked',
    runtimeRequired: true,
    runtimeObserved: unified.currentEvidence.runtime,
    learnerTrialRequired: true,
    learnerTrialObserved: transfer.currentEvidence?.heldoutTransfer ?? false
  },
  {
    id: 'R7',
    name: 'continuous_three_street',
    requirement: '翻牌、转牌、河牌保持范围、账本、行动权和后继连续，结算不反写当时决策。',
    evidence: ['first-course-closure-audit.json','goal-level-acceptance-matrix.json','unified-learner-evidence-release-gates.json','solver-course-visual-compiler-contract.json','c0-c9-visible-route-crosswalk.json','session-evidence-and-target-report-contract.json','goal-trial-and-target-benchmark-protocol.json'],
    status: firstCourse.releaseDecision.continuousThreeStreetLesson && goal.currentEvidence.completeSuccessorChain ? 'pass' : 'blocked',
    runtimeRequired: true,
    runtimeObserved: unified.currentEvidence.runtime,
    learnerTrialRequired: true,
    learnerTrialObserved: unified.currentEvidence.learnerTrial
  },
  {
    id: 'R8',
    name: 'frozen_target_benchmark',
    requirement: '在冻结的六人现金桌、100BB、目标抽水和匹配参考上，用未曝光题和独立复核评估目标级能力。',
    evidence: ['goal-level-acceptance-matrix.json','04_正确性与NL50验收方案.md','target-readiness-and-nl50-benchmark-contract.json','goal-evidence-stage-audit.json','final-goal-observable-acceptance.json','session-evidence-and-target-report-contract.json','goal-trial-and-target-benchmark-protocol.json'],
    status: goal.currentEvidence.NL50Evidence ? 'pass' : 'blocked',
    runtimeRequired: true,
    runtimeObserved: false,
    learnerTrialRequired: true,
    learnerTrialObserved: false
  }
];

assert.deepEqual(route.outerRoute.map(step => step.id), canonicalRoute);
assert.deepEqual(route.postflopSequentialChain, ['p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close']);
assert.deepEqual(screen.outerRoute, canonicalRoute);
assert.deepEqual(screen.innerRoute, innerRoute);
assert.equal(screenAudit.checks.canonicalRouteMatchesGoldenPath, true);
assert.equal(repo.currentEvidence.onlineReview, true);
assert.equal(repo.publicPageReview.reviewDate, '2026-10-22');
assert.equal(repo.publicPageReview.guards.publicPageDoesNotEqualBuiltRuntime, true);
assert.equal(repo.publicPageReview.guards.repositoryPageDoesNotEqualMatchedCourseStrategy, true);
assert.equal(referenceIntake.currentEvidence.identitySchemaWritten, true);
assert.equal(referenceIntake.currentEvidence.matchedSnapshot, false);
assert.equal(referenceIntake.guards.noMatchMeansNoExactGrade, true);
assert.equal(sessionEvidence.currentEvidence.schemaWritten, true);
assert.equal(sessionEvidence.currentEvidence.runtimeRecordWriter, false);
assert.equal(sessionEvidence.privacyAndStorage.noDatabase, true);
assert.equal(unitReferenceRequests.currentEvidence.all35RequestsCompiled, true);
assert.equal(unitReferenceRequests.counts.matchedReferenceRows, 0);
assert.equal(unitReferenceRequests.sharedRules.exactIdentityBeforeStrategy, true);
assert.equal(simplificationCalibration.currentEvidence.perUnitRowsCompiled, true);
assert.equal(simplificationCalibration.currentEvidence.matchedReference, false);
assert.equal(simplificationCalibration.currentEvidence.thresholdsCalibrated, false);
assert.deepEqual(simplificationCalibration.quantization.policySpace, [0, 0.5, 1]);
assert.equal(goalTrialProtocol.currentEvidence.protocolWritten, true);
assert.equal(goalTrialProtocol.currentEvidence.runtimeInstrumentation, false);
assert.equal(goalTrialProtocol.currentEvidence.nl50Evidence, false);
assert.equal(goalTrialProtocol.phases.length, 7);
assert.equal(goalTrialProtocol.stopRules.failedPhaseBlocksNextPhase, true);
assert.equal(firstMatchedDecision.resourceDecision.compressedFits, false);
assert.equal(firstMatchedDecision.currentEvidence.C1Fact, true);
assert.equal(firstMatchedDecision.currentEvidence.C2Reference, false);
assert.equal(firstMatchedDecision.guards.resourceFailureIsNotPartialGTO, true);
assert.equal(a72QuestionFixtures.id, 'A72_FACT_AND_STOP_QUESTION_FIXTURES_V1');
assert.equal(a72QuestionFixtures.status, 'paper_fact_and_stop_question_fixtures_compiled_strategy_fixture_blocked');
assert.equal(a72QuestionFixtures.fixtures.length, 3);
assert.equal(a72QuestionFixtures.currentEvidence.factFixturesCompiled, true);
assert.equal(a72QuestionFixtures.currentEvidence.stopFixtureCompiled, true);
assert.equal(a72QuestionFixtures.currentEvidence.referencePolicyFixture, false);
assert.equal(a72QuestionFixtures.currentEvidence.rangeAfterFixture, false);
assert.equal(a72QuestionFixtures.rules.everyFixtureHasUnknownButton, true);
assert.equal(a72QuestionFixtures.rules.factDoesNotUseActionFrequency, true);
assert.equal(a72QuestionFixtures.rules.stopDoesNotUseDefaultAction, true);
assert.equal(a72QuestionFixtures.rules.strategyFixturesBlockedUntilMatchedReference, true);
assert.equal(targetStandard.id, 'TARGET_STANDARD_SEQUENTIAL_TEACHING_AND_NL50_CLOSURE_CONTRACT_V1');
assert.equal(targetStandard.status, 'paper_goal_standard_compiled_runtime_reference_and_learner_evidence_missing');
assert.deepEqual(targetStandard.canonicalRoute, canonicalRoute);
assert.equal(targetStandard.canonicalUserExperience.length, canonicalRoute.length);
for (const row of targetStandard.canonicalUserExperience) {
  assert.ok(row.job && row.userOutput && row.plainQuestion && row.whyNow && row.centerVisual && row.primaryAction && row.answerShape && row.next);
}
assert.equal(targetStandard.releaseStages.length, 4);
assert.equal(targetStandard.fullCourseReleaseSchedule.length, 6);
assert.deepEqual(targetStandard.fullCourseReleaseSchedule[0].visibleUnits, ['1.5','2.1','3.1','4.5','5.7']);
assert.equal(targetStandard.fullCourseReleaseSchedule[1].visibleUnits, 'all35');
assert.equal(targetStandard.fullCourseReleaseSchedule[5].visibleUnits, 'successor_closed_only');
assert.equal(Object.keys(targetStandard.unitGroupParents).length, 5);
assert.deepEqual(targetStandard.unitGroupParents, unitCanonicalBridge.groupParent);
assert.deepEqual(targetStandard.fullCourseReleaseSchedule[0].visibleUnits, ['1.5','2.1','3.1','4.5','5.7']);
assert.equal(targetStandard.schedulerRules.oneChildAtATime, true);
assert.equal(targetStandard.schedulerRules.noFlat35Home, true);
assert.equal(targetStandard.schedulerRules.poolRatioChangesSamplingOnly, true);
assert.equal(targetStandard.schedulerRules.emptyPoolIsUnavailable, true);
assert.equal(targetStandard.schedulerRules.missingSuccessorBlocksContinuousStage, true);
assert.equal(targetStandard.visualExperienceContract.screenRegions.length, 4);
assert.equal(targetStandard.visualExperienceContract.oneCentralVisualPerStop, true);
assert.equal(targetStandard.visualExperienceContract.animationStopsBeforeQuestion, true);
assert.equal(targetStandard.visualExperienceContract.same13x13CoordinateBeforeAfter, true);
assert.equal(targetStandard.visualExperienceContract.sameDenominatorBeforeAfter, true);
assert.equal(targetStandard.visualExperienceContract.physicalImpossibleDistinctFromActionFiltered, true);
assert.equal(targetStandard.visualExperienceContract.unknownDistinctFromZero, true);
assert.equal(targetStandard.visualExperienceContract.colorIsNotSoleSemanticChannel, true);
assert.equal(targetStandard.visualExperienceContract.parentSnapshotRestoredAfterChildClose, true);
assert.deepEqual(targetStandard.principleCardContract.cardsPerUnit, ['baseCase','contrastCase','transferCase']);
assert.equal(targetStandard.principleCardContract.contrastExactlyOneChangedField, true);
assert.equal(targetStandard.principleCardContract.allOtherInputsHeld, true);
assert.equal(targetStandard.principleCardContract.requiredCardOutputs.length, 8);
assert.equal(targetStandard.principleCardContract.technicalTermsAreNotFirstNavigation, true);
assert.equal(targetStandard.principleCardContract.physicalRemovalDoesNotEqualActionFilter, true);
assert.equal(targetStandard.principleCardContract.missingEvidencePublishesFactDemoOrStopOnly, true);
assert.equal(targetStandard.evidenceRubric.dimensions.length, 7);
assert.equal(targetStandard.evidenceRubric.noCompositeScorePromotion, true);
assert.equal(targetStandard.evidenceRubric.firstPassMaximumClaim, 'routeComprehension');
assert.equal(targetStandard.evidenceRubric.missingReferenceBlocks, 'slowSingleStep');
assert.equal(targetStandard.evidenceRubric.missingSuccessorBlocks, 'continuousThreeStreet');
assert.equal(targetStandard.evidenceRubric.missingExternalBenchmarkBlocks, 'NL50Discussion');
assert.equal(targetStandard.evidenceRubric.speedIsNotGate, true);
assert.equal(targetStandard.evidenceRubric.ageLabelIsNotEvidence, true);
assert.equal(targetStandard.evidenceRubric.shortTermOutcomeIsNotDecisionGrade, true);
assert.equal(targetStandard.evidenceRubric.failureReturnsToCorrespondingParent, true);
assert.equal(targetStandard.principleCoverageContract.requiredCount, principleCoverage.principles.length);
assert.deepEqual(targetStandard.principleCoverageContract.requiredIds, principleCoverage.principles.map(x => x.id));
assert.equal(targetStandard.principleCoverageContract.firstPassMustIntroduceEveryPrinciple, true);
assert.equal(targetStandard.principleCoverageContract.recheckMustReturnToSameParent, true);
assert.equal(targetStandard.principleCoverageContract.principleIsNotFlatMenu, true);
assert.equal(targetStandard.principleCoverageContract.missingPrincipleBlocksFirstPassRelease, true);
assert.equal(targetStandard.languageContract.defaultFirstPassLayer, 'plain_language_plus_practice_language');
assert.equal(targetStandard.languageContract.forbiddenPrimaryTerms.length, 10);
assert.equal(targetStandard.languageContract.oneQuestionPerStep, true);
assert.equal(targetStandard.languageContract.onePrimaryActionPerStep, true);
assert.equal(targetStandard.languageContract.plainLanguageBeforeTechnicalAlias, true);
assert.equal(targetStandard.languageContract.technicalTermCannotBeOnlyNavigationCue, true);
assert.equal(targetStandard.languageContract.feedbackNamesLayerAndReturnPoint, true);
assert.equal(targetStandard.languageContract.physicalRemovalDistinctFromActionFilter, true);
assert.equal(targetStandard.languageContract.handStrengthDistinctFromEquityAndAction, true);
assert.equal(targetStandard.languageContract.courseRuleDistinctFromReferencePolicy, true);
assert.equal(targetStandard.languageContract.nonzeroLowerWeightIsNotImpossible, true);
assert.equal(targetStandard.routeInvariant.oneVisibleParentAtATime, true);
assert.equal(targetStandard.routeInvariant.childReturnsToSameParentSnapshot, true);
assert.equal(targetStandard.routeInvariant.noFlat35HomeMenu, true);
assert.equal(targetStandard.routeInvariant.missingEvidenceCreatesStopCard, true);
assert.equal(targetStandard.evidenceRules.firstAnswerBeforeHelp, true);
assert.equal(targetStandard.evidenceRules.paperContractDoesNotEqualNL50, true);
assert.equal(targetStandard.currentEvidence.paperStandardCompiled, true);
assert.equal(targetStandard.currentEvidence.NL50Evidence, false);
assert.equal(crosswalkAudit.id, 'GOAL_STANDARD_CROSSWALK_AUDIT_V1');
assert.equal(crosswalkAudit.status, 'paper_goal_standard_crosswalk_consistent_runtime_and_learner_evidence_missing');
assert.equal(crosswalkAudit.summary.total, 12);
assert.equal(crosswalkAudit.summary.passed, 12);
assert.equal(crosswalkAudit.summary.failed, 0);
assert.equal(crosswalkAudit.currentEvidence.paperCrosswalk, true);
assert.equal(crosswalkAudit.currentEvidence.runtimeRoute, false);
assert.equal(crosswalkAudit.currentEvidence.matchedReference, false);
assert.equal(crosswalkAudit.currentEvidence.lowBaselineTrial, false);
assert.equal(crosswalkAudit.currentEvidence.learnerTransfer, false);
assert.equal(crosswalkAudit.currentEvidence.NL50Evidence, false);
assert.equal(crosswalkAudit.guards.crosswalkPassDoesNotEqualRuntime, true);
assert.equal(crosswalkAudit.guards.crosswalkPassDoesNotEqualNL50, true);
assert.equal(userStandardRequirementAudit.id, 'USER_STANDARD_REQUIREMENT_AUDIT_V1');
assert.equal(userStandardRequirementAudit.status, 'paper_user_standard_mapped_runtime_learner_and_target_evidence_missing');
assert.equal(userStandardRequirementAudit.requirements.length, 8);
assert.equal(userStandardRequirementAudit.summary.paperComplete, 8);
assert.equal(userStandardRequirementAudit.summary.runtimeComplete, 0);
assert.equal(userStandardRequirementAudit.summary.learnerComplete, 0);
assert.equal(userStandardRequirementAudit.summary.targetComplete, 0);
assert.equal(userStandardRequirementAudit.currentEvidence.paperUserStandardMapped, true);
assert.equal(userStandardRequirementAudit.currentEvidence.runtimeRoute, false);
assert.equal(userStandardRequirementAudit.currentEvidence.learnerTrial, false);
assert.equal(userStandardRequirementAudit.currentEvidence.targetBenchmark, false);
assert.equal(userStandardRequirementAudit.guards.paperMappingDoesNotEqualRuntime, true);
assert.equal(userStandardRequirementAudit.guards.continuousThreeStreetDoesNotEqualNL50, true);
assert.equal(stageAliasBridge.id, 'RELEASE_STAGE_ALIAS_BRIDGE_V1');
assert.equal(stageAliasBridge.status, 'paper_release_aliases_unified_runtime_must_use_canonical_user_stage');
assert.equal(stageAliasBridge.canonicalUserStages.length, 8);
assert.deepEqual(stageAliasBridge.stageMap.userFacingOrder, ['U0_guided_route','U1_structure_recall','U2_same_parent_practice','U3_slow_single_step','U4_adjacent_transfer','U5_delayed_recall','U6_continuous_three_street','U7_target_review']);
assert.equal(stageAliasBridge.rules.runtimeStoresOnlyCanonicalUserStage, true);
assert.equal(stageAliasBridge.rules.authorAliasesNeverBecomeUserNavigation, true);
assert.equal(stageAliasBridge.currentEvidence.runtimeUsesCanonicalStage, false);
assert.equal(stageAliasBridge.guards.aliasBridgeDoesNotEqualLearnerMastery, true);
assert.equal(userStageRuntimeContract.id, 'USER_STAGE_RUNTIME_ADOPTION_CONTRACT_V1');
assert.equal(userStageRuntimeContract.status, 'paper_user_stage_runtime_contract_written_not_implemented');
assert.deepEqual(userStageRuntimeContract.canonicalUserStages, ['U0_guided_route','U1_structure_recall','U2_same_parent_practice','U3_slow_single_step','U4_adjacent_transfer','U5_delayed_recall','U6_continuous_three_street','U7_target_review']);
assert.deepEqual(userStageRuntimeContract.canonicalRoute, canonicalRoute);
assert.equal(userStageRuntimeContract.sessionStateFields.includes('userStage'), true);
assert.equal(userStageRuntimeContract.sessionStateFields.includes('parentFrameStack'), true);
assert.equal(userStageRuntimeContract.visibleRules.authorAliasesHidden, true);
assert.equal(userStageRuntimeContract.transitionRules.userStageCannotAdvanceFromTotalScore, true);
assert.equal(userStageRuntimeContract.currentEvidence.runtimeReadsUserStage, false);
assert.equal(userStageRuntimeContract.currentEvidence.runtimeParentRestore, false);
assert.equal(userStageRuntimeContract.guards.contractDoesNotEqualRuntime, true);
assert.equal(userFirstCompleteRoute.id, 'USER_FIRST_COMPLETE_ROUTE_CONTRACT_V1');
assert.equal(userFirstCompleteRoute.units.length, 35);
assert.equal(userFirstCompleteRoute.structuralChecks.all35Mapped, true);
assert.equal(userFirstCompleteRoute.structuralChecks.allUnitsReturnToSameParent, true);
assert.equal(userFirstCompleteRoute.structuralChecks.firstPassHasOneRepresentativePerGroup, true);
assert.equal(userFirstCompleteRoute.contentChecks.allExactStrategiesReady, false);
assert.equal(userFirstCompleteRoute.currentEvidence.runtimeReadsCanonicalRoute, false);
assert.equal(authorCourseFrontier.id, 'AUTHOR_COURSE_COMPILATION_FRONTIER_V1');
assert.equal(authorCourseFrontier.rows.length, 35);
assert.equal(authorCourseFrontier.checks.all35Listed, true);
assert.equal(authorCourseFrontier.checks.noNeighborSubstitution, true);
assert.equal(authorCourseFrontier.currentEvidence.exactPolicyReadyCount, 0);
assert.equal(authorCourseFrontier.currentEvidence.referenceReadyCount, 0);
assert.equal(targetConfigSourceLedger.id, 'TARGET_CONFIG_SOURCE_LEDGER_V1');
assert.deepEqual(targetConfigSourceLedger.requiredFields, targetBenchmark.targetConfig.requiredFields);
assert.equal(targetConfigSourceLedger.currentEvidence.targetConfigurationFrozen, false);
assert.equal(targetConfigSourceLedger.decisionRules.noGuessedDefaults, true);
assert.equal(targetConfigResolutionPlan.id, 'TARGET_CONFIG_RESOLUTION_PLAN_V1');
assert.equal(targetConfigResolutionPlan.rows.length, 15);
assert.equal(targetConfigResolutionPlan.currentEvidence.allRequiredFieldsPlanned, true);
assert.equal(targetConfigResolutionPlan.currentEvidence.targetConfigurationFrozen, false);
assert.equal(qqqBridge.currentEvidence.coursePolicyCompiled, false);
assert.equal(visualCompiler.currentEvidence.contractWritten, true);
assert.equal(visualCompiler.currentEvidence.compilerImplemented, false);
assert.equal(visualCompiler.currentEvidence.matchedReference, false);
assert.equal(visualAudit.ok, true);
assert.equal(visualAudit.layers, 8);
assert.equal(visualAudit.formulas, 6);
assert.equal(visualAudit.handoffEdges, 9);
assert.equal(visualAudit.fieldReaderAudit, true);
assert.equal(visualAudit.fieldLineageFields, 47);
assert.equal(visualAudit.fieldLineageAudit, true);
assert.equal(c0c9Crosswalk.currentEvidence.allTenStagesMapped, true);
assert.equal(c0c9Crosswalk.currentEvidence.allPackageOutputsMapped, true);
assert.equal(c0c9Audit.ok, true);
assert.equal(c0c9Audit.stages, 10);
assert.equal(c0c9Audit.visibleFieldSourcesMapped, true);
assert.equal(unitC0C9Crosswalk.currentEvidence.all35UnitsMapped, true);
assert.equal(unitC0C9Crosswalk.currentEvidence.allParentsMatch, true);
assert.equal(unitC0C9Crosswalk.currentEvidence.allCStagesDeclared, true);
assert.equal(unitC0C9Audit.ok, true);
assert.equal(unitC0C9Audit.units, 35);
assert.equal(unitC0C9Audit.allParentsMatch, true);
assert.equal(unitFieldQueue.id, 'UNIT_FIELD_COMPLETION_QUEUE_V1');
assert.equal(unitFieldQueue.status, 'queue_compiled_from_audit_not_released');
assert.equal(unitFieldQueue.queue.length, 35);
assert.equal(unitFieldQueue.summary.identityComplete, 19);
assert.equal(unitFieldQueue.summary.identityPartial, 16);
assert.equal(unitFieldQueue.summary.coursePolicyReady, 0);
assert.equal(unitFieldQueue.summary.referencePolicyReady, 0);
assert.equal(unitFieldQueue.summary.rangeSnapshotsReady, 0);
assert.equal(unitFieldQueue.summary.successorReady, 0);
assert.equal(unitFieldQueue.currentEvidence.runtimeImplemented, false);
assert.equal(unitFieldQueue.currentEvidence.learnerTrial, false);
assert.equal(goalRouteCrosswalk.id, 'GOAL_ROUTE_REQUIREMENT_CROSSWALK_V1');
assert.equal(goalRouteCrosswalk.status, 'paper_goal_to_route_and_author_stage_crosswalk_closed_runtime_missing');
assert.equal(goalRouteCrosswalk.requirements.length, 10);
assert.deepEqual(goalRouteCrosswalk.canonicalRoute, canonicalRoute);
assert.equal(goalRouteCrosswalk.authorStages.length, 10);
assert.equal(goalRouteCrosswalk.rules.everyGoalRequirementMapped, true);
assert.equal(goalRouteCrosswalk.rules.everyCanonicalStateMapped, true);
assert.equal(goalRouteCrosswalk.rules.everyAuthorStageMapped, true);
assert.equal(goalRouteCrosswalk.rules.everyProofFieldHasAuthoritativeSource, true);
assert.equal(goalRouteCrosswalk.rules.everyRouteOutputConsumedOrTerminal, true);
assert.equal(goalRouteCrosswalk.currentEvidence.goalCompletionVerified, false);
assert.equal(stateCrosswalkAudit.checks.everyRequiredOutputConsumedOrTerminal, true);
assert.equal(stopObservation.id, 'LOW_BASELINE_STOP_OBSERVATION_CROSSWALK_V1');
assert.equal(stopObservation.status, 'paper_stop_observation_crosswalk_closed_trial_missing');
assert.deepEqual(stopObservation.canonicalRoute, canonicalRoute);
assert.equal(stopObservation.rows.length, canonicalRoute.length);
assert.equal(stopObservation.channels.length, 4);
assert.equal(stopObservation.rules.allCanonicalStopsMapped, true);
assert.equal(stopObservation.rules.allFourChannelsBoundAtEveryStop, true);
assert.equal(stopObservation.rules.firstAnswerBeforeHelp, true);
assert.equal(stopObservation.rules.missingObservationIsUnknownNotPass, true);
assert.equal(stopObservation.currentEvidence.participantObserved, false);
assert.equal(cognitiveBridge.id, 'ROUTE_COGNITIVE_SLOW_EXECUTION_BRIDGE_V1');
assert.equal(cognitiveBridge.status, 'paper_route_cognitive_bridge_closed_runtime_and_trial_missing');
assert.deepEqual(cognitiveBridge.canonicalRoute, canonicalRoute);
assert.equal(cognitiveBridge.rows.length, canonicalRoute.length);
assert.equal(cognitiveBridge.architectureNodes.length, 8);
assert.equal(cognitiveBridge.slowPhases.length, 6);
assert.equal(cognitiveBridge.rules.all12StopsHaveCognitiveJob, true);
assert.equal(cognitiveBridge.rules.everyArchitectureNodeIsUsed, true);
assert.equal(cognitiveBridge.rules.everySlowPhaseIsUsed, true);
assert.equal(cognitiveBridge.rules.everyHandoffMatchesStateRequiredOutput, true);
assert.equal(cognitiveBridge.rules.replayRequiresOuterAndInnerLayers, true);
assert.equal(cognitiveBridge.rules.slowExecutionRequiresFirstAnswerBeforeHelp, true);
assert.equal(cognitiveBridge.currentEvidence.fullGuidedTrial, false);
assert.equal(unitCanonicalBridge.id, 'UNIT_CANONICAL_ROUTE_BRIDGE_V1');
assert.equal(unitCanonicalBridge.status, 'paper_35_unit_canonical_parent_bridge_closed_legacy_alias_quarantined');
assert.equal(unitCanonicalBridge.rows.length, 35);
assert.deepEqual(Object.keys(unitCanonicalBridge.groupParent).sort(), ['compare.bet','compare.raise','compare.unopened','update.card','update.response']);
assert.equal(unitCanonicalBridge.rules.all35UnitsMapped, true);
assert.equal(unitCanonicalBridge.rules.allReturnsToSameCanonicalParent, true);
assert.equal(unitCanonicalBridge.rules.legacyL6L7AreAuthorOnlyAliases, true);
assert.equal(unitCanonicalBridge.currentEvidence.legacyAliasQuarantinedInRuntime, false);
assert.equal(fullCoveragePlan.id, 'FULL_COURSE_COVERAGE_AND_RELEASE_CONTRACT_V1');
assert.equal(fullCoveragePlan.status, 'paper_35_unit_coverage_plan_compiled_pools_and_reference_missing');
assert.equal(fullCoveragePlan.rows.length, 35);
assert.equal(fullCoveragePlan.releasePlan.length, 4);
assert.equal(fullCoveragePlan.requiredModes.length, 3);
assert.equal(fullCoveragePlan.requiredPools.length, 7);
assert.equal(fullCoveragePlan.rules.all35HaveBaseContrastTransfer, true);
assert.equal(fullCoveragePlan.rules.firstPassUsesOnlyFiveRepresentatives, true);
assert.equal(fullCoveragePlan.rules.noFlat35HomeMenu, true);
assert.equal(fullCoveragePlan.rules.missingPoolIsNotFilledByNeighbor, true);
assert.equal(fullCoveragePlan.currentEvidence.all105CardsCompiled, false);
assert.equal(fullCoveragePlan.currentEvidence.ratiosCalibrated, false);
assert.equal(sessionQueue.id, 'SESSION_QUESTION_QUEUE_CONTRACT_V1');
assert.equal(sessionQueue.status, 'paper_deterministic_session_scheduler_specified_runtime_missing');
assert.deepEqual(sessionQueue.canonicalRoute, canonicalRoute);
assert.equal(sessionQueue.priority.length, 7);
assert.equal(sessionQueue.hardFilters.length, 9);
assert.equal(sessionQueue.stageTransitions.length, 7);
assert.equal(sessionQueue.ratioPolicy.exactRequestedRatiosPreserved, true);
assert.equal(sessionQueue.ratioPolicy.unavailablePoolIsNotReplaced, true);
assert.equal(sessionQueue.errorPolicy.sameParentAfterError, true);
assert.equal(sessionQueue.errorPolicy.firstAnswerPreserved, true);
assert.equal(sessionQueue.currentEvidence.runtimeScheduler, false);
assert.equal(answerProvenance.id, 'ANSWER_PROVENANCE_AND_GRADING_IDENTITY_CONTRACT_V1');
assert.equal(answerProvenance.status, 'paper_answer_identity_and_source_lineage_closed_runtime_package_missing');
assert.equal(answerProvenance.identities.length, 6);
assert.equal(Object.keys(answerProvenance.formulas).length, 6);
assert.equal(answerProvenance.releaseGates.length, 8);
assert.equal(answerProvenance.rules.unknownIsNotZero, true);
assert.equal(answerProvenance.rules.equityIsNotAction, true);
assert.equal(answerProvenance.rules.solverIsNotCoursePolicy, true);
assert.equal(answerProvenance.rules.noExactGradeWithoutReleaseGates, true);
assert.equal(answerProvenance.currentEvidence.runtimeGradesByIdentity, false);
assert.equal(firstPassUserScript.id, 'FIRST_PASS_USER_FACING_SCRIPT_CONTRACT_V1');
assert.equal(firstPassUserScript.status, 'paper_13_frame_user_script_closed_runtime_and_trial_missing');
assert.equal(firstPassUserScript.rows.length, 13);
assert.deepEqual(firstPassUserScript.canonicalRoute, canonicalRoute);
assert.equal(firstPassUserScript.rules.oneQuestionPerFrame, true);
assert.equal(firstPassUserScript.rules.firstAnswerBeforeExplanation, true);
assert.equal(firstPassUserScript.rules.replayRequiresOuterAndInnerRoute, true);
assert.equal(firstPassUserScript.rules.replayRequiresOneVariableTransfer, true);
assert.equal(firstPassUserScript.currentEvidence.runtimeScriptAttached, false);
assert.equal(firstPassUserScript.currentEvidence.replayObserved, false);
assert.equal(targetBenchmark.id, 'TARGET_READINESS_AND_NL50_BENCHMARK_CONTRACT_V1');
assert.equal(targetBenchmark.status, 'paper_target_benchmark_schema_frozen_fields_and_external_evidence_missing');
assert.equal(targetBenchmark.targetConfig.requiredFields.length, 15);
assert.equal(targetBenchmark.scoreDimensions.length, 11);
assert.equal(targetBenchmark.evidenceStages.length, 5);
assert.equal(targetBenchmark.holdoutRules.freezeBeforeScoring, true);
assert.equal(targetBenchmark.holdoutRules.dedupeByStructureAndSource, true);
assert.equal(targetBenchmark.realDecisionAudit.outcomeIsNotDecisionGrade, true);
assert.equal(targetBenchmark.rules.NL50RequiresAllEvidenceStages, true);
assert.equal(targetBenchmark.currentEvidence.targetConfigurationFrozen, false);
assert.equal(targetBenchmark.currentEvidence.NL50Evidence, false);

const allGatesPass = gates.every(gate => gate.status === 'pass');
const nextActions = gates.filter(gate => gate.status !== 'pass').map(gate => ({
  gate: gate.id,
  action: {
    R1: '把运行时入口迁移到 canonical next 链，先完成父帧保存和子层返回。',
    R2: '先补齐一个完整匹配课包，再按五组逐项关闭35个单元。',
    R3: '取得与固定课程配置一致的逐组合参考、动作后范围和合法后继。',
    R4: '实现参考快照到课程政策的编译、差异报告和祖先重编译。',
    R5: '运行真实低基础首遍试读，记录首答、帮助、错误层和父帧恢复。',
    R6: '在运行时启用未见单变量迁移，先答后解，并验证保持字段。',
    R7: '闭合三街每个开放节点的后继，独立核对范围和账本守恒。',
    R8: '冻结目标配置和未曝光题包，进行独立外部复核与真实决策审计。'
  }[gate.id],
  blockingEvidence: gate.evidence
}));
const releaseDependencyGraph = {
  R0: [],
  R1: ['R0'],
  R2: ['R0'],
  R3: ['R0', 'R2'],
  R4: ['R3'],
  R5: ['R1', 'R3', 'R4'],
  R6: ['R1', 'R4', 'R5'],
  R7: ['R1', 'R3', 'R4', 'R6'],
  R8: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7']
};
const releaseDependencyRules = {
  userOrderIsCanonical: true,
  runtimeBeforeLearnerTrial: true,
  matchedReferenceBeforeCoursePolicy: true,
  coursePolicyBeforeHeldoutExecution: true,
  heldoutTransferBeforeContinuousRoute: true,
  continuousRouteBeforeTargetReview: true,
  missingPrerequisiteBlocksGate: true,
  dependencyGraphDoesNotClaimEvidence: true
};

const audit = {
  id: 'FINAL_GOAL_RELEASE_AUDIT_V1',
  status: allGatesPass ? 'goal_release_verified' : 'goal_release_blocked_by_evidence_gates',
  objective: '低基础学习者沿唯一嵌套主线完成系统训练，形成可慢速执行、可迁移、连续三街并经目标配置独立复核的能力。',
  completionRule: '只有R0—R8全部为pass，且运行时、真人试读、匹配参考、未见迁移、连续路线和目标对标均有直接证据，才允许标记goalCompletionVerified=true。',
  canonicalRoute,
  innerRoute,
  objectiveRequirements,
  objectiveEvidenceAudit,
  gates,
  summary: {
    totalGates: gates.length,
    passed: gates.filter(g => g.status === 'pass').length,
    blocked: gates.filter(g => g.status !== 'pass').length,
    runtimeObserved: gates.every(g => !g.runtimeRequired || g.runtimeObserved),
    learnerTrialObserved: gates.every(g => !g.learnerTrialRequired || g.learnerTrialObserved),
    goalCompletionVerified: allGatesPass
  },
  nextActions,
  releaseDependencyGraph,
  releaseDependencyRules,
  currentEvidence: {
    runtimeImplemented: runtime.currentEvidence.runtimeCanonicalRouteAttached,
    matchedReference: firstCourse.currentEvidence.a72ReferenceSolved,
    compilerImplemented: compiler.currentEvidence.compilerImplemented,
    beginnerTrial: crossAge.currentEvidence.crossAgeTrial,
    heldoutTransfer: transfer.currentEvidence?.heldoutTransfer ?? false,
    continuousThreeStreet: firstCourse.releaseDecision.continuousThreeStreetLesson,
    NL50Evidence: goal.currentEvidence.NL50Evidence
  },
  guards: {
    noDocsEqualRuntime: true,
    noLocalModelEqualsMatchedGTO: true,
    noCandidateSolverRunEqualsCourseRelease: true,
    noSingleScoreEqualsUnitMastery: true,
    noPaperEvidenceEqualsNL50: true
  }
};

fs.writeFileSync(path.join(dir, 'final-goal-release-audit.json'), JSON.stringify(audit, null, 2) + '\n');

const md = `# 195｜最终目标发布合同与证据闸门

\`\`\`json
{
  "parentDocument": "翻后教学系统_统一总纲.md",
  "routeNode": "final_goal_release_audit",
  "evidenceLevel": "machine_audited_release_contract_evidence_incomplete",
  "opensChildren": ["final-goal-release-audit.json", "goal-level-acceptance-matrix.json", "strategy-to-course-compiler-contract.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "goal_release_blocked_by_evidence_gates"
}
\`\`\`

这份合同把最终目标拆成九道不能跳过的闸门。它只允许用直接证据升级状态：文档、局部数学模型、求解器候选结果和解析后重答都不能替代运行时、真人试读、匹配参考、未见迁移、连续路线或目标级独立复核。

规范学习者路线是：

\`\`\`text
${canonicalRoute.join(' → ')} → 回放与单变量迁移
\`\`\`

## 发布闸门

| 闸门 | 要证明的结果 | 当前状态 | 当前阻塞 |
|---|---|---|---|
${gates.map(g => `| ${g.id} ${g.name} | ${g.requirement} | **${g.status}** | ${g.evidence.join('、')} |`).join('\n')}

只有 \`R0—R8\` 全部通过，才允许将 \`goalCompletionVerified\` 设为 \`true\`。当前汇总：通过 ${audit.summary.passed}/${audit.summary.totalGates}，阻塞 ${audit.summary.blocked}；运行时=${audit.summary.runtimeObserved}，真人试读=${audit.summary.learnerTrialObserved}，最终完成=${audit.summary.goalCompletionVerified}。

O1—O8的纸面依据、完成条件和本地合同文件也由 \`objectiveEvidenceAudit\` 自动核对；这项核对只证明目标清单没有漏项，不替代运行时、真人试读或目标级能力证据。

## 闸门依赖顺序

闸门不是一张可以随意勾选的清单。当前依赖关系是：

\`R0 → (R1, R2) → R3 → R4 → R5 → R6 → R7 → R8\`

其中 R1 与 R2 可以分别准备，但 R3 必须建立在完整内容身份之上，R4 必须建立在匹配参考之上，R5/R6 必须建立在可判分课包和运行时之上，R7 必须等未见迁移和后继闭合，R8 必须等前面全部证据。作者侧可以提前研究后续材料，但不能把后续材料的存在当成闸门已经通过。机器依赖见 \`releaseDependencyGraph\`。

## 现阶段必须保持的边界

- 求解器参考候选不等于课程政策；课程简化必须有差异报告和祖先重编译。
- 物理牌力、权益和金额校验不等于动作策略正确。
- 五组代表题或局部模型不等于35项全部掌握。
- 首遍跟练不等于未见迁移；未见迁移不等于连续三街。
- 求解器数据必须先经过视觉编译：局面、物理事实、动作前范围、选择、账本、动作后范围、真实后继和迁移不能被压成一张未经解释的颜色图。
- 任何纸面合同、题目数量或短期输赢都不能单独推出 NL50 准备度。

机器可读审计见 [final-goal-release-audit.json](final-goal-release-audit.json)。当前版本保持 \`goal_release_blocked_by_evidence_gates\`，下一步按 \`nextActions\` 的顺序关闭阻塞，不通过平均分或文档数量跳级。
`;
fs.writeFileSync(path.join(dir, '195_最终目标发布合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  id: audit.id,
  status: audit.status,
  passed: audit.summary.passed,
  blocked: audit.summary.blocked,
  goalCompletionVerified: audit.summary.goalCompletionVerified,
  next: nextActions.slice(0, 4).map(item => item.gate)
}, null, 2));
