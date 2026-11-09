use postflop_solver::*;
use serde_json::{json, Value};
use std::{fs,mem,path::PathBuf,time::Instant};

fn count(tree:&mut ActionTree, street:usize, skip:bool, counts:&mut [u64;3], records:&mut Vec<Value>) {
    assert!(street<3);
    records.push(json!({"street":street,"skipChance":skip,"terminal":tree.is_terminal_node(),"chanceBeforeSkip":!skip && tree.is_chance_node(),"history":tree.history().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>(),"totalBet":tree.total_bet_amount(),"actions":tree.available_actions().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>()}));
    if !skip && tree.is_chance_node() {
        counts[street]+=1;
        count(tree,street+1,true,counts,records);
        return;
    }
    counts[street]+=1;
    if tree.is_terminal_node(){return;}
    let actions=tree.available_actions().to_vec();
    for action in actions {tree.play(action).unwrap();count(tree,street,false,counts,records);tree.undo().unwrap();}
}
fn main(){
    let start=Instant::now();
    let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");
    let req:Value=serde_json::from_str(&fs::read_to_string(dir.join("reference-request-btn-bb-a72.json")).unwrap()).unwrap();
    let units=&req["moneyUnits"];
    let menu=&req["requestedTree"]["bothPlayers"];
    let parse=|key:&str|menu[key].as_array().unwrap().iter().map(|x|match x.as_str().unwrap(){"all-in"=>"a",s=>s}).collect::<Vec<_>>().join(",");
    let raises=parse("raises");
    let sizes=|key:&str|BetSizeOptions::try_from((parse(key).as_str(),raises.as_str())).unwrap();
    let flop=sizes("flopBets");let turn=sizes("turnBets");let river=sizes("riverBets");
    let cfg=TreeConfig {initial_state:BoardState::Flop,starting_pot:units["startingPot"].as_i64().unwrap() as i32,effective_stack:units["effectiveStack"].as_i64().unwrap() as i32,
        rake_rate:req["researchAssumptions"]["rakeRate"].as_f64().unwrap(),rake_cap:req["researchAssumptions"]["rakeCap"].as_f64().unwrap(),
        flop_bet_sizes:[flop.clone(),flop],turn_bet_sizes:[turn.clone(),turn],river_bet_sizes:[river.clone(),river],
        turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0};
    let mut tree=ActionTree::new(cfg).unwrap();assert!(tree.invalid_terminals().is_empty());
    let root=format!("{:?}",tree.available_actions());assert!(tree.available_actions().contains(&Action::Bet(182)));assert!(tree.available_actions().contains(&Action::AllIn(9750)));
    tree.play(Action::Check).unwrap();let after_check=format!("{:?}",tree.available_actions());
    tree.play(Action::Bet(182)).unwrap();let facing_bet=format!("{:?}",tree.available_actions());assert!(tree.available_actions().contains(&Action::Raise(455)));
    tree.play(Action::Call).unwrap();assert!(tree.is_chance_node());let turn_menu=format!("{:?}",tree.available_actions());assert!(tree.available_actions().contains(&Action::Bet(686)));
    tree.play(Action::Check).unwrap();tree.play(Action::Check).unwrap();assert!(tree.is_chance_node());let river_menu=format!("{:?}",tree.available_actions());assert!(tree.available_actions().contains(&Action::Bet(686)));
    tree.back_to_root();let mut counts=[0;3];let mut records=Vec::new();count(&mut tree,0,false,&mut counts,&mut records);tree.back_to_root();
    let expanded_upper=counts[0]+49*counts[1]+49*48*counts[2];
    let arena_upper=expanded_upper*mem::size_of::<MutexLike<PostFlopNode>>() as u64;
    let mut out=json!({"status":"abstract_tree_checked_before_full_game_construction","inputFingerprint":req["inputFingerprint"],"sourceRevision":"9d1509fe5077d019825f833eed04b16d342dfda1","actualAbstractMenus":{"rootBB":root,"afterBBCheck":after_check,"facingBet182":facing_bet,"turnAfterFlopCheckBetCall":turn_menu,"riverAfterTurnChecks":river_menu},"abstractNodesByStreet":counts,"physicalExpansionUpperNodesIgnoringSuitIsomorphism":expanded_upper,"nodeArenaUpperBytes":arena_upper,"nodeBytes":mem::size_of::<MutexLike<PostFlopNode>>(),"strategyMemoryAllocated":false,"solveStarted":false,"NL50Reference":false});
    // Only construct the full graph after a small node-arena guard; no strategy allocation here.
    if arena_upper<=1024*1024*1024 {
        println!("Abstract tree checked; constructing original full-range graph, no strategy allocation.");
        let ranges=|role:&str|req["ranges"][role]["rangeStringDraft"].as_str().unwrap().parse().unwrap();
        let game=PostFlopGame::with_config(CardConfig{range:[ranges("oop"),ranges("ip")],flop:flop_from_str("As7h2d").unwrap(),turn:NOT_DEALT,river:NOT_DEALT},tree).unwrap();
        assert_eq!(game.private_cards(0).len(),358);assert_eq!(game.private_cards(1).len(),507);
        let (plain,compressed)=game.memory_usage();
        out["status"]=json!("full_original_flop_graph_built_memory_estimated_not_solved");
        out["fullGameEstimatedBytes"]=json!({"uncompressed":plain,"compressed":compressed,"includesMiscMemory":true,"notWholeProcessPeak":true});
        out["orderedPrivateHands"]=json!({"oop":holes_to_strings(game.private_cards(0)).unwrap(),"ip":holes_to_strings(game.private_cards(1)).unwrap()});
    }else{out["constructionGuard"]=json!("Conservative node arena exceeds 1GiB; original request preserved, graph not constructed.");}
    out["abstractNodes"]=json!(records);
    out["elapsedSeconds"]=json!(start.elapsed().as_secs_f64());
    fs::write(dir.join("flop-tree-preflight.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();
    out.as_object_mut().unwrap().remove("orderedPrivateHands");out.as_object_mut().unwrap().remove("abstractNodes");println!("{}",serde_json::to_string_pretty(&out).unwrap());
}
