import fs from 'node:fs';
import path from 'node:path';

const root = 'research/nevir-system';
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));

const readiness = read('learning-unit-readiness.json');
const bridge = read('unit-architecture-bridge.json');
const identity = read('unit-identity-normalization-candidate.json');
const release = read('unit-learner-release-gates.json');
const audit = read('unit-execution-field-audit.json');
const principles = read('principle-loop-unit-crosswalk.json');

const byId = rows => new Map(rows.map(row => [row.unitId ?? row.id, row]));
const maps = {
  bridge: byId(bridge.rows),
  identity: byId(identity.rows),
  release: byId(release.unitRows),
  audit: byId(audit.units),
  principles: byId(principles.rows),
  readiness: byId(readiness.units)
};

const ids = readiness.units.map(row => row.id);
const expected = [...ids].sort();
for (const [name, map] of Object.entries(maps)) {
  const actual = [...map.keys()].sort();
  if (actual.length !== expected.length || actual.some((id, i) => id !== expected[i])) {
    throw new Error(`${name} does not cover exactly the 35 readiness units`);
  }
}

const canonicalRequired = [
  'unitId', 'parentFrame', 'street', 'role', 'actionState', 'sourceIdentity',
  'factInputs', 'coursePolicy', 'referencePolicy', 'rangeBefore', 'rangeAfter',
  'legalSuccessors', 'question', 'explanation', 'errorReturn', 'transferVariant',
  'releaseStatus'
];

const rows = readiness.units.map((base, index) => {
  const bridgeRow = maps.bridge.get(base.id);
  const identityRow = maps.identity.get(base.id);
  const releaseRow = maps.release.get(base.id);
  const auditRow = maps.audit.get(base.id);
  const principleRow = maps.principles.get(base.id);
  const fieldPresence = auditRow.fields ?? {};
  const missingAuditFields = Object.entries(fieldPresence)
    .filter(([, state]) => state !== 'present')
    .map(([field]) => field);
  const missingIdentityFields = identityRow.missingIdentityFields ?? [];
  const blockers = [];
  if (missingIdentityFields.length) blockers.push({kind: 'identity', fields: missingIdentityFields});
  if (missingAuditFields.length) blockers.push({kind: 'canonical_fields', fields: missingAuditFields});
  if (!base.fullMatchingTargetPolicyVerified) blockers.push({kind: 'matched_reference', reason: 'fullMatchingTargetPolicyVerified=false'});
  if (!releaseRow.currentEvidence?.runtime) blockers.push({kind: 'runtime', reason: 'unit learner runtime not attached'});
  if (!releaseRow.currentEvidence?.learnerTrial) blockers.push({kind: 'learner_trial', reason: 'learner trial not administered'});
  if (principleRow.cardCompletion && Object.values(principleRow.cardCompletion).some(value => value !== true)) {
    blockers.push({kind: 'principle_cards', fields: Object.entries(principleRow.cardCompletion).filter(([, value]) => value !== true).map(([field]) => field)});
  }
  const exactStrategyReady = Boolean(
    base.fullMatchingTargetPolicyVerified &&
    identityRow.strategyReady &&
    identityRow.coursePolicyReady &&
    identityRow.referencePolicyReady &&
    missingAuditFields.length === 0
  );
  return {
    sequence: index + 1,
    unitId: base.id,
    label: base.label,
    route: {
      parentFrame: bridgeRow.parentFrame,
      returnTo: bridgeRow.returnTo,
      groupId: bridgeRow.groupId,
      groupOrder: bridgeRow.groupOrder,
      childOrder: bridgeRow.childOrder,
      routeStop: identityRow.routeStop,
      primaryArchitectureNode: bridgeRow.primaryArchitectureNode,
      prerequisiteArchitectureNodes: bridgeRow.prerequisiteArchitectureNodes,
      nextArchitectureNode: bridgeRow.nextArchitectureNode,
      flatHomeVisible: bridgeRow.flatHomeVisible,
      opensOnlyFromParent: bridgeRow.opensOnlyFromParent
    },
    inputIdentity: {
      sourceEvidence: base.evidence,
      sourcePointer: base.pointer,
      localMaterial: base.localMaterial,
      identityCandidate: identityRow.identityCandidate,
      missingIdentityFields,
      sourceScopedStatus: identityRow.status
    },
    learningContract: {
      prerequisite: base.prerequisite,
      firstOperation: base.firstOperation,
      question: bridgeRow.teachingQuestion,
      requiredOutputs: bridgeRow.requiredOutputs,
      errorReturn: bridgeRow.errorReturn,
      missingEvidenceAction: bridgeRow.missingEvidenceAction,
      transfer: principleRow.transferCase,
      principleIds: principleRow.principles,
      primaryPrinciple: principleRow.primaryPrinciple
    },
    compilerFields: {
      canonicalRequired,
      presence: fieldPresence,
      missing: missingAuditFields,
      sourceScopedGameFrameCandidate: auditRow.sourceScopedIdentity?.gameFrameCandidate ?? null
    },
    release: {
      currentEvidence: releaseRow.currentEvidence,
      releaseStages: releaseRow.releaseStages,
      blockingEvidence: releaseRow.blockingEvidence,
      exactStrategyReady,
      status: exactStrategyReady ? 'target_reference_ready_candidate' : 'not_released',
      blockers
    },
    evidence: {
      gap: base.gap,
      referenceIdentity: bridgeRow.evidenceIdentity,
      cardCompletion: principleRow.cardCompletion,
      fullMatchingTargetPolicyVerified: base.fullMatchingTargetPolicyVerified,
      learnerTrialVerified: base.learnerTrialVerified
    }
  };
});

const counts = {
  units: rows.length,
  identityComplete: rows.filter(row => row.inputIdentity.missingIdentityFields.length === 0).length,
  identityPartial: rows.filter(row => row.inputIdentity.missingIdentityFields.length > 0).length,
  canonicalFieldComplete: rows.filter(row => row.compilerFields.missing.length === 0).length,
  canonicalFieldIncomplete: rows.filter(row => row.compilerFields.missing.length > 0).length,
  exactStrategyReadyCandidate: rows.filter(row => row.release.exactStrategyReady).length,
  runtimeAttached: rows.filter(row => row.release.currentEvidence.runtime === true).length,
  learnerTrialVerified: rows.filter(row => row.release.currentEvidence.learnerTrial === true).length,
  principleBaseComplete: rows.filter(row => row.evidence.cardCompletion?.base === true).length,
  principleContrastComplete: rows.filter(row => row.evidence.cardCompletion?.contrast === true).length,
  principleTransferComplete: rows.filter(row => row.evidence.cardCompletion?.transfer === true).length
};

const output = {
  id: 'UNIT_COURSE_MANIFEST_V1',
  status: 'joined_manifest_compiled_not_released',
  purpose: '把35项单元的路线位置、来源身份、事实字段、原理卡和学习者释放闸门合并为一份保守清单；任何缺失均保留为阻断，不从邻近单元推断。',
  sourceDocuments: [
    'learning-unit-readiness.json',
    'unit-architecture-bridge.json',
    'unit-identity-normalization-candidate.json',
    'unit-learner-release-gates.json',
    'unit-execution-field-audit.json',
    'principle-loop-unit-crosswalk.json'
  ],
  canonicalRequiredFields: canonicalRequired,
  derivationRules: {
    exactStrategyReadyRequires: [
      'fullMatchingTargetPolicyVerified=true',
      'identity.strategyReady=true',
      'identity.coursePolicyReady=true',
      'identity.referencePolicyReady=true',
      'allCanonicalFieldsPresent=true'
    ],
    missingIdentityIsNotInferred: true,
    missingStrategyIsNotConvertedToCourseRule: true,
    missingSuccessorStopsContinuousPractice: true,
    learnerTrialIsSeparateFromPaperContract: true,
    aggregateScoreCannotPromoteUnit: true
  },
  counts,
  rows,
  currentEvidence: {
    manifestCompiled: true,
    all35CanonicalRecords: false,
    all35ReferenceReady: false,
    runtimeAttached: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(root, 'unit-course-manifest.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ok: true, id: output.id, status: output.status, counts}));
