import type { ChartOptions } from 'chart.js';

export const CHART_PALETTE = [
  '#4f46e5',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#059669',
  '#0284c7',
  '#6366f1',
  '#a855f7',
];

export const barChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      padding: 12,
      cornerRadius: 8,
      titleFont: { size: 13, weight: 'bold' },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#64748b', font: { size: 11, weight: 500 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.2)' },
      ticks: { color: '#64748b' },
    },
  },
};

export const pieChartOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 18,
        color: '#475569',
        font: { size: 12, weight: 500 },
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      padding: 12,
      cornerRadius: 8,
    },
  },
};

export function barDataset(label: string, data: number[]) {
  return {
    labels: data.map((_, i) => ''),
    datasets: [
      {
        label,
        data,
        backgroundColor: CHART_PALETTE.map((c) => `${c}cc`),
        hoverBackgroundColor: CHART_PALETTE,
        borderRadius: 10,
        borderSkipped: false,
        maxBarThickness: 48,
      },
    ],
  };
}

export function withBarLabels(labels: string[], label: string, data: number[]) {
  return {
    labels,
    datasets: [
      {
        label,
        data,
        backgroundColor: labels.map((_, i) => `${CHART_PALETTE[i % CHART_PALETTE.length]}cc`),
        hoverBackgroundColor: labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
        borderRadius: 10,
        borderSkipped: false,
        maxBarThickness: 48,
      },
    ],
  };
}

export function pieDataset(labels: string[], data: number[]) {
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: labels.map((_, i) => `${CHART_PALETTE[i % CHART_PALETTE.length]}dd`),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 8,
      },
    ],
  };
}
