// Prepared copy comes only from the signed owner's existing private calendar.
export function preparedPin(entry){
 if(entry.kind&&entry.kind!=='social'||!entry.platforms?.includes('pinterest'))return null;
 const match=entry.title.match(/^Pinterest ([A-Z][0-9]{2,3}) · /);if(!match)return null;
 const text=entry.caption||'';
 const between=(start,end)=>{const from=text.indexOf(start);if(from<0)return '';const tail=text.slice(from+start.length),to=tail.indexOf(end);return(to<0?tail:tail.slice(0,to)).trim();};
 const title=between('TITLE\n','\n\nDESCRIPTION\n'),board=between('BOARD\n','\n\nTITLE\n'),description=between('DESCRIPTION\n','\n\nLINK\n');
 let destination;try{destination=new URL(between('LINK\n','\n\nTAGGED TOPICS'));if(destination.protocol!=='https:'||destination.hostname!=='dainyelonthemove.com'||destination.username||destination.password||destination.port)return null;}catch{return null;}
 if(!title||!board||!description)return null;
 return {...entry,pinId:match[1],pinTitle:title,board,description,destination:destination.href,topics:between('TAGGED TOPICS (search and select available suggestions)\n','\n\nALT TEXT\n').split(' | ').filter(Boolean).slice(0,10),alt:between('ALT TEXT\n','\n\nPrepared Pin')};
}
export function csvCell(value){const text=String(value??'');return '"'+(/^[\s]*[=+@-]/.test(text)?"'":'')+text.replaceAll('"','""')+'"';}
