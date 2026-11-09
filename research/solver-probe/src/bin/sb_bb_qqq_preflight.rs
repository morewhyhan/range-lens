use postflop_solver::*;
use serde_json::{json,Value};
use std::{fs,mem,path::PathBuf,time::Instant};
fn count(t:&mut ActionTree,street:usize,skip:bool,counts:&mut [u64;3],rows:&mut Vec<Value>){
 rows.push(json!({"street":street,"history":t.history().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>(),"totalBet":t.total_bet_amount(),"terminal":t.is_terminal_node(),"chanceBeforeSkip":!skip&&t.is_chance_node(),"skipChance":skip}));
 if !skip&&t.is_chance_node(){counts[street]+=1;count(t,street+1,true,counts,rows);return;}
 counts[street]+=1;if t.is_terminal_node(){return;}
 for a in t.available_actions().to_vec(){t.play(a).unwrap();count(t,street,false,counts,rows);t.undo().unwrap();}
}
fn main(){
 let started=Instant::now();let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");
 let r:Value=serde_json::from_str(&fs::read_to_string(dir.join("reference-request-sb-bb-qqq.json")).unwrap()).unwrap();
 assert_eq!(r["moneyUnits"]["startingPot"].as_i64().unwrap(),600);assert_eq!(r["moneyUnits"]["effectiveStack"].as_i64().unwrap(),9700);
 assert_eq!(r["researchAssumptions"]["rakeRate"].as_f64().unwrap(),0.0);
 let m=&r["requestedTree"]["bothPlayers"];
 let parse=|key:&str|m[key].as_array().unwrap().iter().map(|x|match x.as_str().unwrap(){"all-in"=>"a",s=>s}).collect::<Vec<_>>().join(",");
 let raises=parse("raises");let size=|key:&str|BetSizeOptions::try_from((parse(key).as_str(),raises.as_str())).unwrap();
 let f=size("flopBets");let t=size("turnBets");let v=size("riverBets");
 let mut tree=ActionTree::new(TreeConfig{initial_state:BoardState::Flop,starting_pot:600,effective_stack:9700,rake_rate:0.0,rake_cap:0.0,flop_bet_sizes:[f.clone(),f],turn_bet_sizes:[t.clone(),t],river_bet_sizes:[v.clone(),v],turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0}).unwrap();
 assert!(tree.invalid_terminals().is_empty());let root=tree.available_actions().to_vec();
 assert!(root.contains(&Action::Check)&&root.contains(&Action::Bet(198))&&root.contains(&Action::Bet(402))&&root.contains(&Action::AllIn(9700)));
 let mut counts=[0;3];let mut rows=Vec::new();count(&mut tree,0,false,&mut counts,&mut rows);tree.back_to_root();
 let upper=counts[0]+49*counts[1]+49*48*counts[2];let arena=upper*mem::size_of::<MutexLike<PostFlopNode>>() as u64;
 assert!(arena<=1024*1024*1024,"Graph-only arena guard, no strategy allocation");
 let range=|role:&str|r["ranges"][role]["rangeStringDraft"].as_str().unwrap().parse().unwrap();
 let mut g=PostFlopGame::with_config(CardConfig{range:[range("oop"),range("ip")],flop:flop_from_str("QsQhQd").unwrap(),turn:NOT_DEALT,river:NOT_DEALT},tree).unwrap();
 assert_eq!(r["context"]["flop"],json!(["Qs","Qh","Qd"]));
 for (p,role) in [(0,"oop"),(1,"ip")]{assert_eq!(g.private_cards(p).len() as u64,r["ranges"][role]["summary"]["positiveAfterFlop"].as_u64().unwrap());}
 let (plain,compressed)=g.memory_usage();
 g.cache_normalized_weights();
 let out=json!({"status":"separate_full_range_graph_constructed_not_allocated_or_solved","inputFingerprint":r["inputFingerprint"],"sourceRevision":r["engineRevision"],"rootActions":root.iter().map(|a|format!("{a:?}")).collect::<Vec<_>>(),"abstractNodesByStreet":counts,"nodeArenaUpperBytesIgnoringIsomorphism":arena,"estimatedUncompressedBytes":plain,"estimatedCompressedBytes":compressed,"notWholeProcessPeak":true,"orderedHands":[holes_to_strings(g.private_cards(0)).unwrap(),holes_to_strings(g.private_cards(1)).unwrap()],"abstractNodes":rows,"strategyMemoryAllocated":false,"solveStarted":false,"elapsedSeconds":started.elapsed().as_secs_f64(),"originalA72Changed":false,"NL50Reference":false});
 let mut out=out;out["rootWeights"]=json!([g.weights(0),g.weights(1)]);out["rootCompatibleMassWeights"]=json!([g.normalized_weights(0),g.normalized_weights(1)]);
 fs::write(dir.join("sb-bb-qqq-preflight.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();
 println!("{}",json!({"ok":true,"compressed":compressed,"uncompressed":plain,"counts":counts,"strategyAllocated":false,"solveStarted":false}));
}
