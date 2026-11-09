use postflop_solver::*;
use serde_json::{json,Value};
use std::{fs,io::{self,Write},path::{Path,PathBuf},time::Instant};
#[repr(C)] struct Mem {len:u32,load:u32,data:[u64;7]}
#[repr(C)] struct ProcMem {len:u32,faults:u32,data:[usize;8]}
#[link(name="kernel32")] extern "system" {fn GlobalMemoryStatusEx(m:*mut Mem)->i32;fn GetCurrentProcess()->*mut std::ffi::c_void;fn GetDiskFreeSpaceExW(path:*const u16,free:*mut u64,total:*mut u64,allfree:*mut u64)->i32;}
#[link(name="psapi")] extern "system" {fn GetProcessMemoryInfo(p:*mut std::ffi::c_void,m:*mut ProcMem,size:u32)->i32;}
fn available()->u64{let mut m=Mem{len:std::mem::size_of::<Mem>()as u32,load:0,data:[0;7]};assert_ne!(unsafe{GlobalMemoryStatusEx(&mut m)},0);m.data[1]}
fn peak()->u64{let mut m=ProcMem{len:std::mem::size_of::<ProcMem>()as u32,faults:0,data:[0;8]};assert_ne!(unsafe{GetProcessMemoryInfo(GetCurrentProcess(),&mut m,std::mem::size_of::<ProcMem>()as u32)},0);m.data[0]as u64}
fn disk(path:&Path)->u64{use std::os::windows::ffi::OsStrExt;let p:Vec<u16>=path.as_os_str().encode_wide().chain(Some(0)).collect();let(mut f,mut t,mut a)=(0,0,0);assert_ne!(unsafe{GetDiskFreeSpaceExW(p.as_ptr(),&mut f,&mut t,&mut a)},0);f}
fn persist(dir:&Path,v:&Value){fs::write(dir.join("sb-bb-qqq-run-state.json"),serde_json::to_string_pretty(v).unwrap()).unwrap();println!("{v}");io::stdout().flush().unwrap();}
fn node(g:&mut PostFlopGame,history:&[usize])->Value{
 g.apply_history(history);g.cache_normalized_weights();let actor=g.current_player();let actions=g.available_actions().iter().map(|a|format!("{a:?}")).collect::<Vec<_>>();
 let weights=[g.weights(0).to_vec(),g.weights(1).to_vec()];let joint=[g.normalized_weights(0).to_vec(),g.normalized_weights(1).to_vec()];let mass:f32=joint[0].iter().sum();
 json!({"historyIndices":history,"actor":actor,"actions":actions,"orderedHands":[holes_to_strings(g.private_cards(0)).unwrap(),holes_to_strings(g.private_cards(1)).unwrap()],"rawWeights":weights,"compatibleMassWeights":joint,"jointReachMass":mass,"strategyActionMajor":g.strategy(),"currentActionEV":if mass>0.0{Some(g.expected_values_detail(actor))}else{None},"totalBetAmount":g.total_bet_amount(),"zeroSupportNotForGrading":true})
}
fn main(){
 let dir=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nevir-system");let req:Value=serde_json::from_str(&fs::read_to_string(dir.join("reference-request-sb-bb-qqq.json")).unwrap()).unwrap();
 let file=dir.join("sb-bb-qqq-reference-v1.bin");let partial=dir.join("sb-bb-qqq-reference-v1.partial");assert!(!file.exists()&&!partial.exists(),"Existing strategy artifact requires review, never overwrite");
 assert_eq!(req["moneyUnits"]["startingPot"],600);assert_eq!(req["moneyUnits"]["effectiveStack"],9700);assert_eq!(req["context"]["flop"],json!(["Qs","Qh","Qd"]));
 assert_eq!(req["researchAssumptions"]["rakeRate"],0);assert_eq!(req["requestedTree"]["bothPlayers"]["flopBets"],json!(["33%","67%","all-in"]));
 let f=BetSizeOptions::try_from(("33%,67%,a","2.5x,a")).unwrap();let b=BetSizeOptions::try_from(("75%,a","2.5x,a")).unwrap();
 let cfg=TreeConfig{initial_state:BoardState::Flop,starting_pot:600,effective_stack:9700,rake_rate:0.0,rake_cap:0.0,flop_bet_sizes:[f.clone(),f],turn_bet_sizes:[b.clone(),b.clone()],river_bet_sizes:[b.clone(),b],turn_donk_sizes:None,river_donk_sizes:None,add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0};
 let range=|role:&str|req["ranges"][role]["rangeStringDraft"].as_str().unwrap().parse().unwrap();
 let mut g=PostFlopGame::with_config(CardConfig{range:[range("oop"),range("ip")],flop:flop_from_str("QsQhQd").unwrap(),turn:NOT_DEALT,river:NOT_DEALT},ActionTree::new(cfg).unwrap()).unwrap();
 let estimate=g.memory_usage().1;let free=available();let budget=((free as f64*0.6)as u64).min(free.saturating_sub(2*1024_u64.pow(3)));let reserve=512*1024_u64.pow(2);let disk_free=disk(&dir);
 let mut state=json!({"pid":std::process::id(),"inputFingerprint":req["inputFingerprint"],"status":"resource_checked","compressedEstimate":estimate,"initialAvailablePhysical":free,"budget":budget,"additionalReserve":reserve,"diskFreeBytes":disk_free,"threadsRequested":2,"locksApplied":false,"originalA72Changed":false,"sourceRevision":req["engineRevision"]});
 if estimate+reserve>budget||disk_free<2*estimate+2*1024_u64.pow(3){state["status"]=json!("resource_guard_stopped_before_allocation");persist(&dir,&state);return;}
 let start=Instant::now();g.allocate_memory(true);assert_eq!(g.storage_mode(),BoardState::River);state["status"]=json!("solving");state["strategyAllocated"]=json!(true);state["peakWorkingSet"]=json!(peak());persist(&dir,&state);
 let target=0.6_f32;let max_iterations=2000;let mut metric=compute_exploitability(&g);let mut iterations=0;let mut progress=vec![json!({"iteration":0,"metricUnits":metric,"elapsedSeconds":start.elapsed().as_secs_f64()})];let mut stop="max_iterations";
 while iterations<max_iterations{
  if metric<=target{stop="target_metric_reached";break;}
  if available()<2*1024_u64.pow(3){stop="free_memory_guard";break;}
  if peak()>budget{stop="process_peak_guard";break;}
  if start.elapsed().as_secs()>1200{stop="wall_clock_limit";break;}
  solve_step(&g,iterations);iterations+=1;
  if iterations%10==0||iterations==max_iterations{
   metric=compute_exploitability(&g);let elapsed=start.elapsed().as_secs_f64();let p=json!({"iteration":iterations,"metricUnits":metric,"elapsedSeconds":elapsed,"peakWorkingSet":peak(),"availablePhysical":available()});progress.push(p.clone());state["progress"]=p;persist(&dir,&state);
  }
 }
 // A guard stop after a non-metric iteration requires a fresh actual final metric.
 metric=compute_exploitability(&g);if metric<=target{stop="target_metric_reached";}
 finalize(&mut g);g.set_target_storage_mode(BoardState::River).unwrap();
 let root=node(&mut g,&[]);g.back_to_root();let check=g.available_actions().iter().position(|a|*a==Action::Check).unwrap();let after_check=node(&mut g,&[check]);g.back_to_root();
 let memo=format!("Nevir isolated SB-BB QQQ; input {}; zero rake; full declared three-street finite tree; iterations {}; metric {}; no source-course or NL50 certification",req["inputFingerprint"],iterations,metric);
 state["status"]=json!("saving_full_declared_tree");state["iterations"]=json!(iterations);state["achievedMetricUnits"]=json!(metric);persist(&dir,&state);
 save_data_to_file(&g,&memo,&partial,None).unwrap();fs::rename(&partial,&file).unwrap();
 let out=json!({"status":"full_declared_tree_reference_candidate_not_independently_verified","inputFingerprint":req["inputFingerprint"],"engineRevision":req["engineRevision"],"iterations":iterations,"targetMetricUnits":target,"achievedMetricUnits":metric,"metricUnitsPerBB":100,"metricDefinition":"Engine unrestricted within declared finite tree, no node locks, zero rake; not continuous-poker error or per-action EV bound.","targetReached":metric<=target,"stoppingReason":stop,"maxIterations":max_iterations,"wallLimitSeconds":1200,"elapsedSeconds":start.elapsed().as_secs_f64(),"peakWorkingSetBytes":peak(),"memoryBudgetBytes":budget,"initialAvailablePhysicalBytes":free,"compression16bit":true,"storageMode":"River","strategyFile":"sb-bb-qqq-reference-v1.bin","strategyFileBytes":fs::metadata(&file).unwrap().len(),"memo":memo,"progress":progress,"root":root,"afterSBCheck":after_check,"sourceCourseConfigurationRecovered":false,"independentValidationPassed":false,"NL50Reference":false,"appChanged":false,"learnerTrials":0});
 fs::write(dir.join("sb-bb-qqq-reference-result.json"),serde_json::to_string_pretty(&out).unwrap()).unwrap();state["status"]=json!("finished_candidate_saved");state["targetReached"]=json!(metric<=target);state["stoppingReason"]=json!(stop);state["elapsedSeconds"]=json!(start.elapsed().as_secs_f64());persist(&dir,&state);
}
