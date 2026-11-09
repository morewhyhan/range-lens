use postflop_solver::*;
use serde_json::{json,Value};
use std::{fs,path::PathBuf};
fn cfg()->TreeConfig{
 let b=BetSizeOptions::try_from(("33%","")).unwrap();
 TreeConfig{initial_state:BoardState::River,starting_pot:550,effective_stack:9750,rake_rate:0.0,rake_cap:0.0,
 flop_bet_sizes:[b.clone(),b.clone()],turn_bet_sizes:[b.clone(),b.clone()],river_bet_sizes:[b.clone(),b],turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0}
}
fn action_id(g:&PostFlopGame,a:Action)->usize{g.available_actions().iter().position(|x|*x==a).unwrap()}
fn export(g:&mut PostFlopGame,history:Vec<usize>,labels:Vec<String>,out:&mut Vec<Value>){
 g.apply_history(&history);g.cache_normalized_weights();
 let terminal=g.is_terminal_node();assert!(!g.is_chance_node());
 let actor=if terminal{None}else{Some(g.current_player())};
 let hands=[holes_to_strings(g.private_cards(0)).unwrap(),holes_to_strings(g.private_cards(1)).unwrap()];
 let raw=[g.weights(0).to_vec(),g.weights(1).to_vec()];
 let joint=[g.normalized_weights(0).to_vec(),g.normalized_weights(1).to_vec()];
 let joint_mass:f32=joint[0].iter().sum();assert!((joint_mass-joint[1].iter().sum::<f32>()).abs()<1e-5);
 let actions=if terminal{vec![]}else{g.available_actions().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>()};
 let strategies=if terminal{vec![]}else{g.strategy()};
 let mut rows=Vec::new();
 if let Some(player)=actor{
  let ev=g.expected_values_detail(player);let weighted=g.expected_values(player);let n=hands[player].len();
  assert_eq!(ev.len(),actions.len()*n);assert_eq!(strategies.len(),ev.len());
  for i in 0..n{
   let valid=joint[player][i]>0.0;
   rows.push(json!({"hand":hands[player][i],"handIndex":i,"rawReachWeight":raw[player][i],"compatibleJointMass":joint[player][i],
    "conditionalProbabilityWithinNode":if joint_mass>0.0{Some(joint[player][i]/joint_mass)}else{None},
    "referenceUsableAtThisObservedNode":valid,
    "strategyByAction":(0..actions.len()).map(|a|strategies[a*n+i]).collect::<Vec<_>>(),
    "engineEVByAction":(0..actions.len()).map(|a|ev[a*n+i]).collect::<Vec<_>>(),
    "publishedActionEV":(0..actions.len()).map(|a|if valid{Some(ev[a*n+i])}else{None}).collect::<Vec<_>>(),
    "engineStrategyWeightedEV":weighted[i]}));
  }
 }
 out.push(json!({"historyIndices":history,"historyActions":labels,"actor":actor,"terminal":terminal,"orderedHands":hands,"rawReachWeights":raw,"compatibleJointMassWeights":joint,"jointReachMass":joint_mass,
  "unconditionalPathProbability":joint_mass/3.0,"totalBetAmount":g.total_bet_amount(),"actions":actions,"actionMajorLayout":"actionIndex*privateHandCount+handIndex","rows":rows,
  "zeroReachPolicy":"Preserve raw engine values for audit; do not publish zero-support EV as a grading reference."}));
 for (index,label) in actions.iter().enumerate(){let mut next=history.clone();next.push(index);let mut next_labels=labels.clone();next_labels.push(label.clone());export(g,next,next_labels,out);}
}
fn main(){
 let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");let mut cases=Vec::new();
 for split in [false,true]{
  let mut g=PostFlopGame::with_config(CardConfig{range:["AsAh,QsQh".parse().unwrap(),"QcQd,AsQc".parse().unwrap()],flop:flop_from_str("Ks7h2d").unwrap(),turn:card_from_str("3c").unwrap(),river:card_from_str("9h").unwrap()},ActionTree::new(cfg()).unwrap()).unwrap();
  let memory=g.memory_usage();assert!(memory.0<16*1024*1024);g.allocate_memory(false);
  let n=g.private_cards(0).len();let mut lock=vec![0.0;g.available_actions().len()*n];let check=action_id(&g,Action::Check);for i in 0..n{lock[check*n+i]=1.0;}g.lock_current_strategy(&lock);g.play(check);
  let ip_hands=holes_to_strings(g.private_cards(1)).unwrap();let n=ip_hands.len();let mut lock=vec![0.0;g.available_actions().len()*n];let bet=action_id(&g,Action::Bet(182));let check=action_id(&g,Action::Check);
  for (i,h) in ip_hands.iter().enumerate(){let target=if split&&h.contains("As"){check}else{bet};lock[target*n+i]=1.0;}g.lock_current_strategy(&lock);g.back_to_root();
  let metric=solve(&mut g,64,0.0,false);let mut nodes=Vec::new();export(&mut g,vec![],vec![],&mut nodes);
  cases.push(json!({"id":if split{"split_by_own_hand"}else{"all_bet"},"memoryUsageBytes":[memory.0,memory.1],"maxIterationsRequested":64,"actualIterationsReported":null,"returnedMetric":metric,"metricScope":"Locked policies; not unconstrained equilibrium quality or target game.","locks":["OOP always check at root",if split{"IP bets QQ and checks AsQc after check"}else{"IP always bets182 after check"}],"nodes":nodes}));
 }
 let out=json!({"status":"actual_tiny_river_export_probe_not_original_flop_reference","sourceRevision":"9d1509fe5077d019825f833eed04b16d342dfda1","unitsPerBB":100,"context":{"board":["Ks","7h","2d","3c","9h"],"startingPot":550,"effectiveStack":9750,"rake":0},"rawRangeWeights":"Each listed physical holding has mass1 before compatibility. There are3 compatible joint pairs, not4.","cases":cases,"requestedFullFlopSolved":false,"appChanged":false,"NL50Reference":false});
 fs::write(dir.join("engine-export-probe.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();println!("Tiny export calibration completed;2 scenarios. Original flop solve not started.");
}
