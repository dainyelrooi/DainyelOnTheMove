import {loadJourney} from './journey-model.js';
import {costSummary, money} from './journey-core.js';
const host=document.querySelector('[data-costs]');
if (host) loadJourney().then(model=> {
  const records=model.expenses.filter(e=>e.status==='published');
  if (!records.length) return;
  const controls=host.querySelector('[data-cost-controls]');controls.hidden=false;
  for (const [field,attr] of [['tripId','trip'],['destinationId','place'],['category','category']]) {
    const select=host.querySelector(`[data-cost-${attr}]`);
    for(const value of new Set(records.map(r=>r[field]))) {const o=document.createElement('option');o.value=value;o.textContent=field==='destinationId'?(model.destinations.find(d=>d.id===value)?.name||value):value;select.append(o);}
  }
  const render=()=> {
    const trip=host.querySelector('[data-cost-trip]').value, place=host.querySelector('[data-cost-place]').value, category=host.querySelector('[data-cost-category]').value, from=host.querySelector('[data-cost-from]').value, to=host.querySelector('[data-cost-to]').value;
    const selected=records.filter(r=>(!trip||r.tripId===trip)&&(!place||r.destinationId===place)&&(!category||r.category===category)&&(!from||r.date>=from)&&(!to||r.date<=to));
    const results=host.querySelector('[data-cost-results]');results.replaceChildren();
    host.querySelector('[data-cost-status]').textContent=selected.length ? `${selected.length} published expense records. Partial coverage; currencies are shown separately.` : 'No published expenses match these filters.';
    for(const total of costSummary(selected)) {
      const article=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('p'),list=document.createElement('ul');
      h.textContent=`My share: ${money(total.personalMinor,total.currency)}`;
      p.textContent=`Recorded group payments: ${money(total.totalMinor,total.currency)}. ${total.start}–${total.end}: ${total.days} calendar days, with records on ${total.recordedDays} days. Average recorded share: ${money(total.averageMinor,total.currency)} per calendar day.`;
      for(const [category,amount] of Object.entries(total.categories)){const li=document.createElement('li');li.textContent=`${category}: ${money(amount,total.currency)}`;list.append(li);}
      article.append(h,p,list);results.append(article);
    }
    if(selected.length){
      const updated=document.createElement('p');updated.textContent='Last published update: '+selected.map(r=>r.updatedAt||r.publishedAt||'Date not recorded').sort().at(-1);results.append(updated);
      const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');summary.textContent='Recorded expenses and coverage';details.append(summary,list);
      for(const item of selected){const li=document.createElement('li');li.textContent=`${item.date} · ${model.destinations.find(d=>d.id===item.destinationId)?.name||item.destinationId} · ${item.category}: paid ${money(item.amountMinor,item.currency)}, my share ${money(item.personalMinor,item.currency)}. ${item.coverageNote||'Coverage not recorded.'}`;list.append(li);}results.append(details);
    }
  };
  controls.addEventListener('change',render);render();
}).catch(()=> {host.querySelector('[data-cost-status]').textContent='Expense records are temporarily unavailable. Please try again. The planning range above is not actual spending.';});
