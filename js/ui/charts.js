// Chart.js factories pre-wired with design tokens. Destroys any previous
// instance on the same canvas before rendering (avoids Chart.js leaks on route changes).

function tokenColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function destroyExisting(canvas) {
  if (canvas._chartInstance) {
    canvas._chartInstance.destroy();
    canvas._chartInstance = null;
  }
}

function baht(value) {
  return `฿${Math.round(value).toLocaleString('en-US')}`;
}

const FONT_FAMILY = "'Noto Sans Thai', system-ui, sans-serif";

export function makeDoughnut(canvas, { labels, data, colors }) {
  destroyExisting(canvas);
  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
      }],
    },
    options: {
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { family: FONT_FAMILY },
          titleFont: { family: FONT_FAMILY },
          callbacks: {
            label: (ctx) => `${ctx.label}: ${baht(ctx.raw)}`,
          },
        },
      },
      maintainAspectRatio: false,
    },
  });
  canvas._chartInstance = chart;
  return chart;
}

export function makeBar(canvas, { labels, data, colors, onBarClick, stepSize } = {}) {
  destroyExisting(canvas);
  const textSecondary = tokenColor('--color-text-secondary');
  const borderSoft = tokenColor('--color-border-soft');

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderRadius: 6,
        maxBarThickness: 40,
      }],
    },
    options: {
      maintainAspectRatio: false,
      onClick: (evt, elements) => {
        if (elements.length && onBarClick) {
          onBarClick(elements[0].index);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { family: FONT_FAMILY },
          titleFont: { family: FONT_FAMILY },
          callbacks: {
            label: (ctx) => baht(ctx.raw),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: FONT_FAMILY }, color: textSecondary },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: { family: FONT_FAMILY },
            color: textSecondary,
            stepSize: stepSize || undefined,
            callback: (value) => value >= 1000 ? `${value / 1000}k` : value,
          },
          grid: { color: borderSoft },
        },
      },
    },
  });
  canvas._chartInstance = chart;
  return chart;
}
