use postflop_solver::*;
use serde_json::json;
use std::{fs,path::PathBuf};
fn main(){
 let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");
 let sizes=BetSizeOptions::try_from(("1750c","a")).unwrap();
 let cfg=TreeConfig{initial_state:BoardState::River,starting_pot:3500,effective_stack:8300,rake_rate:0.0,rake_cap:0.0,
  flop_bet_sizes:[sizes.clone(),sizes.clone()],turn_bet_sizes:[sizes.clone(),sizes.clone()],river_bet_sizes:[sizes.clone(),sizes],
  turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0};
 let prefix=[Action::Bet(1750),Action::Raise(4500)];
 let mut tree=ActionTree::new(cfg.clone()).unwrap();tree.add_line(&prefix).unwrap();
 let mut invalid_tree=ActionTree::new(cfg).unwrap();invalid_tree.add_line(&prefix).unwrap();
 let rejected=invalid_tree.add_line(&[prefix[0],prefix[1],Action::Raise(7249)]).unwrap_err();
 tree.add_line(&[prefix[0],prefix[1],Action::Raise(7250)]).unwrap();
 tree.apply_history(&prefix).unwrap();
 let facing_raise=format!("{:?}",tree.available_actions());
 assert!(tree.available_actions().contains(&Action::Raise(7250)));assert!(tree.available_actions().contains(&Action::AllIn(8300)));
 tree.play(Action::Raise(7250)).unwrap();assert_eq!(tree.total_bet_amount(),[7250,4500]);
 let facing_min=format!("{:?}",tree.available_actions());assert!(tree.available_actions().contains(&Action::AllIn(8300)));
 tree.play(Action::AllIn(8300)).unwrap();assert_eq!(tree.total_bet_amount(),[7250,8300]);
 assert_eq!(tree.available_actions(),&[Action::Fold,Action::Call]);
 let out=json!({"status":"river_reraise_amounts_runtime_checked_not_solved","sourceRevision":fs::read_to_string(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../solver-source/.git/HEAD")).unwrap().trim(),"unitsPerBB":100,
  "riverStart":{"pot":3500,"eachStack":8300},"history":["Bet1750","Raise4500"],"rejectedBelowMinimum":{"amount":7249,"engineError":rejected},"legalMinRaiseTo":7250,"maxAllInTo":8300,
  "facingRaiseActions":facing_raise,"afterMinRaiseActions":facing_min,"afterOpponentShortAllinActions":format!("{:?}",tree.available_actions()),"opponentShortRaiseIncrement":1050,"previousFullRaiseIncrement":2750,"heroToCallAfterShortAllIn":1050,"solveStarted":false,"strategyAllocated":false,"NL50Reference":false});
 fs::write(dir.join("bluff-reraise-rules-runtime.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();println!("{}",serde_json::to_string_pretty(&out).unwrap());
}
