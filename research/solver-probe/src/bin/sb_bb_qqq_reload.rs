// Isolated post-save probe. Run only after the producer has exited.
use postflop_solver::*;
use serde_json::{json,Value};
use std::{fs,path::PathBuf,time::Instant};
#[repr(C)] struct Mem {len:u32,load:u32,data:[u64;7]}
#[link(name="kernel32")] extern "system" {fn GlobalMemoryStatusEx(m:*mut Mem)->i32;}
fn free()->u64 {let mut m=Mem{len:std::mem::size_of::<Mem>()as u32,load:0,data:[0;7]};assert_ne!(unsafe{GlobalMemoryStatusEx(&mut m)},0);m.data[1]}
fn card_name(id:u8)->String {let r=b"23456789TJQKA";let s=b"cdhs";format!("{}{}",r[(id/4)as usize]as char,s[(id%4)as usize]as char)}
fn snapshot(g:&mut PostFlopGame,id:&str)->Value {
 g.cache_normalized_weights();let terminal=g.is_terminal_node();let chance=g.is_chance_node();
 let actor=if terminal||chance{None}else{Some(g.current_player())};
 let w=[g.normalized_weights(0).to_vec(),g.normalized_weights(1).to_vec()];
 json!({"id":id,"historyIndices":g.history(),"board":g.current_board().into_iter().map(card_name).collect::<Vec<_>>(),"terminal":terminal,"chance":chance,"actor":actor,
 "actions":g.available_actions().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>(),"rawWeights":[g.weights(0),g.weights(1)],"compatibleMassWeights":w,
 "orderedHands":[holes_to_strings(g.private_cards(0)).unwrap(),holes_to_strings(g.private_cards(1)).unwrap()],"totalBetAmount":g.total_bet_amount(),
 "strategyActionMajor":actor.map(|_|g.strategy()),"actionEV":actor.map(|a|g.expected_values_detail(a)),
 "terminalEV":if terminal{Some([g.expected_values(0),g.expected_values(1)])}else{None},"zeroSupportNotForGrading":true})
}
fn action(g:&mut PostFlopGame,wanted:&str){let a=g.available_actions();let i=a.iter().position(|a|format!("{a:?}")==wanted).unwrap_or_else(||panic!("Missing {wanted}, actual {a:?}"));g.play(i);}
fn numeric_compare(a:&Value,b:&Value)->Value {
 let a=a.as_array().unwrap();let b=b.as_array().unwrap();assert_eq!(a.len(),b.len());
 let(mut json_diff,mut float32_diff,mut max_abs)=(0,0,0.0_f64);let mut examples=vec![];
 for(i,(x,y))in a.iter().zip(b).enumerate(){let x=x.as_f64().unwrap();let y=y.as_f64().unwrap();if x!=y{json_diff+=1;max_abs=max_abs.max((x-y).abs());if examples.len()<3{examples.push(json!({"index":i,"loaded":x,"originalJSON":y,"loadedFloat32Bits":(x as f32).to_bits(),"originalFloat32Bits":(y as f32).to_bits()}));}}if(x as f32).to_bits()!=(y as f32).to_bits(){float32_diff+=1;}}
 json!({"values":a.len(),"jsonFloat64Differences":json_diff,"float32BitDifferences":float32_diff,"maxAbsoluteDifference":max_abs,"examples":examples})
}
fn main(){
 let start=Instant::now();let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");
 let state:Value=serde_json::from_str(&fs::read_to_string(dir.join("sb-bb-qqq-run-state.json")).unwrap()).unwrap();assert_eq!(state["status"],"finished_candidate_saved");
 let req:Value=serde_json::from_str(&fs::read_to_string(dir.join("reference-request-sb-bb-qqq.json")).unwrap()).unwrap();
 let result:Value=serde_json::from_str(&fs::read_to_string(dir.join("sb-bb-qqq-reference-result.json")).unwrap()).unwrap();
 assert_eq!(state["inputFingerprint"],req["inputFingerprint"]);assert_eq!(result["inputFingerprint"],req["inputFingerprint"]);
 let available=free();let budget=((available as f64*0.6)as u64).min(available.saturating_sub(2*1024_u64.pow(3)));
 assert!(2597630848+512*1024_u64.pow(2)<budget,"Reload resource budget insufficient");
 let (mut g,memo)=load_data_from_file::<PostFlopGame,_>(dir.join("sb-bb-qqq-reference-v1.bin"),Some(budget)).unwrap();
 assert_eq!(g.storage_mode(),BoardState::River);assert_eq!(g.tree_config().starting_pot,600);assert_eq!(g.tree_config().effective_stack,9700);assert_eq!(g.tree_config().rake_rate,0.0);
 assert_eq!(g.card_config().flop,flop_from_str("QsQhQd").unwrap());assert!(g.added_lines().is_empty()&&g.removed_lines().is_empty());
 let mut nodes=vec![snapshot(&mut g,"root")];
 for (id,history) in [("after_SB_check",vec!["Check"]),("after_SB_bet198",vec!["Bet(198)"]),("after_SB_bet402",vec!["Bet(402)"]),("after_SB_check_BB_bet198",vec!["Check","Bet(198)"])]{
  g.back_to_root();for a in history{action(&mut g,a);}nodes.push(snapshot(&mut g,id));
 }
 // A complete passive path, including two physical chance cards and terminal values.
 g.back_to_root();action(&mut g,"Check");action(&mut g,"Check");nodes.push(snapshot(&mut g,"flop_XX_before_turn"));
 let ac=card_from_str("Ac").unwrap();assert!(g.possible_cards()&(1<<ac)!=0);g.play(ac as usize);nodes.push(snapshot(&mut g,"turn_Ac"));
 action(&mut g,"Check");nodes.push(snapshot(&mut g,"turn_Ac_after_SB_check"));action(&mut g,"Check");nodes.push(snapshot(&mut g,"turn_XX_before_river"));
 let rc=card_from_str("2c").unwrap();assert!(g.possible_cards()&(1<<rc)!=0);g.play(rc as usize);nodes.push(snapshot(&mut g,"river_Ac2c"));
 action(&mut g,"Check");nodes.push(snapshot(&mut g,"river_Ac2c_after_SB_check"));action(&mut g,"Check");nodes.push(snapshot(&mut g,"river_XX_terminal"));
 // Keep the original flop calling branch separate from the passive path.
 g.back_to_root();action(&mut g,"Bet(198)");action(&mut g,"Call");nodes.push(snapshot(&mut g,"flop_B198C_before_turn"));g.play(ac as usize);nodes.push(snapshot(&mut g,"turn_Ac_after_B198C"));
 g.back_to_root();let root=&nodes[0];let after=&nodes[1];
 assert_eq!(root["orderedHands"],result["root"]["orderedHands"]);assert_eq!(root["rawWeights"],result["root"]["rawWeights"]);
 let comparisons=json!({"rootStrategy":numeric_compare(&root["strategyActionMajor"],&result["root"]["strategyActionMajor"]),"rootEV":numeric_compare(&root["actionEV"],&result["root"]["currentActionEV"]),"afterCheckStrategy":numeric_compare(&after["strategyActionMajor"],&result["afterSBCheck"]["strategyActionMajor"]),"afterCheckEV":numeric_compare(&after["actionEV"],&result["afterSBCheck"]["currentActionEV"])});
 fs::write(dir.join("sb-bb-qqq-reload-comparison.json"),serde_json::to_string_pretty(&comparisons).unwrap()).unwrap();println!("{comparisons}");
 for(_,c)in comparisons.as_object().unwrap(){assert_eq!(c["float32BitDifferences"],0,"Underlying engine f32 values changed");}
 let out=json!({"status":"reloaded_full_declared_tree_selected_nodes_not_independent_strategy_validation","memo":memo,"inputFingerprint":req["inputFingerprint"],"rootStrategyAndEVExactlyPreserved":true,"afterCheckStrategyAndEVExactlyPreserved":true,"storageMode":"River","availablePhysicalAtLoad":available,"loadBudget":budget,"elapsedSeconds":start.elapsed().as_secs_f64(),"nodes":nodes,"learnerTrials":0,"appChanged":false});
 fs::write(dir.join("sb-bb-qqq-reload-export.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();println!("{}",json!({"ok":true,"nodes":14,"elapsedSeconds":start.elapsed().as_secs_f64(),"rootStrategyAndEVExactlyPreserved":true}));
}
