import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const contract = read('target-standard-sequential-teaching-and-nl50-closure-contract.json');
const unitBridge = read('unit-canonical-route-bridge.json');
const representatives = read('first-pass-representative-units.json');
const principleCoverage = read('first-pass-principle-coverage.json');
const canonicalRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];

assert.equal(contract.id, 'TARGET_STANDARD_SEQUENTIAL_TEACHING_AND_NL50_CLOSURE_CONTRACT_V1');
assert.equal(contract.status, 'paper_goal_standard_compiled_runtime_reference_and_learner_evidence_missing');
assert.deepEqual(contract.canonicalRoute, canonicalRoute);
assert.equal(contract.canonicalUserExperience.length, canonicalRoute.length);
assert.deepEqual(contract.canonicalUserExperience.map(row => row.id), canonicalRoute);
for (const row of contract.canonicalUserExperience) {
  assert.ok(row.job && row.userOutput && row.plainQuestion && row.whyNow && row.centerVisual && row.primaryAction && row.answerShape && row.next);
}
assert.equal(contract.fullCourseReleaseSchedule.length, 6);
assert.deepEqual(contract.fullCourseReleaseSchedule[0].visibleUnits, ['1.5','2.1','3.1','4.5','5.7']);
assert.equal(contract.fullCourseReleaseSchedule[1].visibleUnits, 'all35');
assert.equal(contract.fullCourseReleaseSchedule[5].visibleUnits, 'successor_closed_only');
assert.equal(Object.keys(contract.unitGroupParents).length, 5);
assert.deepEqual(contract.unitGroupParents, unitBridge.groupParent);
assert.equal(unitBridge.rows.length, 35);
assert.deepEqual(contract.fullCourseReleaseSchedule[0].visibleUnits, representatives.representatives.map(x => x.unit));
assert.equal(contract.unitGroupParents['compare.unopened'], 'p4');
assert.equal(contract.unitGroupParents['update.card'], 'p6');
assert.equal(contract.schedulerRules.oneChildAtATime, true);
assert.equal(contract.schedulerRules.noFlat35Home, true);
assert.equal(contract.schedulerRules.poolRatioChangesSamplingOnly, true);
assert.equal(contract.schedulerRules.emptyPoolIsUnavailable, true);
assert.equal(contract.schedulerRules.missingSuccessorBlocksContinuousStage, true);
assert.equal(contract.visualExperienceContract.screenRegions.length, 4);
assert.equal(contract.visualExperienceContract.oneCentralVisualPerStop, true);
assert.equal(contract.visualExperienceContract.animationStopsBeforeQuestion, true);
assert.equal(contract.visualExperienceContract.same13x13CoordinateBeforeAfter, true);
assert.equal(contract.visualExperienceContract.sameDenominatorBeforeAfter, true);
assert.equal(contract.visualExperienceContract.physicalImpossibleDistinctFromActionFiltered, true);
assert.equal(contract.visualExperienceContract.unknownDistinctFromZero, true);
assert.equal(contract.visualExperienceContract.colorIsNotSoleSemanticChannel, true);
assert.equal(contract.visualExperienceContract.parentSnapshotRestoredAfterChildClose, true);
assert.deepEqual(contract.principleCardContract.cardsPerUnit, ['baseCase','contrastCase','transferCase']);
assert.equal(contract.principleCardContract.contrastExactlyOneChangedField, true);
assert.equal(contract.principleCardContract.allOtherInputsHeld, true);
assert.equal(contract.principleCardContract.requiredCardOutputs.length, 8);
assert.equal(contract.principleCardContract.technicalTermsAreNotFirstNavigation, true);
assert.equal(contract.principleCardContract.physicalRemovalDoesNotEqualActionFilter, true);
assert.equal(contract.principleCardContract.missingEvidencePublishesFactDemoOrStopOnly, true);
assert.equal(contract.evidenceRubric.dimensions.length, 7);
assert.equal(contract.evidenceRubric.noCompositeScorePromotion, true);
assert.equal(contract.evidenceRubric.firstPassMaximumClaim, 'routeComprehension');
assert.equal(contract.evidenceRubric.missingReferenceBlocks, 'slowSingleStep');
assert.equal(contract.evidenceRubric.missingSuccessorBlocks, 'continuousThreeStreet');
assert.equal(contract.evidenceRubric.missingExternalBenchmarkBlocks, 'NL50Discussion');
assert.equal(contract.evidenceRubric.speedIsNotGate, true);
assert.equal(contract.evidenceRubric.ageLabelIsNotEvidence, true);
assert.equal(contract.evidenceRubric.shortTermOutcomeIsNotDecisionGrade, true);
assert.equal(contract.evidenceRubric.failureReturnsToCorrespondingParent, true);
assert.equal(contract.principleCoverageContract.requiredCount, principleCoverage.principles.length);
assert.deepEqual(contract.principleCoverageContract.requiredIds, principleCoverage.principles.map(x => x.id));
assert.equal(contract.principleCoverageContract.firstPassMustIntroduceEveryPrinciple, true);
assert.equal(contract.principleCoverageContract.recheckMustReturnToSameParent, true);
assert.equal(contract.principleCoverageContract.principleIsNotFlatMenu, true);
assert.equal(contract.principleCoverageContract.missingPrincipleBlocksFirstPassRelease, true);
assert.equal(contract.languageContract.defaultFirstPassLayer, 'plain_language_plus_practice_language');
assert.equal(contract.languageContract.forbiddenPrimaryTerms.length, 10);
assert.equal(contract.languageContract.oneQuestionPerStep, true);
assert.equal(contract.languageContract.onePrimaryActionPerStep, true);
assert.equal(contract.languageContract.plainLanguageBeforeTechnicalAlias, true);
assert.equal(contract.languageContract.technicalTermCannotBeOnlyNavigationCue, true);
assert.equal(contract.languageContract.feedbackNamesLayerAndReturnPoint, true);
assert.equal(contract.languageContract.physicalRemovalDistinctFromActionFilter, true);
assert.equal(contract.languageContract.handStrengthDistinctFromEquityAndAction, true);
assert.equal(contract.languageContract.courseRuleDistinctFromReferencePolicy, true);
assert.equal(contract.languageContract.nonzeroLowerWeightIsNotImpossible, true);
assert.equal(contract.visibleStopContract.length, 10);
assert.equal(contract.releaseStages.length, 4);
assert.equal(contract.routeInvariant.oneVisibleParentAtATime, true);
assert.equal(contract.routeInvariant.childOpensOnlyInsideParent, true);
assert.equal(contract.routeInvariant.childReturnsToSameParentSnapshot, true);
assert.equal(contract.routeInvariant.noFlat35HomeMenu, true);
assert.equal(contract.routeInvariant.missingEvidenceCreatesStopCard, true);
assert.equal(contract.evidenceRules.firstAnswerBeforeHelp, true);
assert.equal(contract.evidenceRules.unknownIsWrongButSeparate, true);
assert.equal(contract.evidenceRules.paperContractDoesNotEqualNL50, true);
assert.equal(contract.strategyPackageRequiredFields.includes('rangeBefore'), true);
assert.equal(contract.strategyPackageRequiredFields.includes('rangeAfter'), true);
assert.equal(contract.strategyPackageRequiredFields.includes('successors'), true);
assert.equal(contract.targetLevelPrerequisites.length, 10);
assert.equal(contract.currentEvidence.paperStandardCompiled, true);
assert.equal(contract.currentEvidence.runtimeNestedRoute, false);
assert.equal(contract.currentEvidence.NL50Evidence, false);

console.log(JSON.stringify({
  ok: true,
  id: contract.id,
  status: contract.status,
  canonicalStops: contract.canonicalUserExperience.length,
  releaseStages: contract.releaseStages.length,
  strategyFields: contract.strategyPackageRequiredFields.length,
  targetPrerequisites: contract.targetLevelPrerequisites.length,
  runtimeNestedRoute: contract.currentEvidence.runtimeNestedRoute,
  nl50Evidence: contract.currentEvidence.NL50Evidence
}, null, 2));
