import {loadJourney} from './journey-model.js';
export async function initJournal(){
  const grids=[...document.querySelectorAll('#field-notes .note-grid,#journal .note-grid,.postcard-wall')];if(!grids.length)return;
  try{const model=await loadJourney();
    for(const grid of grids){const postcard=grid.classList.contains('postcard-wall'),records=postcard?model.postcards:model.journal;
      for(const item of [...records].reverse()){
        if(grid.querySelector(`a[href="${item.url}"]`))continue;
        const card=document.createElement('article'),copy=document.createElement('div'),h=document.createElement('h2'),a=document.createElement('a'),p=document.createElement('p'),meta=document.createElement('p');card.className=postcard?'postcard-edition':'note';copy.className='note-copy';a.href=item.url;a.textContent=item.title;h.append(a);p.textContent=item.text||item.subtitle;meta.textContent=postcard?'Sent '+item.sentDate:`Event: ${item.eventDate}. Published: ${item.publishedAt?.slice(0,10)}`;copy.append(meta,h,p);
        if(item.photo){const image=document.createElement('img');image.src=item.photo.src;image.alt=item.photo.alt;image.width=640;image.height=420;image.loading='lazy';image.decoding='async';card.append(image);}card.append(copy);grid.prepend(card);
      }
    }
  }catch{}
}
