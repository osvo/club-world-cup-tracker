/* ---------- scoring helper ---------- */
function points(pred, actual) {
  if (!pred) return 0;
  const [ph, pa] = pred.split('-').map(Number);
  const [ah, aa] = actual.split('-').map(Number);
  if (ph === ah && pa === aa) return 5;
  const dPred = ph - pa, dAct = ah - aa;
  if (dPred === dAct) return 3;
  if (Math.sign(dPred) === Math.sign(dAct)) return 2;
  return 0;
}

/* ---------- colour util: value→HSL (red-yellow-green) ---------- */
function colourFor(val, min, max) {
  if (max === min) return 'hsl(60 70% 50%)';     // neutral yellow
  const ratio = (val - min) / (max - min);       // 0→1
  const hue = 0 + (120 * ratio);                 // 0=red → 120=green
  return `hsl(${hue} 70% 50%)`;
}

/* ---------- main ---------- */
(async () => {
  const csv = await (await fetch('data.csv?nocache=' + Date.now())).text();
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

  const friends = Object.keys(data[0]).slice(4);
  if (!friends.length) return;

  /* ----- cumulative totals ----- */
  const dates = [...new Set(data.map(r => r.date))].sort();
  const totals = Object.fromEntries(friends.map(f => [f, Array(dates.length).fill(0)]));

  dates.forEach((d, i) => {
    const todays = data.filter(r => r.date === d);
    friends.forEach(f => {
      const today = todays.reduce((s, r) => s + points(r[f], r.score), 0);
      totals[f][i] = (totals[f][i - 1] || 0) + today;
    });
  });

  const latest = friends.map(f => totals[f].at(-1));
  const minPts = Math.min(...latest);
  const maxPts = Math.max(...latest);

  /* ----- Chart.js ----- */
  Chart.register(ChartZoom);
  const ctx = document.getElementById('cumulative');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: friends.map((f, i) => {
        const c = colourFor(latest[i], minPts, maxPts);
        return {
          label: f,
          data: totals[f],
          borderColor: c,
          backgroundColor: c + ' / 0.25',
          pointBackgroundColor: c,
          tension: 0.25,
          pointRadius: 5,
          pointHoverRadius: 7
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ${c.parsed.y} pts` } },
        zoom: {
          pan:  { enabled: true, mode: 'xy' },       // free-drag
          zoom: { wheel:{enabled:true}, pinch:{enabled:true}, mode:'xy' }
        }
      },
      scales: {
        x:{ title:{ display:true, text:'Match date' } },
        y:{ title:{ display:true, text:'Total points' }, beginAtZero:true }
      }
    }
  });
  document.getElementById('resetZoom').onclick = () => chart.resetZoom();

  /* ----- Leaderboard table ----- */
  const tableData = friends.map((f, i) => ({
    friend: f,
    pts: latest[i],
    color: colourFor(latest[i], minPts, maxPts)
  })).sort((a,b)=>b.pts - a.pts);   // highest first

  const table = new DataTable('#leaderboard', {
    data: tableData,
    columns: [
      { title:'Friend', data:'friend',
        render:data=>`<span style="font-weight:600">${data}</span>` },
      { title:'Points', data:'pts',
        render:(d,_,row)=>`<span style="color:${row.color};font-weight:600">${d}</span>` }
    ],
    paging:false,
    searching:false,
    info:false,
    order:[[1,'desc']]
  });
})();
