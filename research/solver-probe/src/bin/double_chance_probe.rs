use postflop_solver::*;
use serde_json::{json,Value};
use std::{fs,path::PathBuf};
fn snapshot(g:&mut PostFlopGame)->Value{
 g.cache_normalized_weights();
 json!({"board":g.current_board().iter().map(|c|card_to_string(*c).unwrap()).collect::<Vec<_>>(),"history":g.history(),
 "raw":[g.weights(0),g.weights(1)],"joint":[g.normalized_weights(0),g.normalized_weights(1)],
 "equity":[g.equity(0),g.equity(1)],"EV":[g.expected_values(0),g.expected_values(1)],"totalBetAmount":g.total_bet_amount()})
}
fn check_pair(g:&mut PostFlopGame){assert_eq!(g.available_actions(),vec![Action::Check]);g.play(0);assert_eq!(g.available_actions(),vec![Action::Check]);g.play(0);assert!(g.is_chance_node());}
fn main(){
 let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");let b=BetSizeOptions::try_from(("","")).unwrap();
 let cfg=TreeConfig{initial_state:BoardState::Flop,starting_pot:550,effective_stack:9750,rake_rate:0.0,rake_cap:0.0,
 flop_bet_sizes:[b.clone(),b.clone()],turn_bet_sizes:[b.clone(),b.clone()],river_bet_sizes:[b.clone(),b],turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0};
 let mut g=PostFlopGame::with_config(CardConfig{range:["AhQh,AcQc,AdQd".parse().unwrap(),"KhJh,KcJc,KdJd".parse().unwrap()],flop:flop_from_str("Ks7s2s").unwrap(),turn:NOT_DEALT,river:NOT_DEALT},ActionTree::new(cfg).unwrap()).unwrap();
 let memory=g.memory_usage();assert!(memory.0<16*1024*1024);g.allocate_memory(false);let metric=solve(&mut g,4,0.0,false);g.back_to_root();
 let root=snapshot(&mut g);let hands=[holes_to_strings(g.private_cards(0)).unwrap(),holes_to_strings(g.private_cards(1)).unwrap()];
 check_pair(&mut g);let turn_mask=g.possible_cards();let turn_representatives=g.available_actions().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>();let mut turns=Vec::new();
 for t in 0..52u8{if turn_mask&(1u64<<t)==0{continue;}g.apply_history(&[0,0]);g.play(t as usize);let turn=snapshot(&mut g);let turn_mass=turn["joint"][0].as_array().unwrap().iter().map(|v|v.as_f64().unwrap()).sum::<f64>();
  check_pair(&mut g);let mask=g.possible_cards();let representatives=g.available_actions().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>();let mut rivers=Vec::new();
  for r in 0..52u8{if mask&(1u64<<r)==0{continue;}g.apply_history(&[0,0,t as usize,0,0]);g.play(r as usize);let state=snapshot(&mut g);let m=state["joint"][0].as_array().unwrap().iter().map(|v|v.as_f64().unwrap()).sum::<f64>();
   rivers.push(json!({"river":card_to_string(r).unwrap(),"state":state,"conditionalPublicProbability":m/turn_mass/44.0,"orderedRunoutPublicProbability":m/9.0/45.0/44.0}));
  }
  turns.push(json!({"turn":card_to_string(t).unwrap(),"state":turn,"publicProbability":turn_mass/9.0/45.0,"riverRepresentatives":representatives,"rivers":rivers}));
 }
 let out=json!({"status":"actual_small_flop_double_chance_calibration_not_requested_strategy","sourceRevision":"9d1509fe5077d019825f833eed04b16d342dfda1","orderedHands":hands,"root":root,"turnRepresentatives":turn_representatives,"turns":turns,
 "startingPot":550,"unitsPerBB":100,"memoryUsageBytes":[memory.0,memory.1],"returnedMetric":metric,"maxIterationsRequested":4,"actualIterationsReported":null,
 "scope":"All streets check/check; isolates actual physical ordered runouts and nested suit swaps. No betting policy quality.","fullOriginalFlopSolved":false,"NL50Reference":false});
 fs::write(dir.join("engine-double-chance-probe.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();println!("Double chance export probe completed. Original requested flop game not solved.");
}
