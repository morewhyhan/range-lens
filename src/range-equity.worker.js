import {showdownRunouts} from './range-evidence.js';
self.onmessage=event=>{try{const {board,hero,opponent}=event.data;self.postMessage({result:showdownRunouts(board,hero,opponent)});}catch(error){self.postMessage({error:error.message});}};
