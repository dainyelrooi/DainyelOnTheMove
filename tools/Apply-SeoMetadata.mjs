import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const siteRoot = process.argv[2] ?? process.cwd();
const siteUrl = 'https://dainyelonthemove.com';
const personId = `${siteUrl}/#dainyel`;
const websiteId = `${siteUrl}/#website`;

const pages = {
  'index.html': {
    canonical: `${siteUrl}/`,
    title: 'DainyelOnTheMove | Travel Blog, Videos & Adventures',
    description: 'Travel with Dainyel through personal stories, cinematic videos and honest notes from Thailand, Bali, the Philippines and beyond.',
    image: 'assets/optimized/drone-bay.webp',
    imageAlt: 'Aerial view of a tropical bay from Dainyel’s travels',
    type: 'website',
    schema: 'home'
  },
  'about.html': {
    canonical: `${siteUrl}/about.html`,
    title: 'About Dainyel | Dutch Travel Creator & Storyteller',
    description: 'Meet Dainyel, a Netherlands-based travel creator sharing honest stories about culture, wildlife, local food, travel films and life on the move.',
    image: 'assets/optimized/elephant.webp',
    imageAlt: 'Dainyel beside an elephant in Thailand',
    type: 'profile',
    schema: 'about'
  },
  'blog.html': {
    canonical: `${siteUrl}/blog.html`,
    title: 'Travel Stories from Thailand, Bali & Beyond | Dainyel',
    description: 'Read Dainyel’s personal travel stories from a Thailand exchange, solo travel in Thailand, three months in Bali and the Philippines.',
    image: 'assets/optimized/khao-sok-lodges.webp',
    imageAlt: 'Floating lodges on a lake in Khao Sok, Thailand',
    type: 'website',
    schema: 'blog'
  },
  'bali.html': {
    canonical: `${siteUrl}/bali.html`,
    title: 'Bali Travel Blog: Three Months in Indonesia | Dainyel',
    description: 'An honest Bali travel blog about three months in Indonesia: study life in Denpasar, family adventures, local nights and island escapes.',
    image: 'assets/optimized/bali-surfing.webp',
    imageAlt: 'Dainyel surfing in Bali, Indonesia',
    type: 'article',
    schema: 'bali'
  },
  'thailand-solo.html': {
    canonical: `${siteUrl}/thailand-solo.html`,
    title: 'Thailand Solo Travel Blog | DainyelOnTheMove',
    description: 'Follow Dainyel’s first solo Thailand trip through Bangkok, Pattaya, Chiang Rai and Chiang Mai before meeting friends in the Philippines.',
    image: 'assets/optimized/thailand-monks-temple.webp',
    imageAlt: 'Monks and visitors gathered before a golden Buddha in a Thai temple',
    type: 'article',
    schema: 'thailandSolo'
  },
  'philippines.html': {
    canonical: `${siteUrl}/philippines.html`,
    title: 'Philippines Travel Story & Videos | DainyelOnTheMove',
    description: 'A first look at Dainyel’s 2025 Philippines journey: whale sharks, island roads and travel videos, with the full story still to come.',
    image: 'assets/optimized/philippines-drone-coast.webp',
    imageAlt: 'Aerial view of the Philippines coastline and turquoise water',
    type: 'website',
    schema: 'philippines'
  },
  'destinations.html': {
    canonical: `${siteUrl}/destinations.html`,
    title: 'Travel Destinations & World Map | DainyelOnTheMove',
    description: 'Explore Dainyel’s interactive travel map, countries visited and travel years across Europe, the Caribbean and Southeast Asia.',
    image: 'assets/optimized/drone-bay.webp',
    imageAlt: 'Aerial view of a tropical bay',
    type: 'website',
    schema: 'destinations'
  },
  'videos.html': {
    canonical: `${siteUrl}/videos.html`,
    title: 'Travel Videos & Films | DainyelOnTheMove',
    description: 'Watch travel films, short videos and moments from the road with DainyelOnTheMove, from the Philippines to Southeast Asia.',
    image: 'assets/optimized/philippines-scooter.webp',
    imageAlt: 'Scooter ride through the Philippines',
    type: 'website',
    schema: 'videos'
  },
  'qa.html': {
    canonical: `${siteUrl}/qa.html`,
    title: 'Travel Q&A with Dainyel | DainyelOnTheMove',
    description: 'Ask Dainyel about Thailand, Bali, the Philippines, solo travel, travel experiences and the camera gear behind the videos.',
    image: 'assets/optimized/thailand-banner-temple.webp',
    imageAlt: 'Dainyel visiting a Thai temple',
    type: 'website',
    schema: 'qa'
  },
  'my-kit.html': {
    canonical: `${siteUrl}/my-kit.html`,
    title: 'Travel Creator Gear & Video Setup | DainyelOnTheMove',
    description: 'Explore Dainyel’s travel creator kit: cameras, drones, audio gear and the mobile setup used to film stories from the road.',
    image: 'assets/optimized/airplane-window-island.webp',
    imageAlt: 'A tropical island seen from an airplane window',
    type: 'website',
    schema: 'kit'
  },
  '404.html': {
    canonical: `${siteUrl}/404.html`,
    title: 'Page Not Found | DainyelOnTheMove',
    description: 'The page you requested could not be found.',
    type: 'website',
    noindex: true,
    schema: 'none'
  },
  'admin.html': {
    canonical: `${siteUrl}/studio`,
    title: 'Owner sign-in | DainyelOnTheMove',
    description: 'Private question review dashboard for DainyelOnTheMove.',
    type: 'website',
    noindex: true,
    schema: 'none'
  }
};

const person = {
  '@type': 'Person',
  '@id': personId,
  name: 'Dainyel',
  alternateName: 'DainyelOnTheMove',
  url: `${siteUrl}/about.html`,
  image: `${siteUrl}/assets/optimized/brand-profile.webp`,
  description: 'A Netherlands-based travel creator sharing personal stories, travel films and honest perspectives from the road.',
  jobTitle: 'Travel creator',
  homeLocation: { '@type': 'Country', name: 'Netherlands' },
  sameAs: [
    'https://www.youtube.com/channel/UC107rsLuNIUqOtjkHG8tm8Q',
    'https://www.instagram.com/dainyelonthemove/',
    'https://www.tiktok.com/@dainyelonthemove?is_from_webapp=1&sender_device=pc'
  ]
};

function absoluteAsset(path) {
  return `${siteUrl}/${path}`;
}

function genericPage(config, type = 'WebPage') {
  return {
    '@type': type,
    '@id': `${config.canonical}#webpage`,
    url: config.canonical,
    name: config.title,
    description: config.description,
    inLanguage: 'en',
    isPartOf: { '@id': websiteId },
    primaryImageOfPage: config.image ? { '@type': 'ImageObject', url: absoluteAsset(config.image) } : undefined
  };
}

function schemaFor(config) {
  if (config.schema === 'none') return null;
  if (config.schema === 'home') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': websiteId,
          url: config.canonical,
          name: 'DainyelOnTheMove',
          alternateName: 'Dainyel On The Move',
          description: config.description,
          inLanguage: 'en',
          publisher: { '@id': personId }
        },
        person
      ]
    };
  }

  const page = genericPage(config, config.schema === 'about' ? 'ProfilePage' : config.schema === 'blog' ? 'CollectionPage' : config.schema === 'destinations' ? 'CollectionPage' : config.schema === 'videos' ? 'CollectionPage' : 'WebPage');
  const graph = [page];

  if (config.schema === 'about') {
    page.mainEntity = { '@id': personId };
    graph.push(person);
  }

  if (config.schema === 'bali' || config.schema === 'thailandSolo') {
    const isBali = config.schema === 'bali';
    graph[0] = {
      '@type': 'BlogPosting',
      '@id': `${config.canonical}#article`,
      url: config.canonical,
      mainEntityOfPage: { '@id': config.canonical },
      headline: isBali ? 'Bali, the famous influencer island…' : 'Thailand, on my own',
      description: config.description,
      image: absoluteAsset(config.image),
      inLanguage: 'en',
      author: { '@id': personId },
      publisher: { '@id': websiteId },
      articleSection: isBali ? 'Bali travel story' : 'Thailand solo travel',
      about: isBali ? { '@type': 'Place', name: 'Bali, Indonesia' } : { '@type': 'Country', name: 'Thailand' }
    };
    graph.push(person);
  }

  if (config.schema === 'blog') {
    page.mainEntity = {
      '@type': 'ItemList',
      name: 'DainyelOnTheMove travel stories',
      itemListElement: [
        { '@type': 'ListItem', position: 1, url: `${siteUrl}/blog.html#thailand`, name: 'Thailand, the land of smiles…' },
        { '@type': 'ListItem', position: 2, url: `${siteUrl}/thailand-solo.html`, name: 'Thailand, on my own' },
        { '@type': 'ListItem', position: 3, url: `${siteUrl}/bali.html`, name: 'Bali, the famous influencer island…' },
        { '@type': 'ListItem', position: 4, url: `${siteUrl}/philippines.html`, name: 'The Philippines' }
      ]
    };
  }

  if (config.schema === 'destinations') {
    page.mainEntity = {
      '@type': 'ItemList',
      name: 'Places Dainyel has visited',
      numberOfItems: 16,
      itemListElement: [
        'Spain', 'Italy', 'Portugal', 'Belgium', 'Poland', 'Sweden', 'Germany', 'Denmark', 'Scotland', 'Vatican City', 'Curaçao', 'Aruba', 'Tunisia', 'Bali, Indonesia', 'Thailand', 'Philippines'
      ].map((name, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'Place', name } }))
    };
  }

  if (config.schema === 'qa') {
    page.about = { '@id': personId };
    graph.push(person);
  }

  if (config.schema === 'kit') {
    page.about = { '@id': personId };
    graph.push(person);
  }

  if (config.schema === 'philippines') {
    page.about = { '@type': 'Country', name: 'Philippines' };
    page.author = { '@id': personId };
    graph.push(person);
  }

  if (config.schema === 'videos') {
    page.about = { '@id': personId };
    graph.push(person);
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function removeExistingSeo(html) {
  return html
    .replace(/\s*<meta\s+name=["'](?:description|author|robots)["'][^>]*>/gi, '')
    .replace(/\s*<meta\s+(?:property|name)=["'](?:og|twitter):[^"']+["'][^>]*>/gi, '')
    .replace(/\s*<link\s+rel=["'](?:canonical|alternate)["'][^>]*>/gi, '')
    .replace(/\s*<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
}

for (const [filename, config] of Object.entries(pages)) {
  const path = join(siteRoot, filename);
  let html = readFileSync(path, 'utf8');
  html = removeExistingSeo(html);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(config.title)}</title>`);
  html = html.replaceAll('href="index.html#', 'href="/#').replaceAll('href="index.html"', 'href="/"');

  const imageUrl = config.image ? absoluteAsset(config.image) : null;
  const meta = [
    `<meta name="description" content="${escapeHtml(config.description)}">`,
    '<meta name="author" content="Dainyel">',
    `<meta name="robots" content="${config.noindex ? 'noindex,nofollow,noarchive,noimageindex' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}">`,
    `<link rel="canonical" href="${config.canonical}">`,
    `<link rel="alternate" hreflang="en" href="${config.canonical}">`,
    `<meta property="og:type" content="${config.type}">`,
    '<meta property="og:site_name" content="DainyelOnTheMove">',
    `<meta property="og:title" content="${escapeHtml(config.title)}">`,
    `<meta property="og:description" content="${escapeHtml(config.description)}">`,
    `<meta property="og:url" content="${config.canonical}">`,
    '<meta property="og:locale" content="en_GB">',
    ...(imageUrl ? [`<meta property="og:image" content="${imageUrl}">`, `<meta property="og:image:alt" content="${escapeHtml(config.imageAlt)}">`] : []),
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(config.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(config.description)}">`,
    ...(imageUrl ? [`<meta name="twitter:image" content="${imageUrl}">`, `<meta name="twitter:image:alt" content="${escapeHtml(config.imageAlt)}">`] : [])
  ].join('\n  ');
  const schema = schemaFor(config);
  const schemaTag = schema ? `\n  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>` : '';
  html = html.replace(/<\/title>/i, `</title>\n  ${meta}${schemaTag}`);
  writeFileSync(path, html);
}

writeFileSync(join(siteRoot, 'robots.txt'), `User-agent: *\nDisallow: /admin.html\nDisallow: /studio\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');

const sitemapUrls = [
  `${siteUrl}/`,
  `${siteUrl}/about.html`,
  `${siteUrl}/destinations.html`,
  `${siteUrl}/blog.html`,
  `${siteUrl}/bali.html`,
  `${siteUrl}/thailand-solo.html`,
  `${siteUrl}/philippines.html`,
  `${siteUrl}/videos.html`,
  `${siteUrl}/qa.html`,
  `${siteUrl}/my-kit.html`
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
writeFileSync(join(siteRoot, 'sitemap.xml'), sitemap, 'utf8');

const firebasePath = join(siteRoot, 'firebase.json');
const firebase = JSON.parse(readFileSync(firebasePath, 'utf8'));
const staging = firebase.hosting.find((entry) => entry.target === 'staging');
const hasStagingNoindex = staging.headers.some((entry) => entry.source === '**' && entry.headers.some((header) => header.key === 'X-Robots-Tag'));
if (!hasStagingNoindex) {
  staging.headers.unshift({
    source: '**',
    headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, noimageindex' }]
  });
}
writeFileSync(firebasePath, `${JSON.stringify(firebase, null, 2)}\n`, 'utf8');

console.log(`SEO metadata applied to ${Object.keys(pages).length} pages.`);
