import {test} from 'node:test';import assert from 'node:assert/strict';
import {allowedPage,EMPTY_AUTHORITY,effectivePermissions,changePermission,denyPermissions} from '../lib/organization/model';
test('funções desativadas prevalecem inclusive para o dono',()=>{assert.equal(allowedPage({...EMPTY_AUTHORITY,owner:true,features:{calls:false}},'calls','t'),false);});
test('permissões são por time; organização não abre área administrativa para membro',()=>{assert.equal(allowedPage({...EMPTY_AUTHORITY,permissions:{t:{'tasks.view':false}}},'board','t'),false);assert.equal(allowedPage({...EMPTY_AUTHORITY,permissions:{t:{'tasks.view':false}}},'board','other'),true);});
test('acesso ainda não conferido falha fechado',()=>{assert.equal(allowedPage(null,'board','t'),false);assert.equal(allowedPage(null,'settings','t'),true);});
test('modelos de permissão não concedem administração a membro',()=>{const p=effectivePermissions({},false,false);assert.equal(p['tasks.manage'],false);assert.equal(p['projects.write'],false);assert.equal(p['reports.manage'],false);});
test('permissões explícitas substituem padrões legados de administração',()=>{assert.equal(effectivePermissions({'hours.manage':false},true,true)['hours.manage'],false);assert.equal(effectivePermissions({},false,true)['reports.manage'],false);});
test('convites novos começam sem módulos liberados',()=>{assert.ok(Object.values(denyPermissions()).every(v=>v===false));});
test('seleção de gerenciamento libera dependências e retirar leitura as retira',()=>{const p=changePermission({},'tasks','manage',true);assert.equal(p['tasks.view'],true);assert.equal(p['tasks.write'],true);assert.deepEqual(changePermission(p,'tasks','view',false),{'tasks.view':false,'tasks.write':false,'tasks.manage':false});});
