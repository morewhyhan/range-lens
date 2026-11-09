use postflop_solver::*;
use serde_json::json;
use std::{fs,path::PathBuf};
fn main(){
 let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");
 let b=BetSizeOptions::try_from(("50%","")).unwrap();
 let cfg=TreeConfig{initial_state:BoardState::River,starting_pot:1000,effective_stack:5000,rake_rate:0.0,rake_cap:0.0,flop_bet_sizes:[b.clone(),b.clone()],turn_bet_sizes:[b.clone(),b.clone()],river_bet_sizes:[b.clone(),b],turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0};
 let mut g=PostFlopGame::with_config(CardConfig{range:["AsAh,QsQh".parse().unwrap(),"QcQd,AsQc".parse().unwrap()],flop:flop_from_str("Ks7h2d").unwrap(),turn:card_from_str("3c").unwrap(),river:card_from_str("9h").unwrap()},ActionTree::new(cfg).unwrap()).unwrap();
 g.allocate_memory(true);let metric=solve(&mut g,40,0.1,false);g.cache_normalized_weights();
 let root_strategy=g.strategy();let ev=g.expected_values_detail(0);let memory=g.memory_usage().1;
 let file=dir.join("storage-roundtrip-calibration.bin");let memo="Tiny storage calibration, not a new target strategy";
 save_data_to_file(&g,memo,&file,None).unwrap();drop(g);
 let (mut loaded,read_memo)=load_data_from_file::<PostFlopGame,_>(&file,Some(16*1024*1024)).unwrap();assert_eq!(memo,read_memo);loaded.cache_normalized_weights();assert_eq!(root_strategy,loaded.strategy());assert_eq!(ev,loaded.expected_values_detail(0));
 let bytes=fs::metadata(&file).unwrap().len();assert!(load_data_from_file::<PostFlopGame,_>(&file,Some(1)).is_err());
 let out=json!({"ok":true,"status":"tiny_compressed_strategy_file_roundtrip_not_full_reference","memoPreserved":true,"rootStrategyPreserved":true,"rootActionEVPreserved":true,"memoryLimitRejectedSmallCap":true,"bytes":bytes,"memoryEstimate":memory,"metric":metric,"sourceRevision":"9d1509fe5077d019825f833eed04b16d342dfda1","learnerTrials":0,"appChanged":false});
 fs::write(dir.join("storage-roundtrip-verification.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();println!("{out}");
}
