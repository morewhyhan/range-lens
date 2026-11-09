import fs from 'node:fs';
import crypto from 'node:crypto';
const file='research/nevir-system/reference-request-sb-bb-qqq.json',source=JSON.parse(fs.readFileSync(file));
const payload={id:'sb-bb-a72-finite-tree-v1',engineRevision:source.engineRevision,compatibilityFlag:'-A dangerous_implicit_autorefs',sourceRequest:file,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),context:{...source.context,flop:['As','7h','2d']},ranges:source.ranges,tree:{flopBet:'33%',turnBet:'75%',riverBet:'75%',raises:'a',rakeRate:0,rakeCap:0,addAllinThreshold:0,forceAllinThreshold:0,mergingThreshold:0},unitsPerBB:100,startingPot:600,effectiveStack:9700,targetExploitabilityUnits:.6,maxIterations:2000,scope:'用户简化翻前范围；SB开池3BB、BB跟注；A72普通牌面；零抽水；每街一个下注尺度、面对下注可弃牌/跟注/全下加注。有限动作树训练参考。'};
payload.inputFingerprint=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
fs.mkdirSync('research/postflop-pilot-sb',{recursive:true});const target='research/postflop-pilot-sb/request.json';
if(fs.existsSync('research/postflop-pilot-sb/strategy.bin'))throw new Error('已有策略，不能覆盖配置');
fs.writeFileSync(target,JSON.stringify(payload,null,2)+'\n');console.log(payload.inputFingerprint);
