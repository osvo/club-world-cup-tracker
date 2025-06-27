/* ---------- helpers ------------------------------------------------------ */
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

/* colour scale: points → bg colour */
const ptsColor = { 0:'#ff6767', 2:'#f7c143', 3:'#b7e061', 5:'#28a745' };

/* ---------- main --------------------------------------------------------- */
(async () => {
  const csv = await (await fetch('data.csv?nocache=' + Date.now())).text();
  const { data } = Papa.parse(csv, { header:true, skipEmptyLines:true });

  const friends = Object.keys(data[0]).slice(4);
  if (!friends.length) return;

  /* ---- cumulative totals / latest ----- */
  const dates = [...new Set(data.map(r => r.date))].sort();
  const totals = Object.fromEntries(friends.map(f => [f, Array(dates.length).fill(0)]));
  dates.forEach((d,i)=>{
    const todayRows = data.filter(r=>r.date===d);
    friends.forEach(f=>{
      const todayPts = todayRows.reduce((s,r)=>s+points(r[f],r.score),0);
      totals[f][i] = (totals[f][i-1]||0)+todayPts;
    });
  });
  const latest = friends.map(f=>totals[f].at(-1));
  const minPts = Math.min(...latest), maxPts = Math.max(...latest);

  /* ---- CHART ------------------------------------------------------------ */
  Chart.register(ChartZoom);
  const ctx = document.getElementById('cumulative');
  const chart = new Chart(ctx,{
    type:'line',
    data:{
      labels:dates,
      datasets:friends.map((f,i)=>{
        const c = ptsColor[5 - Math.round((maxPts-latest[i])*5/(maxPts-minPts||1))] || '#888';
        return {
          label:f,
          data:totals[f],
          borderColor:c,
          backgroundColor:c+'33',
          pointBackgroundColor:c,
          tension:.25, pointRadius:5, pointHoverRadius:7
        };
      })
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8}},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.y} pts`}},
        zoom:{
          pan:{enabled:true,mode:'xy'},               // ← left-click drag
          zoom:{wheel:{enabled:true},pinch:{enabled:true},mode:'xy'}
        }
      },
      scales:{
        x:{title:{display:true,text:'Match date'}},
        y:{title:{display:true,text:'Total points'},beginAtZero:true}
      }
    }
  });
  document.getElementById('resetZoom').onclick=()=>chart.resetZoom();

  /* tweak cursor while panning */
  ctx.addEventListener('mousedown',()=>ctx.style.cursor='grabbing');
  window.addEventListener('mouseup',()=>ctx.style.cursor='grab');

  /* ---- MATCH TABLE ------------------------------------------------------ */
  // build rows
  const tableRows = data.map((r,idx)=>{
    const rowObj = {
      idx: idx+1,
      date: r.date,
      match: `${r.local} vs ${r.visitor}`,
      actual: r.score
    };
    friends.forEach(f=>{
      const pts = points(r[f],r.score);
      rowObj[f] = {
        text: r[f] || '—',
        pts
      };
    });
    return rowObj;
  });

  // DataTable columns
  const columns = [
    { title:'#',      data:'idx'   },
    { title:'Date',   data:'date'  },
    { title:'Match',  data:'match' },
    { title:'Result', data:'actual' },
    ...friends.map(f=>({
        title:f,
        data:`${f}`,
        render: cell => {
          const bg = ptsColor[cell.pts] || '#ddd';
          return `<span class="cell-pred" style="background:${bg}">${cell.text}</span>`;
        }
    }))
  ];

  new DataTable('#leaderboard',{
    data:tableRows,
    columns,
    paging:false, searching:false, info:false,
    order:[[0,'asc']],
    scrollX:true
  });
})();
