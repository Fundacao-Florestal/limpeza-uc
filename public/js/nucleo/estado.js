/* Estado da aplicação (objeto S): tela atual, registros carregados, usuário, filtros e formulário em edição. */
"use strict";

const S={view:"painel",recs:[],params:{...DEF},paramsDoc:false,db:null,me:{id:null,canEdit:false},
  fGer:"",fSt:"",fQ:"",hideDemo:false,ucQ:"",ucG:"",ucManual:false,isAdmin:false,isOwner:false,recE:[],recL:[],legIds:new Set(),acc:null,accReady:false,accAll:[],pedidos:[],pedido:null,viewAs:"",asg:null,exp:null,psRes:[],autoName:"",form:null,edit:null,saving:false,names:{}};
S.val=clone(VDEF);
