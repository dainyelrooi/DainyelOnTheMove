// One action per published content type, shared by initial HTML and live cards.
export function readingAction(kind){
  return ({blog:'Read story →','field-note':'Read Field Note →',fact:'Read fact →',tip:'Read tip →'})[kind]||'Read more →';
}
