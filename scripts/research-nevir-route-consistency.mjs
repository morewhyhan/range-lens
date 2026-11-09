import fs from 'node:fs';
import path from 'node:path';

const dir='research/nevir-system/';
const read=(name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const canonical=read('learner-goal-route-canonical.json');
const firstRun=read('first-run-route-contract.json');
const experience=read('first-pass-experience-map.json');
const mastery=read('parent-step-mastery-contract.json');
const singlePath=read('single-path-course-contract.json');
const fullManifest=read('full-curriculum-route-manifest.json');
const completeness=read('first-pass-completeness-contract.json');
const gates=read('first-pass-gates.json');
const learnerStandard=read('learner-standard-contract.json');
const storyboard=read('first-run-storyboard.json');
const representatives=read('first-pass-representative-units.json');
const fullNested=read('full-nested-learning-route.json');
const nested35=read('nested-35-route.json');
const aliases={one_transfer:'one_variable_transfer',one_field_transfer:'one_variable_transfer',one_variable_transfer:'one_variable_transfer'};
const routeIdAliases={p2_board_and_hand:'p2_board',p3_range_and_blockers:'p3_range',p7_close_and_transfer:'p7_close'};
const canonicalChecks=canonical.firstPassEvidence;
const normalize=(id)=>aliases[id]||id;
const normalizeList=(list)=>[...new Set(list.map(normalize))];
const checks={
  canonical:canonicalChecks,
  firstRun:normalizeList(firstRun.firstPassChecks),
  experience:normalizeList(experience.completionChecks.map(x=>x.id)),
  mastery:normalizeList(mastery.postRouteChecks),
  singlePath:normalizeList(singlePath.firstPassChecks.map(x=>typeof x==='string'?x:x.id)),
  gates:normalizeList(gates.postRouteChecks.map(x=>x.id)),
  learnerStandard:normalizeList(learnerStandard.firstPassEvidence),
  storyboard:normalizeList(storyboard.postRunChecks),
  representatives:normalizeList(representatives.structureChecksBeforeSecondPass)
};
const checkAudits=Object.fromEntries(Object.entries(checks).map(([source,ids])=>[source,{
  ids,
  missingCanonical:canonicalChecks.filter(id=>!ids.includes(id)),
  extra:ids.filter(id=>!canonicalChecks.includes(id)),
  exact:canonicalChecks.length===ids.length&&canonicalChecks.every((id,i)=>ids[i]===id)
}]));
const postflopChain=canonical.postflopSequentialChain;
const chainAudits={
  firstRun: firstRun.postflopSteps.map(x=>x.id),
  experience: experience.mainPath,
  mastery: mastery.steps.map(x=>x.id),
  canonical: postflopChain
};
const chainMatches=Object.fromEntries(Object.entries(chainAudits).map(([source,ids])=>[source,JSON.stringify(ids)===JSON.stringify(postflopChain)]));
const representativeSequenceMatch=JSON.stringify(fullNested.firstPass.sequence)===JSON.stringify(representatives.representatives.map(x=>x.unit));
const masterySequenceMatch=JSON.stringify(fullNested.masteryPass.sequence)===JSON.stringify(nested35.units.map(x=>x.id));
const innerRouteMatch=JSON.stringify(fullNested.innerRoute.map(x=>x.id))===JSON.stringify(postflopChain);
const nestedRouteMatches=representativeSequenceMatch&&masterySequenceMatch&&innerRouteMatch&&fullNested.masteryPass.noFlatHome===true;
const routeIdSources={
  mentalModel:read('first-pass-mental-model-contract.json').userRoute.map(x=>x.id),
  visibleRoute:read('learner-visible-route-crosswalk.json').innerRoute.map(x=>x.id),
  nestedRelease:read('nested-release-architecture-contract.json').canonicalInnerRoute,
  fullNested:fullNested.innerRoute.map(x=>x.id),
  runtimeCrosswalk:read('first-pass-runtime-output-crosswalk.json').route
};
const normalizeRouteId=(id)=>routeIdAliases[id]||id;
const normalizedRouteIds=Object.fromEntries(Object.entries(routeIdSources).map(([source,ids])=>[source,ids.map(normalizeRouteId)]));
const routeIdAudit=Object.fromEntries(Object.entries(normalizedRouteIds).map(([source,ids])=>[source,{ids,exact:JSON.stringify(ids)===JSON.stringify(postflopChain)}]));
const allRouteIdAliasesNormalized=Object.values(routeIdAudit).every(x=>x.exact);
const parentById=Object.fromEntries(canonical.outerRoute.filter(x=>x.parent).map(x=>[x.id,x.parent]));
const parentChecks={
  firstRun:Object.fromEntries(firstRun.postflopSteps.map(x=>[x.id,x.parent])),
  mastery:Object.fromEntries(mastery.steps.map(x=>[x.id,x.errorReturn])),
  canonical:parentById
};
const legacyVariants=Object.entries(checkAudits).filter(([source,a])=>!a.exact).map(([source,a])=>({source,missingCanonical:a.missingCanonical,extra:a.extra}));
const allPrimaryChecksExact=legacyVariants.length===0;
const output={
  id:'ROUTE_CONSISTENCY_AUDIT_V1',
  status:allPrimaryChecksExact?'route_consistency_audited_all_primary_checks_exact':'route_consistency_audited_legacy_check_aliases_pending_migration',
  canonicalSource:'learner-goal-route-canonical.json',
  canonicalOrder:{outer:canonical.outerRoute.map(x=>x.id),postflop:postflopChain},
  canonicalRules:{outerMembershipDoesNotDefineOrder:canonical.canonicality.outerMembershipDoesNotDefineOrder,nextChainDefinesOrder:canonical.canonicality.nextChainDefinesOrder},
  checkAudits,
  chainAudits,
  chainMatches,
  nestedRouteAudits:{
    representativeSequenceMatch,
    masterySequenceMatch,
    innerRouteMatch,
    noFlatHome:fullNested.masteryPass.noFlatHome,
    all35:fullNested.masteryPass.allUnitsCount===35
  },
  routeIdentifierAudit:{
    aliases:routeIdAliases,
    sources:routeIdAudit,
    allCanonicalAfterNormalization:allRouteIdAliasesNormalized
  },
  legacyVariants,
  knownInterpretation:{
    checkAliases:aliases,
    layerLocationIncludesNextInput:true,
    oneVariableTransferIncludesSlowExecution:true,
    oldThreeCheckContractsAreNotFullMasteryEvidence:true,
    childrenArraysAreAvailabilitySetsNotOrder:true
  },
  migrationRules:{
    runtimeReadsCanonicalRouteOnly:true,
    runtimeMayReadLegacyForDisplay:false,
    legacyContractCanPassOnlyAfterAliasNormalization:true,
    missingErrorRecoveryBlocksStructureRelease:true,
    mismatchedPostflopChainBlocksRuntimeRelease:true,
    mismatchedNestedRouteBlocksRuntimeRelease:true
  },
  currentEvidence:{
    canonicalRouteExists:true,
    canonicalChainMatchesExperienceMap:chainMatches.experience,
    canonicalChainMatchesFirstRunContract:chainMatches.firstRun,
    canonicalChainMatchesMasteryContract:chainMatches.mastery,
    nestedRouteMatches,
    allRouteIdentifiersCanonicalAfterNormalization:allRouteIdAliasesNormalized,
    innerRouteMatches:innerRouteMatch,
    allLegacyCheckListsExact:allPrimaryChecksExact,
    runtimeImplemented:false,
    adultBeginnerTrial:false,
    NL50Evidence:false
  },
  nextWork:allPrimaryChecksExact&&allRouteIdAliasesNormalized?[
    '实现运行时只读取canonical next链并为每个子层保存returnTo与statePayload',
    '用低基础成人试读验证error_recovery和one_variable_transfer是否真的可观察'
  ]:[
    '将旧合同的三项检查在机器层统一映射到canonical four-check vocabulary',
    '实现运行时只读取canonical next链并为每个子层保存returnTo与statePayload',
    '用低基础成人试读验证error_recovery和one_variable_transfer是否真的可观察'
  ]
};
fs.writeFileSync(path.join(dir,'route-consistency-audit.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,status:output.status,chainMatches,nestedRouteMatches,legacyVariants:legacyVariants.length}));
