import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';

const journey = window.travelData?.southAmericaJourney;
if (!journey) throw new Error('Journey data is unavailable.');

const stops = journey.stops;
const list = document.getElementById('journey-stops');
const completeCount = document.getElementById('journey-complete');
const nextStop = document.getElementById('journey-next');
const range = document.getElementById('journey-range');
const journeyStatus = document.getElementById('journey-status');
const note = document.getElementById('journey-note');
const selected = { eyebrow:document.getElementById('stop-eyebrow'), name:document.getElementById('stop-name'), detail:document.getElementById('stop-detail'), progress:document.getElementById('journey-progress-fill'), order:document.getElementById('stop-order'), content:document.getElementById('stop-content') };
const label = status => status === 'completed' ? 'Completed' : status === 'exploring' ? 'Exploring' : 'Planned';
const completed = stops.filter(stop => stop.status === 'completed');
const active = stops.find(stop => stop.status === 'exploring');
const upcoming = stops.find(stop => stop.status === 'planned');
range.textContent = '28 Oct 2026 – Mar 2027';
completeCount.textContent = `${completed.length} / ${stops.length}`;
nextStop.textContent = active?.country || upcoming?.country || 'Route complete';
journeyStatus.textContent = active ? 'Exploring' : completed.length === stops.length ? 'Completed' : 'Planned';
note.textContent = journey.sourceNote;
function selectStop(stop, button) { list.querySelectorAll('.journey-stop').forEach(item => item.classList.toggle('is-active', item === button)); selected.eyebrow.textContent=label(stop.status); selected.name.textContent=stop.country; selected.detail.textContent=stop.detail; selected.order.textContent=`Stop ${stop.order} of ${stops.length}`; selected.content.textContent=stop.status==='completed'?'Published content will appear here when it is available.':stop.status==='exploring'?'A current journey update is available when Dainyel chooses to share it.':'No travel story, photo set or video has been published for this planned stop yet.'; selected.progress.style.width=`${(completed.length/stops.length)*100}%`; }
stops.forEach((stop,index) => { const button=document.createElement('button'); button.type='button'; button.className='journey-stop'; button.innerHTML=`<span class="journey-stop-number">${String(stop.order).padStart(2,'0')}</span><span><b>${stop.country}</b><small>${stop.detail}</small></span><span class="journey-stop-status">${label(stop.status)}</span>`; button.addEventListener('click',()=>selectStop(stop,button)); list.append(button); if(index===0)selectStop(stop,button); });
const location=document.getElementById('journey-location'); const locationDate=document.getElementById('journey-location-date');
function formatUpdated(timestamp){return timestamp?.toDate?`Last shared ${timestamp.toDate().toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}`:'Updated just now';}
onSnapshot(doc(db,'siteStatus','current'),snapshot=>{if(!snapshot.exists())return;const current=snapshot.data();if(!current.city||!current.country)return;location.textContent=`${current.city}, ${current.country}`;locationDate.textContent=formatUpdated(current.updatedAt);},()=>{locationDate.textContent='Location updates are temporarily unavailable.';});
