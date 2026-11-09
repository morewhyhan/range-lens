use postflop_solver::*;

fn main() {
    // A72 C0 probe: the ranges and tree menu are copied from the frozen request.
    let oop_range = "22:1,33:1,44:1,55:1,66:0.5,77:1,88:1,99:1,AJs:1,ATs:1,A9s:1,A8s:1,A7s:1,A6s:1,A5s:0.5,A4s:0.5,A3s:1,A2s:0.5,KQs:0.5,KJs:0.5,KTs:0.5,K9s:1,K8s:1,K7s:1,K6s:0.5,K5s:0.5,K4s:0.5,K3s:1,K2s:1,AQo:1,KQo:1,QTs:0.5,Q9s:0.5,Q8s:0.5,Q7s:1,Q6s:0.5,Q5s:1,Q4s:1,AJo:1,KJo:1,QJo:1,JTs:0.5,J9s:0.5,J8s:0.5,J7s:0.5,ATo:1,KTo:0.5,QTo:0.5,JTo:1,TT:0.5,T9s:0.5,T8s:1,T7s:1,A9o:1,T9o:0.5,98s:1,97s:1,96s:1,A8o:0.5,87s:0.5,86s:1,85s:1,76s:0.5,75s:1,74s:1,65s:0.5,64s:1,63s:1,54s:0.5,53s:1,52s:1,43s:1";
    let ip_range = "22:0.5,33:1,44:1,55:1,66:1,77:1,88:1,99:1,AA:1,AKs:1,AQs:1,AJs:1,ATs:1,A9s:1,A8s:1,A7s:1,A6s:1,A5s:1,A4s:1,A3s:1,A2s:1,AKo:1,KK:1,KQs:1,KJs:1,KTs:1,K9s:1,K8s:1,K7s:1,K6s:1,K5s:1,K4s:1,K3s:1,K2s:1,AQo:1,KQo:1,QQ:1,QJs:1,QTs:1,Q9s:1,Q8s:1,Q7s:1,Q6s:1,Q5s:1,Q4s:1,Q3s:1,AJo:1,KJo:1,QJo:1,JJ:1,JTs:1,J9s:1,J8s:1,J7s:1,J6s:1,J5s:1,J4s:0.5,ATo:1,KTo:1,QTo:1,JTo:1,TT:1,T9s:1,T8s:1,T7s:1,T6s:1,A9o:1,K9o:1,Q9o:1,J9o:1,T9o:1,98s:1,97s:1,96s:0.5,A8o:1,K8o:0.5,J8o:0.5,T8o:0.5,87s:1,86s:1,A7o:1,76s:1,75s:0.5,A6o:1,65s:1,A5o:1,54s:0.5,A4o:1,A3o:0.5";

    let bet_sizes = BetSizeOptions::try_from(("33%, a", "2.5x, a")).unwrap();
    let turn_sizes = BetSizeOptions::try_from(("75%, a", "2.5x, a")).unwrap();
    let river_sizes = turn_sizes.clone();
    let tree_config = TreeConfig {
        initial_state: BoardState::Flop,
        starting_pot: 550,
        effective_stack: 9750,
        rake_rate: 0.0,
        rake_cap: 0.0,
        flop_bet_sizes: [bet_sizes.clone(), bet_sizes.clone()],
        turn_bet_sizes: [turn_sizes.clone(), turn_sizes],
        river_bet_sizes: [river_sizes.clone(), river_sizes],
        turn_donk_sizes: None,
        river_donk_sizes: None,
        add_allin_threshold: 0.0,
        force_allin_threshold: 0.0,
        merging_threshold: 0.0,
    };
    let card_config = CardConfig {
        range: [oop_range.parse().unwrap(), ip_range.parse().unwrap()],
        flop: flop_from_str("As7h2d").unwrap(),
        turn: NOT_DEALT,
        river: NOT_DEALT,
    };
    // The action tree can be replayed without allocating the solver's large
    // per-combination memory. This is the C0 history-menu adapter probe.
    let mut history_tree = ActionTree::new(tree_config.clone()).unwrap();
    let root = history_tree.available_actions().to_vec();
    history_tree.apply_history(&[Action::Check, Action::Bet(182)]).unwrap();
    let after_check_bet = history_tree.available_actions().to_vec();
    history_tree.apply_history(&[Action::Check, Action::Bet(182), Action::Raise(455)]).unwrap();
    let after_raise = history_tree.available_actions().to_vec();
    let action_tree = ActionTree::new(tree_config).unwrap();
    let game = PostFlopGame::with_config(card_config, action_tree).unwrap();
    println!("root={root:?}");
    println!("after_check_bet_182={after_check_bet:?}");
    println!("after_raise_455={after_raise:?}");
    println!("memory={:?}", game.memory_usage());
}
