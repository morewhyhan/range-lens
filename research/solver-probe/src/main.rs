use postflop_solver::*;
use serde_json::{json, Value};
use std::{fs, path::PathBuf};

fn config(bets: &str, raises: &str) -> TreeConfig {
    let sizes = BetSizeOptions::try_from((bets, raises)).unwrap();
    TreeConfig { initial_state: BoardState::River, starting_pot: 550, effective_stack: 9750,
        rake_rate: 0.0, rake_cap: 0.0,
        flop_bet_sizes: [sizes.clone(), sizes.clone()], turn_bet_sizes: [sizes.clone(), sizes.clone()],
        river_bet_sizes: [sizes.clone(), sizes], turn_donk_sizes: None, river_donk_sizes: None,
        add_allin_threshold: 0.0, force_allin_threshold: 0.0, merging_threshold: 0.0 }
}
fn make_game(oop: &str, ip: &str, raises: &str) -> PostFlopGame {
    PostFlopGame::with_config(CardConfig { range: [oop.parse().unwrap(), ip.parse().unwrap()],
        flop: flop_from_str("Ks7h2d").unwrap(), turn: card_from_str("3c").unwrap(),
        river: card_from_str("9h").unwrap() }, ActionTree::new(config("33%", raises)).unwrap()).unwrap()
}
fn find_action(game: &PostFlopGame, expected: Action) -> usize {
    game.available_actions().iter().position(|a| *a == expected).expect("expected action missing")
}
fn main() {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");
    let request: Value = serde_json::from_str(&fs::read_to_string(dir.join("reference-request-btn-bb-a72.json")).unwrap()).unwrap();
    let mut card_checks = 0;
    for rank in "23456789TJQKA".chars() { for (suit_index, suit) in "cdhs".chars().enumerate() {
        let name = format!("{rank}{suit}"); let id = card_from_str(&name).unwrap();
        assert_eq!(id as usize, "23456789TJQKA".find(rank).unwrap()*4+suit_index);
        assert_eq!(card_to_string(id).unwrap(), name); card_checks += 1;
    }}
    assert_eq!(NOT_DEALT,255);
    let flop = flop_from_str("As7h2d").unwrap(); let mut parsed = Vec::new();
    for role in ["oop","ip"] {
        let data = &request["ranges"][role]; let range: Range = data["rangeStringDraft"].as_str().unwrap().parse().unwrap();
        let (mut checks,mut positive,mut mass)=(0,0,0.0_f64);
        for a in 0..52u8 { for b in a+1..52u8 {
            let rank_a = "23456789TJQKA".as_bytes()[(a/4) as usize] as char;
            let rank_b = "23456789TJQKA".as_bytes()[(b/4) as usize] as char;
            let class = if a/4==b/4 { format!("{rank_a}{rank_b}") }
                else { format!("{rank_b}{rank_a}{}", if a%4==b%4 {"s"} else {"o"}) };
            let expected=data["classWeights"][&class].as_f64().unwrap() as f32;
            let actual=range.get_weight_by_cards(a,b); assert!((actual-expected).abs()<1e-7);
            checks+=1;
            if actual>0.0 && !flop.contains(&a) && !flop.contains(&b) {positive+=1;mass+=actual as f64;}
        }}
        assert_eq!(positive,data["summary"]["positiveAfterFlop"].as_u64().unwrap());
        assert_eq!(mass,data["summary"]["massAfterFlop"].as_f64().unwrap());
        parsed.push(json!({"role":role,"physicalWeightChecks":checks,"rootPositiveHands":positive,"rootMass":mass}));
    }
    // Runtime amount probe on a tiny river tree, not the requested flop game.
    let mut tree_probe=make_game("AsAh","QcQd","2.5x,a"); tree_probe.allocate_memory(false);
    let root_actions=format!("{:?}",tree_probe.available_actions());
    let check=find_action(&tree_probe,Action::Check);tree_probe.play(check);
    let bet=find_action(&tree_probe,Action::Bet(182));tree_probe.play(bet);
    let facing_actions=format!("{:?}",tree_probe.available_actions());
    let raise=find_action(&tree_probe,Action::Raise(455));tree_probe.play(raise);
    let after_raise_actions=format!("{:?}",tree_probe.available_actions());
    let mut cases=Vec::new();
    for (name,oop,ip,expected) in [("win","AsAh","QcQd",732.0),("lose","QsQh","AsAh",-182.0),("tie","AsQc","AhQd",275.0)] {
        let mut game=make_game(oop,ip,"");game.allocate_memory(false);
        let actions=game.available_actions();let mut lock=vec![0.0;actions.len()];lock[find_action(&game,Action::Check)]=1.0;game.lock_current_strategy(&lock);
        game.play(find_action(&game,Action::Check));
        let actions=game.available_actions();let mut lock=vec![0.0;actions.len()];lock[find_action(&game,Action::Bet(182))]=1.0;game.lock_current_strategy(&lock);
        game.back_to_root();let metric=solve(&mut game,64,0.0,false);
        game.play(find_action(&game,Action::Check));game.play(find_action(&game,Action::Bet(182)));game.cache_normalized_weights();
        assert_eq!(game.current_player(),0);let actions=game.available_actions();let ev=game.expected_values_detail(0);
        let fold=actions.iter().position(|a|*a==Action::Fold).unwrap();let call=actions.iter().position(|a|*a==Action::Call).unwrap();
        assert!((ev[fold]-0.0).abs()<0.02,"{name}: fold EV {}",ev[fold]);
        assert!((ev[call]-expected).abs()<0.02,"{name}: call EV {} expected {expected}",ev[call]);
        cases.push(json!({"id":name,"expectedCurrentCallEV":expected,"runtimeCurrentCallEV":ev[call],"runtimeFoldEV":ev[fold],"reportedMetric":metric,"scope":"Locked tiny river calibration; not an unconstrained equilibrium benchmark", "actions":format!("{:?}",actions)}));
    }
    let result=json!({"status":"runtime_range_amount_and_river_calibration_passed_not_flop_solved", "sourceRevision":"9d1509fe5077d019825f833eed04b16d342dfda1", "features":{"bincode":false,"rayon":true}, "cardChecks":card_checks, "parsedRanges":parsed,
        "amountProbe":{"street":"river","rootActions":root_actions,"afterCheckBet182":facing_actions,"afterRaise455":after_raise_actions,"notActualFlopTree":true},"evCalibrations":cases,"requestedFlopSolveStarted":false,"NL50Reference":false,"appChanged":false});
    fs::write(dir.join("engine-runtime-calibration.json"),serde_json::to_string_pretty(&result).unwrap()).unwrap();println!("{}",serde_json::to_string_pretty(&result).unwrap());
}
