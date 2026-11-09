import assert from 'node:assert/strict';
import { DECK, evaluateFive } from '../src/poker.js';
const combinations=(n,k)=>{let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v;};
const actual=Array(9).fill(0);
for(let a=0;a<48;a++)for(let b=a+1;b<49;b++)for(let c=b+1;c<50;c++)for(let d=c+1;d<51;d++)for(let e=d+1;e<52;e++) actual[evaluateFive([DECK[a],DECK[b],DECK[c],DECK[d],DECK[e]]).value[0]]++;
const expected=[
  (combinations(13,5)-10)*(4**5-4),
  13*combinations(4,2)*combinations(12,3)*4**3,
  combinations(13,2)*combinations(4,2)**2*11*4,
  13*combinations(4,3)*combinations(12,2)*4**2,
  10*(4**5-4),
  4*(combinations(13,5)-10),
  13*combinations(4,3)*12*combinations(4,2),
  13*12*4,
  10*4,
];
assert.deepEqual(actual,expected);
assert.equal(actual.reduce((a,b)=>a+b),combinations(52,5));
console.log('All '+combinations(52,5)+' five-card combinations match independent combinatorial counts.');
console.log(JSON.stringify(actual));
