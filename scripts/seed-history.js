const fs = require('fs');

const cities = [
  {id:'new-york',lat:40.71,lon:-74.00},
  {id:'london',lat:51.50,lon:-0.12},
  {id:'tokyo',lat:35.67,lon:139.65},
  {id:'dubai',lat:25.20,lon:55.27},
  {id:'delhi',lat:28.61,lon:77.20},
  {id:'paris',lat:48.85,lon:2.35},
  {id:'singapore',lat:1.28,lon:103.85},
  {id:'sydney',lat:-33.86,lon:151.20},
  {id:'toronto',lat:43.70,lon:-79.41},
  {id:'berlin',lat:52.52,lon:13.40}
];

async function run() {
  const data = {};
  for (const c of cities) {
    console.log('Fetching', c.id);
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&past_days=7&hourly=temperature_2m,relative_humidity_2m`);
    data[c.id] = await res.json();
    
    const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${c.lat}&longitude=${c.lon}&past_days=7&hourly=us_aqi`);
    data[c.id].aqi = await aqiRes.json();
  }
  
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }
  
  fs.writeFileSync('data/historical_weather.json', JSON.stringify(data, null, 2));
  console.log('Weather saved to data/historical_weather.json');
}

run().catch(console.error);
