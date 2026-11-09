import fs from 'node:fs';
import crypto from 'node:crypto';
const source='research/nevir-system/reference-request-btn-bb-a72.json';
const original=JSON.parse(fs.readFileSync(source,'utf8'));
const payload={
 id:'btn-bb-a72-finite-tree-v1',
 engineRevision:original.requestedEngineCandidate.revision,
 compatibilityFlag:'-A dangerous_implicit_autorefs',
 sourceRequest:source,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
 context:original.context,ranges:original.ranges,
 tree:{flopBet:'33%',turnBet:'75%',riverBet:'75%',raises:'a',rakeRate:0,rakeCap:0,addAllinThreshold:0,forceAllinThreshold:0,mergingThreshold:0},
 unitsPerBB:100,startingPot:550,effectiveStack:9750,
 targetExploitabilityUnits:0.55,maxIterations:2000,
 scope:'用户简化翻前范围；BTN开池2.5BB、BB跟注；零抽水；每街一个下注尺度、面对下注允许弃牌/跟注/全下加注。有限动作树训练参考，不等于全尺度NL50。',
};
payload.inputFingerprint=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
fs.mkdirSync('research/postflop-pilot',{recursive:true});
const target='research/postflop-pilot/request.json';
if(fs.existsSync('research/postflop-pilot/strategy.bin')&&fs.existsSync(target)&&JSON.parse(fs.readFileSync(target)).inputFingerprint!==payload.inputFingerprint)throw new Error('已有不同配置的策略，不能覆盖');
fs.writeFileSync(target,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({fingerprint:payload.inputFingerprint,tree:payload.tree,sourceSHA256:payload.sourceSHA256}));
