/* =========================================================
   1.  Helpers
========================================================= */
// 1-a  points awarded for a prediction
function points(pred, actual) {
  if (!pred) return 0;
  const [ph, pa] = pred.split('-').map(Number);
  const [ah, aa] = actual.split('-').map(Number);
  if (ph === ah && pa === aa) return 5;                    // exact
  const dPred = ph - pa, dAct = ah - aa;
  if (dPred === dAct) return 3;                            // same diff
  if (Math.sign(dPred) === Math.sign(dAct)) return 2;      // same outcome
  return 0;
}

// 1-b  cell colour for an individual prediction (0-5 pts)
function colourForPts(pts) {
  const hues = { 0: 0, 1: 20, 2: 40, 3: 60, 4: 90, 5: 120 };   // red→green
  return `hsl(${hues[pts]} 75% 55%)`;
}

// 1-c  line / legend colour for overall totals (red-green gradient)
function colourForTotal(val, min, max) {
  if (max === min) return 'hsl(60 70% 50%)';
  const ratio = (val - min) / (max - min);          // 0-1
  return `hsl(${ratio * 120} 70% 50%)`;
}

/* =========================================================
   2.  Main: load CSV, build data structures
========================================================= */
(async () => {
  const csvText = await (await fetch('data.csv?nocache=' + Date.now())).text();
  const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  const friends = Object.keys(data[0]).slice(4);          // columns after 'score'
  if (!friends.length) return;                            // nothing to show

  /* ---- per-match scoring & enrichment ---- */
  data.forEach(r => {
    r.match = `${r.local} vs ${r.visitor}`;
    friends.forEach(f => {
      r[`${f}_pts`] = points(r[f], r.score);
    });
  });

  /* ---- cumulative totals for chart ---- */
  const dates  = [...new Set(data.map(r => r.date))].sort();
  const totals = Object.fromEntries(friends.map(f => [f, Array(dates.length).fill(0)]));

  dates.forEach((d, i) => {
    const todays = data.filter(r => r.date === d);
    friends.forEach(f => {
      const todayPts = todays.reduce((s, r) => s + r[`${f}_pts`], 0);
      totals[f][i]   = (totals[f][i-1] || 0) + todayPts;
    });
  });

  const latestTotals = friends.map(f => totals[f].at(-1));
  const minPts = Math.min(...latestTotals);
  const maxPts = Math.max(...latestTotals);

  /* =======================================================
     3.  Chart.js  (left-drag pan, wheel/pinch zoom)
  ======================================================= */
  Chart.register(ChartZoom);
  const ctx = document.getElementById('cumulative');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: friends.map((f, i) => {
        const col = colourForTotal(latestTotals[i], minPts, maxPts);
        return {
          label: f,
          data: totals[f],
          borderColor: col,
          backgroundColor: `${col} / 0.25`,
          pointBackgroundColor: col,
          tension: 0.25,
          pointRadius: 4,
          pointHoverRadius: 6
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend:  { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y} pts` } },
        zoom: {
          pan:  {
            enabled: true,
            mode: 'xy',
            threshold: 3,           // pixels before pan starts
            modifierKey: null,      // left-click only, no Ctrl/Alt
            onPanStart: () => ctx.style.cursor = 'grabbing',
            onPanComplete: () => ctx.style.cursor = 'grab'
          },
          zoom: { wheel: { enabled:true }, pinch:{ enabled:true }, mode:'xy' }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Match date' } },
        y: { title: { display: true, text: 'Total points' }, beginAtZero: true }
      }
    }
  });
  ctx.style.cursor = 'grab';                                   // default
  document.getElementById('resetZoom').onclick = () => chart.resetZoom();

  /* =======================================================
     4.  Colour legend (0-5 pts)
  ======================================================= */
  const legend = document.getElementById('pts-legend');
  legend.innerHTML = [0,1,2,3,4,5].map(pts =>
    `<span class="legend-box" style="background:${colourForPts(pts)}"></span>${pts}`
  ).join(' ');

  /* =======================================================
     5.  Build full match-table data & column config
  ======================================================= */
  const tableData = data.map(r => {
    const row = { date: r.date, match: r.match, actual: r.score };
    friends.forEach(f => {
      row[f]       = r[f] || '';
      row[`${f}_pts`] = r[`${f}_pts`];
    });
    return row;
  });

  const columns = [
    { title: 'Date',   data: 'date' },
    { title: 'Match',  data: 'match' },
    { title: 'Score',  data: 'actual' },
    ...friends.map(f => ({
      title: f,
      data: f,
      createdCell: (td, cellData, rowData) => {
        const pts = rowData[`${f}_pts`];
        td.style.background = colourForPts(pts);
        td.style.color = '#000';
        td.title = `${pts} pts`;
      }
    }))
  ];

  /* =======================================================
     6.  DataTable: vertical scroll (60 vh) + horizontal scroll
  ======================================================= */
  new DataTable('#leaderboard', {
    data: tableData,
    columns,
    order: [[0, 'asc']],
    paging: false,
    scrollY: '60vh',
    scrollX: true,
    scrollCollapse: true
  });
})();
