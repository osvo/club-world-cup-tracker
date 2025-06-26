/* ---------------------------------------------------------
   Helper: score-awarding function
--------------------------------------------------------- */
function points(pred, actual) {
  if (!pred) return 0;                         // empty cell → 0
  const [ph, pa] = pred.split('-').map(Number);
  const [ah, aa] = actual.split('-').map(Number);

  // exact score
  if (ph === ah && pa === aa) return 5;

  const predDiff   = ph - pa;
  const actDiff    = ah - aa;

  // same goal diff  (draws automatically included)
  if (predDiff === actDiff) return 3;

  // correct outcome (win/lose/draw)
  if (Math.sign(predDiff) === Math.sign(actDiff)) return 2;

  return 0;
}

/* ---------------------------------------------------------
   Main IIFE
--------------------------------------------------------- */
(async () => {
  /* ---------- 1. load CSV ---------- */
  const resp = await fetch('data.csv?nocache=' + Date.now());
  const csv  = await resp.text();
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

  /* ---------- 2. work out friend list ---------- */
  const friendNames = Object.keys(data[0]).slice(4);   // cols after 'score'

  /* ---------- 3. calculate points per row ---------- */
  data.forEach(r => {
    friendNames.forEach(f => {
      r[`${f}_pts`] = points(r[f], r.score);
    });
  });

  /* ---------- 4. DataTable ---------- */
  const columns = [
    { title: 'Date',    data: 'date'     },
    { title: 'Home',    data: 'local'    },
    { title: 'Away',    data: 'visitor'  },
    { title: 'Score',   data: 'score'    },
    ...friendNames.flatMap(f => ([
      { title: `${f} pick`, data: f },
      { title: `${f} pts`,  data: `${f}_pts` }
    ]))
  ];

  // initialise table
  const table = new DataTable('#matches', {
    data,
    columns,
    order: [[0, 'asc']],
    pageLength: 25
  });

  /* ---------- 5. custom filtering ---------- */
  const filterFn = row => {
    const from = document.getElementById('fromDate').value;
    const to   = document.getElementById('toDate').value;
    const team = document.getElementById('teamFilter').value.trim().toLowerCase();

    if (from && row.date < from) return false;
    if (to   && row.date > to)   return false;
    if (team && !(
          row.local.toLowerCase().includes(team) ||
          row.visitor.toLowerCase().includes(team))) return false;
    return true;
  };
  DataTable.ext.search.push(filterFn);
  document.getElementById('applyFilters').onclick = () => table.draw();

  /* ---------- 6. cumulative-points dataset ---------- */
  const dates = [...new Set(data.map(r => r.date))].sort();
  const cum = Object.fromEntries(friendNames.map(f => [f, Array(dates.length).fill(0)]));

  dates.forEach((d, i) => {
    const todays = data.filter(r => r.date === d);
    friendNames.forEach(f => {
      const ptsToday = todays.reduce((s, r) => s + r[`${f}_pts`], 0);
      cum[f][i] = (cum[f][i-1] || 0) + ptsToday;
    });
  });

  /* ---------- 7. Chart.js line chart ---------- */
  const ctx = document.getElementById('cumulative');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: friendNames.map(f => ({
        label: f,
        data: cum[f],
        tension: 0.25
      }))
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { x: { ticks: { autoSkip: true } } }
    }
  });
})();
