const entries = [
  { title: 'Thailand: the land of smiles…', type: 'Travel story', url: 'blog.html#thailand', text: 'Three months in Thailand on a study exchange: Bangkok, Khao Sok, local food, islands, wildlife and new perspectives.' },
  { title: 'Bali: the famous influencer island…', type: 'Travel story', url: 'bali.html', text: 'Three months in Denpasar, family memories, student life, local nights, nearby islands and an honest view of Bali.' },
  { title: 'Thailand, on my own.', type: 'Travel story', url: 'thailand-solo.html', text: 'An eight-day solo journey through Bangkok, Pattaya, Chiang Rai and Chiang Mai.' },
  { title: 'Beneath the Philippine blue.', type: 'Story preview', url: 'philippines.html', text: 'A Philippines preview with whale sharks, open roads and a full story still to come.' },
  { title: 'Travel videos and films', type: 'Video', url: 'videos.html', text: 'Travel films, short moments, YouTube videos, a Philippines scooter ride and an Instagram Reel.' },
  { title: 'Places I have been', type: 'Interactive map', url: 'destinations.html', text: 'Explore destinations, visit years and a shared travel location update.' },
  { title: 'South America journey tracker', type: 'Planned journey', url: 'journey.html', text: 'A planned 2026–2027 route through Curaçao, Peru, Colombia, Brazil, Guatemala, El Salvador and Mexico. Updates appear only when they are confirmed from the road.' },
  { title: 'About Dainyel', type: 'About', url: 'about.html', text: 'A travel creator from Emmen, Drenthe: culture, animals, fitness, study exchanges and a life on the move.' },
  { title: 'My travel creator kit', type: 'Gear', url: 'my-kit.html', text: 'Drones, GoPro HERO13, DJI Mic Mini, Samsung Galaxy S26 Ultra and the practical setup used on the road.' },
  { title: 'Travel Q&A', type: 'Community', url: 'qa.html', text: 'Ask Dainyel about Thailand, Bali, solo travel, the Philippines, travel culture and video gear.' },
  { title: 'Field Notes', type: 'Travel log', url: 'updates.html', text: 'Short travel notes, recent moments and occasional email updates when new stories or films are ready.' },
  { title: 'Collaborate with DainyelOnTheMove', type: 'Collaboration', url: 'collaborate.html', text: 'Destination storytelling, short-form travel content, UGC and thoughtful creator collaborations.' }
];

const input = document.getElementById('site-search-input');
const form = document.getElementById('site-search-form');
const results = document.getElementById('site-search-results');
const count = document.getElementById('search-count');

function render(query) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = terms.length
    ? entries.filter(entry => terms.every(term => `${entry.title} ${entry.type} ${entry.text}`.toLowerCase().includes(term)))
    : entries;

  results.replaceChildren();
  count.textContent = terms.length ? `${matches.length} result${matches.length === 1 ? '' : 's'} for “${query.trim()}”` : 'Browse every page and story.';

  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'search-empty';
    empty.textContent = 'No matching page yet. Try a country, a topic such as “solo” or “gear”, or a page name.';
    results.append(empty);
    return;
  }

  matches.forEach(entry => {
    const article = document.createElement('article');
    article.className = 'search-result';
    const meta = document.createElement('span');
    meta.className = 'note-meta';
    meta.textContent = entry.type;
    const heading = document.createElement('h2');
    const link = document.createElement('a');
    link.href = entry.url;
    link.textContent = entry.title;
    heading.append(link);
    const description = document.createElement('p');
    description.textContent = entry.text;
    article.append(meta, heading, description);
    results.append(article);
  });
}

form?.addEventListener('submit', event => { event.preventDefault(); render(input.value); });
input?.addEventListener('input', () => render(input.value));
render('');
