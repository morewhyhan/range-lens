use postflop_solver::*;
use serde_json::{json,Value};
use std::{fs,path::PathBuf};
fn idx(g:&PostFlopGame,a:Action)->usize{g.available_actions().iter().position(|v|*v==a).unwrap()}
fn snapshot(g:&mut PostFlopGame)->Value{
 g.cache_normalized_weights();
 json!({"board":g.current_board().iter().map(|c|card_to_string(*c).unwrap()).collect::<Vec<_>>(),"history":g.history(),
 "raw":[g.weights(0),g.weights(1)],"joint":[g.normalized_weights(0),g.normalized_weights(1)],"equity":[g.equity(0),g.equity(1)],
 "EV":[g.expected_values(0),g.expected_values(1)],"totalBetAmount":g.total_bet_amount()})
}
fn main(){
 let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");
 let empty=BetSizeOptions::try_from(("","")).unwrap();let b=BetSizeOptions::try_from(("33%","")).unwrap();
 let cfg=TreeConfig{initial_state:BoardState::Turn,starting_pot:550,effective_stack:9750,rake_rate:0.0,rake_cap:0.0,
 flop_bet_sizes:[empty.clone(),empty.clone()],turn_bet_sizes:[b.clone(),b],river_bet_sizes:[empty.clone(),empty],
 turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0};
 let mut g=PostFlopGame::with_config(CardConfig{range:["AsQs,AhQh".parse().unwrap(),"KhKd,KcJc,JsTs".parse().unwrap()],flop:flop_from_str("Ks7s2d").unwrap(),turn:card_from_str("3d").unwrap(),river:NOT_DEALT},ActionTree::new(cfg).unwrap()).unwrap();
 let memory=g.memory_usage();assert!(memory.0<16*1024*1024);g.allocate_memory(false);
 let check=idx(&g,Action::Check);let n=g.private_cards(0).len();let mut lock=vec![0.0;n*g.available_actions().len()];for i in 0..n{lock[check*n+i]=1.0;}g.lock_current_strategy(&lock);g.play(check);
 let checked=idx(&g,Action::Check);let bet=idx(&g,Action::Bet(182));let ip=holes_to_strings(g.private_cards(1)).unwrap();let n=ip.len();let mut lock=vec![0.0;n*g.available_actions().len()];
 for (i,h) in ip.iter().enumerate(){let p=if h.contains("Kd"){1.0}else if h.contains("Jc"){0.5}else{0.0};lock[bet*n+i]=p;lock[checked*n+i]=1.0-p;}g.lock_current_strategy(&lock);g.play(bet);
 let call=idx(&g,Action::Call);let n=g.private_cards(0).len();let mut lock=vec![0.0;n*g.available_actions().len()];for i in 0..n{lock[call*n+i]=1.0;}g.lock_current_strategy(&lock);
 g.back_to_root();let metric=solve(&mut g,4,0.0,false);let ordered=[holes_to_strings(g.private_cards(0)).unwrap(),holes_to_strings(g.private_cards(1)).unwrap()];let root=snapshot(&mut g);
 g.apply_history(&[check,bet]);g.cache_normalized_weights();let facing=json!({"snapshot":snapshot(&mut g),"actions":g.available_actions().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>(),"actionEV":g.expected_values_detail(0)});
 let mut branches=Vec::new();
 for (name,path,pot) in [("all_checked",vec![check,checked],550),("bet_called",vec![check,bet,call],914)]{
  g.apply_history(&path);assert!(g.is_chance_node());let before=snapshot(&mut g);let branch_mass=before["joint"][0].as_array().unwrap().iter().map(|v|v.as_f64().unwrap()).sum::<f64>();let mask=g.possible_cards();let mut records=Vec::new();
  for c in 0..52u8{if mask&(1u64<<c)==0{continue;}g.apply_history(&path);g.play(c as usize);let state=snapshot(&mut g);let mass=state["joint"][0].as_array().unwrap().iter().map(|v|v.as_f64().unwrap()).sum::<f64>();
   records.push(json!({"river":card_to_string(c).unwrap(),"state":state,"positiveCurrentReach":mass>0.0,"conditionalPublicProbability":mass/branch_mass/44.0}));
  }
  branches.push(json!({"id":name,"path":path,"pot":pot,"beforeDeal":before,"branchMass":branch_mass,"records":records}));
 }
 let out=json!({"status":"actual_action_filtered_turn_chance_export_not_full_strategy","sourceRevision":"9d1509fe5077d019825f833eed04b16d342dfda1","orderedHands":ordered,"root":root,"facingBet":facing,"branches":branches,"startingPot":550,"effectiveStack":9750,"unitsPerBB":100,"policy":{"OOP":"Root check; always call after IP bet182; river check","IP":"KK bet1; KJ bet0.5; JT bet0 after OOP check; river check"},"memoryUsageBytes":[memory.0,memory.1],"returnedMetric":metric,"maxIterationsRequested":4,"actualIterationsReported":null,"fullOriginalFlopSolved":false,"NL50Reference":false});
 fs::write(dir.join("engine-filtered-chance-probe.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();println!("Action-filtered chance export probe complete. Original flop solve not started.");
}
