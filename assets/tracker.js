/* ---------------------------------------------------------
   Points helper (unchanged)
--------------------------------------------------------- */
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

/* ---------------------------------------------------------
   Build dataset & draw interactive chart
--------------------------------------------------------- */
(async () => {
  const csv = await (await fetch('data.csv?nocache=' + Date.now())).text();
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

  const friendNames = Object.keys(data[0]).slice(4);
  if (friendNames.length === 0) return;   // nothing to plot

  const dates  = [...new Set(data.map(r => r.date))].sort();
  const totals = Object.fromEntries(friendNames.map(f => [f, Array(dates.length).fill(0)]));

  dates.forEach((d, i) => {
    const todays = data.filter(r => r.date === d);
    friendNames.forEach(f => {
      const today = todays.reduce((s, r) => s + points(r[f], r.score), 0);
      totals[f][i] = (totals[f][i-1] || 0) + today;
    });
  });

  /* ---- Chart.js ---- */
  const ctx = document.getElementById('cumulative');
  const colour = i => `hsl(${(i * 57) % 360} 70% 50%)`;

  // Register the zoom plugin (already loaded from CDN)
  Chart.register(ChartZoom);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: friendNames.map((f, i) => ({
        label: f,
        data: totals[f],
        borderColor: colour(i),
        backgroundColor: colour(i) + ' / 0.15',
        tension: 0.25,
        pointRadius: 4,
        pointHoverRadius: 6
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,     // let CSS decide the height
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: {
          callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y} pts` }
        },
        zoom: {
          limits: {
            y: { min: 0 }   // never pan below 0 pts
          },
          pan: {
            enabled: true,
            mode: 'xy',
            modifierKey: 'ctrl',   // ctrl+drag to pan (avoids accidental drags)
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'xy'
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Match date' } },
        y: { title: { display: true, text: 'Total points' }, beginAtZero: true }
      }
    }
  });

  /* ---- Reset zoom button ---- */
  document.getElementById('resetZoom').onclick = () => chart.resetZoom();
})();
