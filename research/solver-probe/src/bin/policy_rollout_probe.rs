// Author-side policy sampler: never uses the engine's equity or terminal payoff to settle a hand.
// Raw traces are independently replayed in JavaScript. Not a best-response or accuracy certificate.
use postflop_solver::*;
use serde_json::{json,Value};
use std::{fs,io::{BufWriter,Write},path::PathBuf,time::Instant};
#[repr(C)]struct Mem{len:u32,load:u32,data:[u64;7]}
#[link(name="kernel32")]extern "system"{fn GlobalMemoryStatusEx(m:*mut Mem)->i32;}
fn free()->u64{let mut m=Mem{len:std::mem::size_of::<Mem>()as u32,load:0,data:[0;7]};assert_ne!(unsafe{GlobalMemoryStatusEx(&mut m)},0);m.data[1]}
struct Rng(u64);
impl Rng{
 fn next(&mut self)->u64{self.0=self.0.wrapping_add(0x9e3779b97f4a7c15);let mut z=self.0;z=(z^(z>>30)).wrapping_mul(0xbf58476d1ce4e5b9);z=(z^(z>>27)).wrapping_mul(0x94d049bb133111eb);z^(z>>31)}
 fn bounded(&mut self,n:u64)->u64{assert!(n>0);let threshold=n.wrapping_neg()%n;loop{let x=self.next();if x>=threshold{return x%n;}}}
 fn unit(&mut self)->f64{(self.next()>>11)as f64/9007199254740992.0}
}
fn name(id:u8)->String{format!("{}{}",b"23456789TJQKA"[(id/4)as usize]as char,b"cdhs"[(id%4)as usize]as char)}
fn mask(h:(u8,u8))->u64{(1<<h.0)|(1<<h.1)}
fn pick(r:&mut Rng,weights:&[u32],holes:&[(u8,u8)],excluded:u64)->usize{
 let total:u64=weights.iter().zip(holes).filter(|(_,h)|mask(**h)&excluded==0).map(|(w,_)|*w as u64).sum();let mut n=r.bounded(total);
 for(i,(w,h))in weights.iter().zip(holes).enumerate(){if mask(*h)&excluded!=0{continue;}if n<*w as u64{return i;}n-=*w as u64;}unreachable!()
}
fn fixed_index(g:&PostFlopGame,seat:usize,h:&str)->usize{let a=card_from_str(&h[..2]).unwrap();let b=card_from_str(&h[2..]).unwrap();let pair=(a.min(b),a.max(b));g.private_cards(seat).iter().position(|p|*p==pair).unwrap()}
fn small_nodes(g:&mut PostFlopGame,h:Vec<usize>,out:&mut Vec<Value>){
 g.apply_history(&h);let terminal=g.is_terminal_node();assert!(!g.is_chance_node());let actor=if terminal{None}else{Some(g.current_player())};let actions=g.available_actions();
 out.push(json!({"historyIndices":h,"actor":actor,"terminal":terminal,"actions":actions.iter().map(|a|format!("{a:?}")).collect::<Vec<_>>(),"strategy":actor.map(|_|g.strategy())}));
 if !terminal{for i in 0..actions.len(){let mut next=h.clone();next.push(i);small_nodes(g,next,out);}}
}
fn main(){
 let started=Instant::now();let calibration=std::env::args().any(|a|a=="--calibration");let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");
 let stem=if calibration{"policy-rollout-calibration"}else{"qqq-policy-rollouts-v2"};
 let file=dir.join(format!("{stem}.jsonl"));let partial=dir.join(format!("{stem}.partial"));assert!(!file.exists()&&!partial.exists(),"Never overwrite an existing sampling artifact");
 let available=free();let budget=((available as f64*0.6)as u64).min(available.saturating_sub(2*1024_u64.pow(3)));
 if !calibration{let state:Value=serde_json::from_str(&fs::read_to_string(dir.join("sb-bb-qqq-run-state-v2.json")).unwrap()).unwrap();assert_eq!(state["status"],"finished_candidate_saved");let v:Value=serde_json::from_str(&fs::read_to_string(dir.join("sb-bb-qqq-reference-verification-v2.json")).unwrap()).unwrap();assert_eq!(v["ok"],true);assert!(2597630848+512*1024_u64.pow(2)<budget,"Resource budget insufficient");}
 let source=if calibration{"storage-roundtrip-calibration.bin"}else{"sb-bb-qqq-reference-v2.bin"};
 let(mut g,memo)=load_data_from_file::<PostFlopGame,_>(dir.join(source),Some(budget)).unwrap();assert_eq!(g.tree_config().rake_rate,0.0);assert_eq!(g.storage_mode(),BoardState::River);
 let pot=g.tree_config().starting_pot;let stack=g.tree_config().effective_stack;
 let holes=[g.private_cards(0).to_vec(),g.private_cards(1).to_vec()];
 let weights=[g.weights(0).iter().map(|w|{let n=*w*2.0;assert_eq!(n,n.round());n as u32}).collect::<Vec<_>>(),g.weights(1).iter().map(|w|{let n=*w*2.0;assert_eq!(n,n.round());n as u32}).collect::<Vec<_>>()];
 let initial_board=g.current_board();let mut exact_nodes=vec![];if calibration{small_nodes(&mut g,vec![],&mut exact_nodes);g.back_to_root();}
 g.cache_normalized_weights();let ev=[g.expected_values(0),g.expected_values(1)];let joint=g.normalized_weights(0);let total: f64=joint.iter().map(|w|*w as f64).sum();
 let joint_ev=joint.iter().zip(&ev[0]).map(|(w,v)|*w as f64**v as f64).sum::<f64>()/total;
 let mut cases=vec![("joint".to_owned(),None,joint_ev)];
 let fixed=if calibration{vec![(0,"AsAh"),(0,"QsQh"),(1,"QcQd"),(1,"AsQc")]}else{vec![(0,"AsKd"),(0,"2s2h"),(1,"7c6c")]};
 for(seat,h)in fixed{let index=fixed_index(&g,seat,h);assert!(weights[seat][index]>0);cases.push((format!("known_{}_{}",seat,h),Some((seat,index)),ev[seat][index]as f64));}
 let trials=if calibration{5000}else{20000};let mut writer=BufWriter::new(fs::File::create(&partial).unwrap());let mut max_sum_error=0.0_f64;let mut count=0;let mut descriptions=vec![];
 for(case_id,fixed,expected)in cases{
  let seed=0x4e455649525f4754_u64.wrapping_add(descriptions.len()as u64);let mut rng=Rng(seed);
  descriptions.push(json!({"id":case_id,"trials":trials,"fixed":fixed,"comparePlayer":fixed.map_or(0,|x|x.0),"expectedEngineUnits":expected,"seedHex":format!("{seed:016x}")}));
  for trial in 0..trials{
   if trial%1000==0{assert!(free()>2*1024_u64.pow(3),"Free-memory protection interrupted sampling");}
   let indices=if let Some((seat,index))=fixed{let other=pick(&mut rng,&weights[seat^1],&holes[seat^1],mask(holes[seat][index]));if seat==0{[index,other]}else{[other,index]}}
    else{loop{let a=pick(&mut rng,&weights[0],&holes[0],0);let b=pick(&mut rng,&weights[1],&holes[1],0);if mask(holes[0][a])&mask(holes[1][b])==0{break[a,b];}}};
   let dealt=[holes[0][indices[0]],holes[1][indices[1]]];let mut board=initial_board.clone();let mut dead=mask(dealt[0])|mask(dealt[1]);for c in &board{dead|=1<<c;}
   let mut paid=[0_i32,0];let mut street=[0_i32,0];let mut folded=None;let mut events=vec![];g.back_to_root();
   for _ in 0..128{
    if g.is_terminal_node(){break;}
    if g.is_chance_node(){let remaining=(0..52_u8).filter(|c|dead&(1<<c)==0).collect::<Vec<_>>();let c=remaining[rng.bounded(remaining.len()as u64)as usize];assert!(g.possible_cards()&(1<<c)!=0);g.play(c as usize);dead|=1<<c;board.push(c);street=[0,0];events.push(json!({"deal":name(c)}));continue;}
    let actor=g.current_player();assert!(g.weights(actor)[indices[actor]]>0.0);let actions=g.available_actions();let strategy=g.strategy();let len=holes[actor].len();let probs=(0..actions.len()).map(|a|strategy[a*len+indices[actor]]as f64).collect::<Vec<_>>();
    let sum:f64=probs.iter().sum();assert!(probs.iter().all(|p|p.is_finite()&&*p>=0.0));max_sum_error=max_sum_error.max((sum-1.0).abs());assert!((sum-1.0).abs()<0.00001);
    let mut draw=rng.unit()*sum;let mut choice=actions.len()-1;for(i,p)in probs.iter().enumerate(){if draw<*p{choice=i;break;}draw-=p;}
    match actions[choice]{Action::Fold=>{folded=Some(actor);},Action::Check=>assert_eq!(street[0],street[1]),Action::Call=>{let add=street[actor^1]-street[actor];assert!(add>0);paid[actor]+=add;street[actor]+=add;},Action::Bet(to)|Action::Raise(to)|Action::AllIn(to)=>{let add=to-street[actor];assert!(add>0);paid[actor]+=add;street[actor]=to;},_=>panic!("Unexpected action")}
    events.push(json!({"actor":actor,"action":format!("{:?}",actions[choice])}));g.play(choice);assert_eq!(g.total_bet_amount(),paid);assert!(paid.iter().all(|p|*p>=0&&*p<=stack));
   }
   assert!(g.is_terminal_node(),"Route did not terminate");
   if folded.is_none(){assert_eq!(paid[0],paid[1]);if board.len()<5{assert_eq!(paid,[stack,stack]);}
    while board.len()<5{let remaining=(0..52_u8).filter(|c|dead&(1<<c)==0).collect::<Vec<_>>();let c=remaining[rng.bounded(remaining.len()as u64)as usize];dead|=1<<c;board.push(c);events.push(json!({"runout":name(c)}));}}
   let row=json!({"case":case_id,"trial":trial,"hole":[[name(dealt[0].0),name(dealt[0].1)],[name(dealt[1].0),name(dealt[1].1)]],"board":board.iter().map(|c|name(*c)).collect::<Vec<_>>(),"events":events,"paid":paid,"folded":folded});
   serde_json::to_writer(&mut writer,&row).unwrap();writer.write_all(b"\n").unwrap();count+=1;
  }
  println!("{}",json!({"status":"sampled_case","case":case_id,"totalTraces":count,"elapsedSeconds":started.elapsed().as_secs_f64()}));
 }
 writer.flush().unwrap();drop(writer);fs::rename(partial,&file).unwrap();
 let metadata=json!({"status":"raw_policy_samples_completed_not_independent_settlement_verified","calibration":calibration,"referenceFile":source,"memo":memo,"initialBoard":initial_board.into_iter().map(name).collect::<Vec<_>>(),"startingPotUnits":pot,"effectiveStackUnits":stack,"unitsPerBB":100,
 "orderedHands":[holes_to_strings(&holes[0]).unwrap(),holes_to_strings(&holes[1]).unwrap()],"rootWeightHalfUnits":weights,"cases":descriptions,"samples":count,"maxProbabilitySumError":max_sum_error,"elapsedSeconds":started.elapsed().as_secs_f64(),"rawFile":format!("{stem}.jsonl"),"calibrationNodes":exact_nodes,
 "sampling":"SplitMix64 fixed seeds; weighted independent roots with collision rejection for joint, or weighted opponent conditional on fixed hand; uniform physical future cards excluding both hands; policy uses actor own hand only.","unseenLearnerTrial":false,"bestResponseComputed":false,"engineQualityCertified":false,"appChanged":false});
 fs::write(dir.join(format!("{stem}-metadata.json")),serde_json::to_string_pretty(&metadata).unwrap()).unwrap();println!("{}",json!({"ok":true,"samples":count,"independentSettlementVerified":false}));
}
