/*
 * Shared, editorial travel data. This is the single source for the public map
 * and the South America tracker. It contains only destinations supplied by Dainyel.
 */
window.travelData = {
  visitedDestinations: [
    {name:'Spain',region:'Europe',mapName:'Spain',year:'2020 · 2021 ×2 · 2024',listYear:'2020–24',tripDetails:'Spain · 2020; Barcelona · 2021 (two trips); Barcelona · 2024'},
    {name:'Italy',region:'Europe',mapName:'Italy',year:'2022 · 2023',listYear:'2022–23',tripDetails:'Milan · 2022; Rome · 2023'},
    {name:'Portugal',region:'Europe',mapName:'Portugal',year:'2023',tripDetails:'Portugal · 2023'},
    {name:'Belgium',region:'Europe',mapName:'Belgium',year:'2023',tripDetails:'Namur · 2023'},
    {name:'Poland',region:'Europe',mapName:'Poland',year:'2023',tripDetails:'Poland · 2023'},
    {name:'Sweden',region:'Europe',mapName:'Sweden',year:'2023',tripDetails:'Sweden · 2023'},
    {name:'Germany',region:'Europe',mapName:'Germany',year:'Every year',listYear:'Every year',tripDetails:'Germany · every year'},
    {name:'Denmark',region:'Europe',mapName:'Denmark',year:'2023',tripDetails:'Denmark · 2023'},
    {name:'Scotland',region:'Europe',mapName:'Scotland',year:'2023',tripDetails:'Scotland · 2023'},
    {name:'Vatican City',region:'Europe',mapName:null,year:'2023',tripDetails:'Vatican City · 2023',coordinates:[12.453,41.903]},
    {name:'Curaçao',region:'Caribbean',mapName:null,year:'2019 · 2022',listYear:'2019, 2022',tripDetails:'Curaçao · 2019; Curaçao · 2022',coordinates:[-69.0,12.15]},
    {name:'Aruba',region:'Caribbean',mapName:null,year:'2023',tripDetails:'Aruba · 2023',coordinates:[-70.0,12.5]},
    {name:'Tunisia',region:'North Africa',mapName:'Tunisia',year:'2024',tripDetails:'Tunisia · 2024'},
    {name:'Bali, Indonesia',region:'Southeast Asia',mapName:'Indonesia',year:'2024–2025',listYear:'2024–25',tripDetails:'Bali, Indonesia · 2024–2025',storyStatus:'Story published',storyText:'Read Dainyel’s personal story about three months in Bali for a study exchange.',storyHref:'bali.html',storyLink:'Read the Bali story ↗'},
    {name:'Thailand',region:'Southeast Asia',mapName:'Thailand',year:'2024 · 2025',listYear:'2024, 2025',tripDetails:'Thailand · 2024; Thailand · 2025',storyStatus:'Two stories available',storyText:'Read the three-month Thailand exchange story and the separate solo journey through Bangkok, Chiang Rai and Chiang Mai.',storyHref:'blog.html',storyLink:'Explore the Thailand stories ↗'},
    {name:'Philippines',region:'Southeast Asia',mapName:'Philippines',year:'2025',tripDetails:'Philippines · 2025',storyStatus:'Video preview available · story in progress',storyText:'A short whale shark video preview is ready while I work on the full Philippines story.',storyHref:'philippines.html',storyLink:'Watch the Philippines preview ↗'}
  ],
  southAmericaJourney: {
    label: 'South America journey',
    dateRange: '28 October 2026 – approximately 24/25 March 2027',
    sourceNote: 'This is Dainyel’s planned route. Status changes only when he shares a manual update or publishes real travel content.',
    stops: [
      {id:'curacao',order:1,country:'Curaçao',mapName:null,coordinates:[-69.0,12.15],status:'planned',detail:'Planned starting point. A previous visit is recorded separately on the travel atlas.'},
      {id:'peru',order:2,country:'Peru',mapName:'Peru',coordinates:[-75.0152,-9.19],status:'planned',detail:'Planned stop. The route details will be added from the road.'},
      {id:'colombia',order:3,country:'Colombia',mapName:'Colombia',coordinates:[-74.2973,4.5709],status:'planned',detail:'Planned stop. The route details will be added from the road.'},
      {id:'brazil',order:4,country:'Brazil',mapName:'Brazil',coordinates:[-51.9253,-14.235],status:'planned',detail:'Planned stop. The route details will be added from the road.'},
      {id:'guatemala',order:5,country:'Guatemala',mapName:'Guatemala',coordinates:[-90.2308,15.7835],status:'planned',detail:'Planned stop. The route details will be added from the road.'},
      {id:'el-salvador',order:6,country:'El Salvador',mapName:'El Salvador',coordinates:[-88.8965,13.7942],status:'planned',detail:'Planned stop. The route details will be added from the road.'},
      {id:'mexico',order:7,country:'Mexico',mapName:'Mexico',coordinates:[-102.5528,23.6345],status:'planned',detail:'Planned final stop. The route details will be added from the road.'}
    ]
  }
};
