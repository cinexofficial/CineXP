import { createServer } from 'node:http';

// Local catalog responses keep browser tests independent of API keys and live ads.
const movie = (id, title, genre, backdrop = true) => ({
  id, title, media_type: 'movie', overview: `A story about ${title.toLowerCase()}.`,
  release_date: '2024-03-01', poster_path: `/poster-${id}.jpg`, backdrop_path: backdrop ? `/backdrop-${id}.jpg` : null,
  vote_average: 8.1, vote_count: 400, popularity: 100, genre_ids: [genre], genres: [{ id: genre, name: genre === 878 ? 'Science Fiction' : 'Drama' }], runtime: 142,
});
const demo = process.env.CINEXP_DEMO_CATALOG === 'true';
const movies = demo ? [
  { ...movie(157336, 'Interstellar', 878), poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', backdrop_path: '/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg', release_date: '2014-11-05', overview: 'A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.' },
  { ...movie(438631, 'Dune', 878), poster_path: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', backdrop_path: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', release_date: '2021-09-15' },
  { ...movie(872585, 'Oppenheimer', 18), poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', backdrop_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', release_date: '2023-07-19' },
  { ...movie(414906, 'The Batman', 53), poster_path: '/74xTEgt7R36Fpooo50r9T25onhq.jpg', backdrop_path: '/74xTEgt7R36Fpooo50r9T25onhq.jpg', release_date: '2022-03-01' },
] : [movie(101, 'Across the Stars', 878), movie(102, 'A Quiet Morning', 18), movie(103, 'The Last Horizon', 878), movie(104, 'A Different Summer', 35), movie(105, 'Under the Surface', 53), movie(106, 'Northern Lights', 18)];
const series = demo ? [] : movies.map((item, index) => ({ ...item, media_type: 'tv', id: 201 + index, name: `Series ${index + 1}`, title: undefined, first_air_date: '2024-05-01', number_of_seasons: 2, seasons: [{ id: 1, season_number: 1, episode_count: 8 }] }));
const items = [...movies, ...series];
let adMode = 'rendered';
let adRequests = 0;
let trailers = false;
createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4010');
  if (url.pathname === '/ad-fixture-control') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const control = JSON.parse(body || '{}');
        adMode = control.mode || 'rendered'; adRequests = 0;
        trailers = control.trailers === true;
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}');
      });
    } else { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ adRequests })); }
    return;
  }
  if (url.pathname.startsWith('/ad-fixture/')) {
    adRequests++;
    res.writeHead(adMode === 'blocked' ? 404 : 200, { 'Content-Type': 'application/javascript' });
    const body = adMode === 'attack' ? `document.body.insertAdjacentHTML('beforeend','<button id="attack">Test protection</button><a>Test advertisement</a>');function attack(){try{window.open('https://example.com/unwanted')}catch{};try{top.location.href='https://example.com/hijack'}catch{}};attack();document.getElementById('attack').onclick=attack;`
      : `document.body.insertAdjacentHTML('beforeend','<a href="https://example.com/sponsor">Test advertisement</a>');`;
    if (adMode === 'stalled') setTimeout(() => res.end(body), 11000);
    else res.end(body);
    return;
  }
  let data;
  if (/^\/(movie|tv)\/\d+(\/|$)/.test(url.pathname)) {
    const [, type, rawId, suffix] = url.pathname.split('/');
    const match = items.find(item => item.id === Number(rawId) && item.media_type === type);
    data = suffix === 'recommendations' || suffix === 'similar' ? { results: items.filter(item => item.id !== Number(rawId)) } : suffix === 'videos' ? { results: trailers ? [{ key: 'fixture-trailer', name: 'Fixture trailer', site: 'YouTube', type: 'Trailer', official: true }] : [] } : match;
  } else if (url.pathname === '/search/multi') {
    const query = (url.searchParams.get('query') || '').toLowerCase();
    data = { results: items.filter(item => (item.title || item.name).toLowerCase().includes(query)) };
  } else if (url.pathname === '/discover/movie' || url.pathname === '/movie/popular' || url.pathname === '/movie/upcoming') data = { results: movies };
  else if (url.pathname === '/discover/tv' || url.pathname === '/tv/popular') data = { results: series };
  else data = { results: items };
  res.writeHead(data ? 200 : 404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data || { error: 'Unknown fixture' }));
}).listen(Number(process.env.CATALOG_PORT || 4010), '127.0.0.1');
