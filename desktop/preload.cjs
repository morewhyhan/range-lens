const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('pokerSolver',Object.freeze({
 info:dataset=>ipcRenderer.invoke('solver:info',dataset),
 node:(dataset,history)=>ipcRenderer.invoke('solver:node',dataset,history),
 solve:input=>ipcRenderer.invoke('solver:solve',input),
 status:()=>ipcRenderer.invoke('solver:status'),
 cancel:()=>ipcRenderer.invoke('solver:cancel'),
 board:input=>ipcRenderer.invoke('solver:board',input),
 boardStatus:()=>ipcRenderer.invoke('solver:board-status'),
 boardCancel:()=>ipcRenderer.invoke('solver:board-cancel'),
}));
