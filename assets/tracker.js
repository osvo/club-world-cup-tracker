/* ==== helpers ====================================================== */
// points
const pts = (p, a) => {
  if (!p) return 0;
  const [ph, pa] = p.split('-').map(Number);
  const [ah, aa] = a.split('-').map(Number);
  const d = ph - pa, D = ah - aa;
  if (ph === ah && pa === aa) return 5;
  if (d === D) return 3;
  if (Math.sign(d) === Math.sign(D)) return 2;
  return 0;
};

// palette for point scores: 0=red,2=blue,3=orange,5=green
const huePts = { 0: 0, 2: 210, 3: 30, 5: 120 };
const colPts = n => `hsl(${huePts[n] ?? 0} 75% 55%)`;

/* ==== main ========================================================= */
(async () => {
  // CSV
  const csv = await (await fetch('data.csv?nocache=' + Date.now())).text();
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const friends = Object.keys(data[0]).slice(4);
  if (!friends.length) return;

  // categorical palette: unique color per friend
  const palette = friends.map((_, i) => {
    const hue = Math.round(i * 360 / friends.length);
    return `hsl(${hue} 70% 50%)`;
  });

  data.forEach(r => {
    r.match = `${r.local} vs ${r.visitor}`.slice(0, 24);
    friends.forEach(f => r[`${f}_pts`] = pts(r[f], r.score));
  });

  // cumulative totals
  const dates = [...new Set(data.map(r => r.date))].sort();
  const totals = Object.fromEntries(friends.map(f => [f, Array(dates.length).fill(0)]));
  dates.forEach((d, i) => friends.forEach(f => {
    totals[f][i] = (totals[f][i - 1] || 0) + data.filter(r => r.date === d).reduce((s, r) => s + r[`${f}_pts`], 0);
  }));
  const last = friends.map(f => totals[f].at(-1)), min = Math.min(...last), max = Math.max(...last);

  /* ==== chart (pan+zoom) ========================================== */
  Chart.register(ChartZoom);
  const ctx = document.getElementById('cumulative');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: friends.map((f, i) => {
        const color = palette[i];
        return {
          label: f,
          data: totals[f],
          borderColor: color,
          backgroundColor: color.replace(/hsl\(([^)]+)\)/, 'hsla($1,0.2)'),
          pointBackgroundColor: color,
          tension: .25,
          pointRadius: 4,
          pointHoverRadius: 6
        };
      })
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        zoom: {
          pan: { enabled: true, mode: 'xy', onPanStart: () => ctx.style.cursor = 'grabbing', onPanComplete: () => ctx.style.cursor = 'grab' },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Match date' } },
        y: { beginAtZero: true, title: { display: true, text: 'Total points' } }
      }
    }
  });
  ctx.style.cursor = 'grab';
  document.getElementById('resetZoom').onclick = () => chart.resetZoom();

  /* ==== legend ===================================================== */
  const legend = document.getElementById('pts-legend');
  legend.innerHTML = [0, 2, 3, 5].map(n => `<span class="legend-box" style="background:${colPts(n)}"></span>${n}`).join(' ');

  /* ==== DataTable ================================================== */
  const tableData = data.map(r => {
    const row = { date: r.date, match: r.match, actual: r.score };
    friends.forEach(f => { row[f] = r[f] || ''; row[`${f}_pts`] = r[`${f}_pts`]; });
    return row;
  });

  const columns = [
    { title: 'Date', data: 'date' },
    { title: 'Match', data: 'match', className: 'match-cell' },
    { title: 'Score', data: 'actual' },
    ...friends.map((f) => ({
      title: f,
      data: f,
      createdCell: (td, _, row) => { const p = row[`${f}_pts`]; td.style.background = colPts(p); }
    }))
  ];

  new DataTable('#leaderboard', {
    data: tableData,
    columns,
    order: [[0, 'asc']],
    paging: false,
    scrollY: '60vh',
    scrollX: true,
    scrollCollapse: true
  });

  /* ==== splitter =================================================== */
  const drag = document.getElementById('dragBar'), chartPane = document.getElementById('chartPane'), tablePane = document.getElementById('tablePane');
  let startX, startLeft;
  drag.addEventListener('mousedown', e => {
    startX = e.clientX; startLeft = chartPane.getBoundingClientRect().width;
    document.body.style.userSelect = 'none';
    const move = e2 => { const dx = e2.clientX - startX; chartPane.style.flexBasis = `${startLeft + dx}px`; };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.userSelect = 'auto'; };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  });
})();
