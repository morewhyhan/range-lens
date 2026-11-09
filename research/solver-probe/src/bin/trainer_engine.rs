use postflop_solver::*;
use serde_json::{json,Value};
use std::{fs,io::{self,BufRead,Write},path::Path,time::Instant};
#[repr(C)] struct Mem{len:u32,load:u32,data:[u64;7]}
#[link(name="kernel32")] extern "system" {fn GlobalMemoryStatusEx(m:*mut Mem)->i32;}
fn free()->u64{let mut m=Mem{len:std::mem::size_of::<Mem>()as u32,load:0,data:[0;7]};assert_ne!(unsafe{GlobalMemoryStatusEx(&mut m)},0);m.data[1]}
fn budget()->u64{let f=free();((f as f64*0.6)as u64).min(f.saturating_sub(2*1024_u64.pow(3)))}
fn game(req:&Value)->PostFlopGame{
 let sizes=|name:&str|BetSizeOptions::try_from((req["tree"][name].as_str().unwrap(),req["tree"]["raises"].as_str().unwrap())).unwrap();
 let f=sizes("flopBet");let t=sizes("turnBet");let r=sizes("riverBet");
 let tree=TreeConfig{initial_state:BoardState::Flop,starting_pot:req["startingPot"].as_i64().unwrap()as i32,effective_stack:req["effectiveStack"].as_i64().unwrap()as i32,rake_rate:0.0,rake_cap:0.0,flop_bet_sizes:[f.clone(),f],turn_bet_sizes:[t.clone(),t],river_bet_sizes:[r.clone(),r],turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0};
 let board=req["context"]["flop"].as_array().unwrap().iter().map(|v|v.as_str().unwrap()).collect::<String>();
 PostFlopGame::with_config(CardConfig{range:[req["ranges"]["oop"]["rangeStringDraft"].as_str().unwrap().parse().unwrap(),req["ranges"]["ip"]["rangeStringDraft"].as_str().unwrap().parse().unwrap()],flop:flop_from_str(&board).unwrap(),turn:NOT_DEALT,river:NOT_DEALT},ActionTree::new(tree).unwrap()).unwrap()
}
fn snapshot(g:&mut PostFlopGame)->Value{
 g.cache_normalized_weights();let terminal=g.is_terminal_node();let chance=g.is_chance_node();let actor=if terminal||chance{None}else{Some(g.current_player())};
 let history=g.history().to_vec();let cards=if chance{(0..52u8).filter(|c|g.possible_cards()&(1u64<<c)!=0).map(|c|json!({"id":c,"card":card_to_string(c).unwrap()})).collect::<Vec<_>>()}else{vec![]};
 let weights=[g.normalized_weights(0).to_vec(),g.normalized_weights(1).to_vec()];let mass:f32=weights[0].iter().sum();
 json!({"id":format!("n-{}",history.iter().map(|x|x.to_string()).collect::<Vec<_>>().join("-")),"historyIndices":history,"board":g.current_board().iter().map(|c|card_to_string(*c).unwrap()).collect::<Vec<_>>(),"actor":actor,"terminal":terminal,"chance":chance,"actions":if chance{vec![]}else{g.available_actions().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>()},"chanceCards":cards,"rawWeights":[g.weights(0),g.weights(1)],"compatibleMassWeights":weights,"jointReachMass":mass,"orderedHands":[holes_to_strings(g.private_cards(0)).unwrap(),holes_to_strings(g.private_cards(1)).unwrap()],"strategyActionMajor":actor.map(|_|g.strategy()),"actionEV":if mass>0.0{actor.map(|a|g.expected_values_detail(a))}else{None},"terminalEV":if terminal&&mass>0.0{Some([g.expected_values(0),g.expected_values(1)])}else{None},"totalBetAmount":g.total_bet_amount()})
}
fn seek(g:&mut PostFlopGame,history:&[usize])->Result<(),String>{
 if history.len()>512{return Err("history too long".into())}g.back_to_root();
 for &a in history{if g.is_terminal_node(){return Err("terminal history".into())}if g.is_chance_node(){if a>=52||g.possible_cards()&(1u64<<a)==0{return Err("illegal chance card".into())}}else if a>=g.available_actions().len(){return Err("illegal action".into())}g.play(a);}Ok(())
}
fn main(){
 let args=std::env::args().collect::<Vec<_>>();let mode=args.get(1).map(String::as_str).unwrap_or("probe");let dir=Path::new(args.get(2).expect("data directory"));
 let req:Value=serde_json::from_str(&fs::read_to_string(dir.join("request.json")).unwrap()).unwrap();
 if mode=="serve"{
  let (mut g,memo)=load_data_from_file::<PostFlopGame,_>(dir.join("strategy.bin"),Some(budget())).unwrap();assert!(memo.contains(req["inputFingerprint"].as_str().unwrap()));
  for line in io::stdin().lock().lines(){let line=line.unwrap();let parsed=serde_json::from_str::<Value>(&line);let response=match parsed{Ok(v)=>{let history=v["history"].as_array().and_then(|a|a.iter().map(|x|x.as_u64().map(|x|x as usize)).collect::<Option<Vec<_>>>());match history{Some(h)=>match seek(&mut g,&h){Ok(())=>json!({"requestId":v["requestId"],"node":snapshot(&mut g)}),Err(e)=>json!({"requestId":v["requestId"],"error":e})},None=>json!({"requestId":v["requestId"],"error":"invalid history"})}},Err(_)=>json!({"error":"invalid JSON"})};println!("{response}");io::stdout().flush().unwrap();}return;
 }
 let mut g=game(&req);let estimate=g.memory_usage().1;let available=free();let cap=budget();
 let probe=json!({"compressedBytes":estimate,"availablePhysical":available,"budgetBytes":cap,"fits":estimate+512*1024_u64.pow(2)<cap,"fingerprint":req["inputFingerprint"]});
 fs::write(dir.join("preflight.json"),serde_json::to_string_pretty(&probe).unwrap()).unwrap();println!("{probe}");
 if mode=="probe"{return}assert!(probe["fits"].as_bool().unwrap(),"memory guard stopped");assert!(!dir.join("strategy.bin").exists(),"existing strategy never overwritten");
 let start=Instant::now();g.allocate_memory(true);let target=req["targetExploitabilityUnits"].as_f64().unwrap()as f32;let max=req["maxIterations"].as_u64().unwrap()as u32;let mut metric=compute_exploitability(&g);let mut iteration=0;
 while iteration<max&&metric>target{assert!(free()>1024_u64.pow(3),"low free memory");if start.elapsed().as_secs()>7200{break}solve_step(&g,iteration);iteration+=1;if iteration%10==0{metric=compute_exploitability(&g);let progress=json!({"iterations":iteration,"metricUnits":metric,"elapsedSeconds":start.elapsed().as_secs_f64()});fs::write(dir.join("progress.json"),progress.to_string()).unwrap();println!("{progress}");io::stdout().flush().unwrap();}}
 metric=compute_exploitability(&g);finalize(&mut g);g.set_target_storage_mode(BoardState::River).unwrap();
 let memo=format!("{}; board {}; finite full-runout tree; metric {}",req["inputFingerprint"].as_str().unwrap(),req["context"]["flop"],metric);save_data_to_file(&g,&memo,dir.join("strategy.partial"),None).unwrap();fs::rename(dir.join("strategy.partial"),dir.join("strategy.bin")).unwrap();
 let result=json!({"inputFingerprint":req["inputFingerprint"],"engineRevision":req["engineRevision"],"iterations":iteration,"achievedMetricUnits":metric,"targetMetricUnits":target,"targetReached":metric<=target,"elapsedSeconds":start.elapsed().as_secs_f64(),"scope":req["scope"],"root":snapshot(&mut g)});
 fs::write(dir.join("result.json"),serde_json::to_string_pretty(&result).unwrap()).unwrap();println!("{}",json!({"finished":true,"targetReached":metric<=target}));
}
