// Local relevance, synonyms and a bounded spelling tolerance. No query leaves the browser.
const groups=[
  ['solo','alone','yourself','alleen','soloreis'],['budget','cost','costs','expense','expenses','geld','kosten','prijs','goedkoop','uitgaven'],
  ['gear','kit','camera','cameras','gopro','equipment','apparatuur'],['film','films','video','videos','youtube','filmpje','filmpjes'],
  ['story','stories','blog','blogs','verhaal','verhalen','reisverhaal'],['note','notes','fieldnotes','update','updates','weetjes'],
  ['philippines','philippine','filipijnen','philipines','filippijnen','filipino'],['thailand','thaise','thais'],['bali','balinese','indonesia','indonesie'],
  ['coffee','koffie','support','donate','donation','steun'],['postcard','postcards','newsletter','nieuwsbrief','mail'],
  ['contact','collaborate','collaboration','samenwerken','samenwerking'],['map','atlas','kaart','bestemming','destinations'],
  ['diving','dive','snorkel','snorkelling','snorkeling','duiken','snorkelen','underwater'],['beach','beaches','strand','stranden','coast'],
  ['whaleshark','whalesharks','whale','shark','sharks','walvishaai','walvishaaien'],['swim','swimming','zwemmen'],
  ['nature','natuur','wildlife','dieren','animals'],['waterfall','waterfalls','waterval','watervallen','tumalog'],
  ['temple','temples','tempel','tempels'],['island','islands','eiland','eilanden'],['drone','drones','aerial','luchtbeelden'],
  ['photo','photos','photography','foto','fotos','fotografie'],
  ['food','eten','local','culture','cultuur'],['nightlife','club','clubs','uitgaan','feest','nights'],
  ['study','exchange','studie','studeren','uitwisseling'],['question','questions','answer','answers','vraag','vragen','antwoord'],
  ['departure','departing','vertrek','vertrekken'],['trip','travel','journey','reis','reizen']
];
const stop=new Set('a an the of on in at to for and or i me my want how where can do you your is are with from about een de het en of ik mij mijn wil hoe waar kan je jouw op over van met naar zoeken zoek find please om te iets kunnen willen leuke leuk mooi mooie mooiste beste best nice good'.split(' '));
export function normal(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
const synonyms=new Map();for(const group of groups)for(const term of group)synonyms.set(term,group);
function close(a,b){
  if(a.length<4||Math.abs(a.length-b.length)>1)return false;
  if(a.length===b.length){const differences=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences.push(i);if(differences.length===2&&differences[1]===differences[0]+1&&a[differences[0]]===b[differences[1]]&&a[differences[1]]===b[differences[0]])return true;}
  let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return edits+(a.length-i)+(b.length-j)<=1;
}
export function searchEntries(entries,query){
  const terms=[...new Set(normal(query).split(' ').filter(word=>word&&!stop.has(word)))].slice(0,12);
  if(!terms.length)return entries.slice(0,12);
  const matches=[];
  for(const entry of entries){
    const title=normal(entry.title),full=normal([entry.title,entry.type,entry.text,entry.keywords].join(' '));
    const tokens=[...new Set(full.split(' '))];let total=0,hits=0;
    for(const term of terms){let score=0;const corrected=synonyms.has(term)?term:[...synonyms.keys()].find(alias=>close(term,alias));const equivalents=synonyms.get(corrected)||[term];
      for(const token of equivalents){if(title.split(' ').includes(token))score=Math.max(score,8);else if(tokens.includes(token))score=Math.max(score,5);else if(token.length>=3&&tokens.some(word=>word.startsWith(token)))score=Math.max(score,3);}
      if(!score&&tokens.some(word=>close(term,word)))score=2;
      if(score){hits++;total+=score;}
    }
    if(hits>=Math.ceil(terms.length*.75))matches.push({entry,score:total+(title.includes(normal(query))?12:0)});
  }
  return matches.sort((a,b)=>b.score-a.score||a.entry.title.localeCompare(b.entry.title)).slice(0,30).map(item=>item.entry);
}
