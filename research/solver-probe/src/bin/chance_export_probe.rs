use postflop_solver::*;
use serde_json::{json,Value};
use std::{fs,path::PathBuf};
fn main(){
 let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");let mut cases=Vec::new();
 for (id,flop,turn,oop,ip) in [
  ("asymmetric_turn","Ks7s2d","3d","AsQs,AhQh","KhKd,KcJc,JsTs"),
  ("suit_symmetric_turn","Ks7s2s","3s","AhQh,AcQc,AdQd","KhJh,KcJc,KdJd")]{
  let b=BetSizeOptions::try_from(("","")).unwrap();
  let tree=TreeConfig{initial_state:BoardState::Turn,starting_pot:550,effective_stack:9750,rake_rate:0.0,rake_cap:0.0,
   flop_bet_sizes:[b.clone(),b.clone()],turn_bet_sizes:[b.clone(),b.clone()],river_bet_sizes:[b.clone(),b],turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0};
  let mut g=PostFlopGame::with_config(CardConfig{range:[oop.parse().unwrap(),ip.parse().unwrap()],flop:flop_from_str(flop).unwrap(),turn:card_from_str(turn).unwrap(),river:NOT_DEALT},ActionTree::new(tree).unwrap()).unwrap();
  let memory=g.memory_usage();assert!(memory.0<16*1024*1024);g.allocate_memory(false);let metric=solve(&mut g,4,0.0,false);
  g.back_to_root();g.cache_normalized_weights();
  let board=g.current_board().iter().map(|c|card_to_string(*c).unwrap()).collect::<Vec<_>>();
  let ordered=[holes_to_strings(g.private_cards(0)).unwrap(),holes_to_strings(g.private_cards(1)).unwrap()];
  let root_weights=[g.weights(0).to_vec(),g.weights(1).to_vec()];
  let root_joint=[g.normalized_weights(0).to_vec(),g.normalized_weights(1).to_vec()];
  let root_mass:f32=root_joint[0].iter().sum();
  let root_equity=[g.equity(0),g.equity(1)];
  let root_ev=[g.expected_values(0),g.expected_values(1)];
  assert_eq!(g.available_actions(),vec![Action::Check]);g.play(0);assert_eq!(g.available_actions(),vec![Action::Check]);g.play(0);assert!(g.is_chance_node());
  let mask=g.possible_cards();let representatives=g.available_actions().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>();
  let mut records:Vec<Value>=Vec::new();
  for c in 0..52u8{if mask&(1u64<<c)==0{continue;}
   g.apply_history(&[0,0]);g.play(c as usize);g.cache_normalized_weights();assert_eq!(g.current_board().last(),Some(&c));
   let joint=[g.normalized_weights(0).to_vec(),g.normalized_weights(1).to_vec()];
   let values=[g.expected_values(0),g.expected_values(1)];
   let usable:[Vec<bool>;2]=[joint[0].iter().map(|w|*w>0.0).collect(),joint[1].iter().map(|w|*w>0.0).collect()];
   let published:[Vec<Option<f32>>;2]=[values[0].iter().zip(&usable[0]).map(|(v,ok)|if *ok{Some(*v)}else{None}).collect(),values[1].iter().zip(&usable[1]).map(|(v,ok)|if *ok{Some(*v)}else{None}).collect()];
   records.push(json!({"river":card_to_string(c).unwrap(),"engineCardId":c,"currentBoard":g.current_board().iter().map(|c|card_to_string(*c).unwrap()).collect::<Vec<_>>(),"historyIndices":g.history(),
    "rawWeights":[g.weights(0),g.weights(1)],"compatibleJointMass":joint,"globalPublicRiverProbability":joint[0].iter().sum::<f32>()/root_mass/44.0,
    "referenceUsableByHand":usable,"publishedEVByHand":published,"equity":[g.equity(0),g.equity(1)],"EV":values,"actions":format!("{:?}",g.available_actions()),"totalBetAmount":g.total_bet_amount()}));
  }
  cases.push(json!({"id":id,"initialBoard":board,"orderedHands":ordered,"rootRawWeights":root_weights,"rootJointMass":root_joint,"rootEquity":root_equity,"rootEV":root_ev,
   "possiblePhysicalRiverCount":records.len(),"representativeActions":representatives,"riverRecords":records,"memoryUsageBytes":[memory.0,memory.1],"returnedMetric":metric,"maxIterationsRequested":4,"actualIterationsReported":null}));
 }
 let out=json!({"status":"actual_small_turn_chance_export_calibration_not_full_reference","sourceRevision":"9d1509fe5077d019825f833eed04b16d342dfda1","unitsPerBB":100,"startingPot":550,"scope":"Only check/check on turn and river; exact physical runout and export calibration, not a betting strategy or target equilibrium.","cases":cases,"requestedFlopSolved":false,"NL50Reference":false,"appChanged":false});
 fs::write(dir.join("engine-chance-export-probe.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();println!("Chance export calibration completed;2 small turn configurations. Original flop solve not started.");
}
