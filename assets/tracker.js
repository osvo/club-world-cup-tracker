/* ---------------------------------------------------------
   Points helper
--------------------------------------------------------- */
function points(pred, actual) {
  if (!pred) return 0;

  const [ph, pa] = pred.split('-').map(Number);
  const [ah, aa] = actual.split('-').map(Number);

  if (ph === ah && pa === aa) return 5;                     // exact

  const predDiff = ph - pa;
  const actDiff  = ah - aa;

  if (predDiff === actDiff) return 3;                       // same diff (draws included)

  if (Math.sign(predDiff) === Math.sign(actDiff)) return 2; // same outcome

  return 0;
}

/* ---------------------------------------------------------
   Build cumulative-points dataset & draw chart
--------------------------------------------------------- */
(async () => {
  const resp = await fetch('data.csv?nocache=' + Date.now());
  const csv  = await resp.text();
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

  // who are the friends? → columns after 'score'
  const friendNames = Object.keys(data[0]).slice(4);

  /* ---- cumulative totals per date ---- */
  const dates = [...new Set(data.map(r => r.date))].sort();
  const totals = Object.fromEntries(friendNames.map(f => [f, Array(dates.length).fill(0)]));

  dates.forEach((d, i) => {
    const todaysRows = data.filter(r => r.date === d);

    friendNames.forEach(f => {
      const ptsToday = todaysRows.reduce((sum, r) => sum + points(r[f], r.score), 0);
      totals[f][i] = (totals[f][i - 1] || 0) + ptsToday;
    });
  });

  /* ---- draw the line chart ---- */
  const ctx = document.getElementById('cumulative');

  // light, visually distinct colours for each friend
  const colour = idx => `hsl(${(idx * 57) % 360} 70% 50%)`;   // simple palette

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: friendNames.map((f, i) => ({
        label: f,
        data: totals[f],
        borderColor: colour(i),
        backgroundColor: colour(i) + ' / 0.15',
        tension: 0.25,
        pointRadius: 3
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 8 }
        },
        tooltip: {
          callbacks: {
            // show "N pts on DATE" tooltip
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} pts`
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Match date' } },
        y: { title: { display: true, text: 'Total points' }, beginAtZero: true }
      }
    }
  });
})();
