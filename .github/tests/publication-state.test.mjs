import test from 'node:test';
import assert from 'node:assert/strict';
import {manualScheduleStatus,samePublication} from '../../assets/publication-state.js';
const payload={version:1,kind:'blog',title:'Fixture',excerpt:'Isolated words',body:'Fixture body',place:'',sources:'',videoUrl:'',photoIds:[],photoPlacements:[],heroPhotoId:'',heroLayout:'split',heroPosition:'center',storyLabel:'',tripPeriod:''};
test('manual publication of the exact reviewed payload completes rather than cancels its existing schedule',()=>{
  assert.equal(manualScheduleStatus('publish',{status:'queued',payload}, {...payload,revision:3,publishedAt:'server'}),'published');
  assert.equal(manualScheduleStatus('save',{status:'queued',payload},payload),null);
  assert.equal(manualScheduleStatus('withdraw',{status:'queued',payload},payload),'cancelled');
  assert.equal(manualScheduleStatus('publish',{status:'queued',payload},{...payload,body:'Changed'}),'cancelled');
  assert.equal(manualScheduleStatus('publish',{status:'cancelled',payload},payload),null);
  assert.equal(samePublication(payload,{...payload,heroLayout:'wide'}),false);
});
