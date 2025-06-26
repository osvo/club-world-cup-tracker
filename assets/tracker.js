/* -------- points helper (unchanged) -------- */
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

/* ---- build data + interactive chart ---- */
(async () => {
  const csv = await (await fetch('data.csv?nocache=' + Date.now())).text();
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

  const friends = Object.keys(data[0]).slice(4);
  if (!friends.length) return;

  const dates  = [...new Set(data.map(r => r.date))].sort();
  const totals = Object.fromEntries(friends.map(f => [f, Array(dates.length).fill(0)]));

  dates.forEach((d, i) => {
    const todays = data.filter(r => r.date === d);
    friends.forEach(f => {
      const today = todays.reduce((s, r) => s + points(r[f], r.score), 0);
      totals[f][i] = (totals[f][i - 1] || 0) + today;
    });
  });

  /* -- chart -- */
  Chart.register(ChartZoom);                     // activate the plugin
  const ctx = document.getElementById('cumulative');
  const colour = i => `hsl(${(i * 57) % 360} 70% 50%)`;

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: friends.map((f, i) => ({
        label: f,
        data: totals[f],
        borderColor: colour(i),
        backgroundColor: `${colour(i)} / 0.15`,
        tension: 0.25,
        pointRadius: 4,
        pointHoverRadius: 6
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,   // CSS controls height
      plugins: {
        legend:   { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip:  { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y} pts` } },
        zoom: {
          limits: { y: { min: 0 } },
          pan:   { enabled: true, mode: 'xy', modifierKey: 'ctrl' },
          zoom:  { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Match date' } },
        y: { title: { display: true, text: 'Total points' }, beginAtZero: true }
      }
    }
  });

  /* reset-zoom button */
  document.getElementById('resetZoom').onclick = () => chart.resetZoom();
})();
