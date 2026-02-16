import { useTheme } from '../contexts/ThemeContext';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

function getThemeColors(theme) {
    const isDark = theme === 'dark';
    return {
        gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        textColor: isDark ? '#6b7394' : '#8b92a8',
        tooltipBg: isDark ? '#222738' : '#ffffff',
        tooltipBorder: isDark ? '#2a2f42' : '#e0e4ef',
        tooltipText: isDark ? '#f0f2f8' : '#1a1d2e',
    };
}

const PALETTE = ['#818cf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#f87171', '#22d3ee'];

export function LineChart({ labels, datasets, title, height = 260 }) {
    const { theme } = useTheme();
    const tc = getThemeColors(theme);

    const data = {
        labels,
        datasets: datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.data,
            borderColor: PALETTE[i % PALETTE.length],
            backgroundColor: PALETTE[i % PALETTE.length] + '22',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            tension: 0.4,
            fill: true,
        })),
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: datasets.length > 1, position: 'top', labels: { color: tc.textColor, font: { size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: {
                backgroundColor: tc.tooltipBg, titleColor: tc.tooltipText, bodyColor: tc.tooltipText,
                borderColor: tc.tooltipBorder, borderWidth: 1, padding: 10, cornerRadius: 8,
                titleFont: { weight: '600' }, bodyFont: { size: 12 },
            },
        },
        scales: {
            x: { grid: { color: tc.gridColor }, ticks: { color: tc.textColor, font: { size: 10 } } },
            y: { grid: { color: tc.gridColor }, ticks: { color: tc.textColor, font: { size: 10 } }, beginAtZero: true },
        },
    };

    return (
        <div className="chart-container">
            {title && <h4>{title}</h4>}
            <div className="chart-wrapper" style={{ height }}><Line data={data} options={options} /></div>
        </div>
    );
}

export function BarChart({ labels, datasets, title, height = 260 }) {
    const { theme } = useTheme();
    const tc = getThemeColors(theme);

    const barColors = ['#818cf8', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#60a5fa'];

    const data = {
        labels,
        datasets: datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.data,
            backgroundColor: barColors[i % barColors.length] + 'cc',
            borderColor: barColors[i % barColors.length],
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
        })),
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: datasets.length > 1, position: 'top', labels: { color: tc.textColor, font: { size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'rectRounded' } },
            tooltip: {
                backgroundColor: tc.tooltipBg, titleColor: tc.tooltipText, bodyColor: tc.tooltipText,
                borderColor: tc.tooltipBorder, borderWidth: 1, padding: 10, cornerRadius: 8,
                callbacks: {
                    afterBody(context) {
                        const total = context.reduce((s, c) => s + (c.raw || 0), 0);
                        const completed = context[0]?.raw || 0;
                        if (total > 0 && datasets.length > 1) {
                            const pct = Math.round((completed / total) * 100);
                            return [`Completion: ${pct}%`];
                        }
                        return [];
                    },
                },
            },
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: tc.textColor, font: { size: 10 } }, stacked: false },
            y: { grid: { color: tc.gridColor }, ticks: { color: tc.textColor, font: { size: 10 }, stepSize: 1 }, beginAtZero: true, stacked: false },
        },
    };

    return (
        <div className="chart-container">
            {title && <h4>{title}</h4>}
            <div className="chart-wrapper" style={{ height }}><Bar data={data} options={options} /></div>
        </div>
    );
}

// Center text plugin for doughnut
const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
        const { ctx, chartArea } = chart;
        const centerText = chart.config.options?.plugins?.centerText?.text;
        if (!centerText) return;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 20px Poppins, sans-serif';
        ctx.fillStyle = chart.config.options?.plugins?.centerText?.color || '#888';
        ctx.fillText(centerText, centerX, centerY);
        ctx.restore();
    },
};

ChartJS.register(centerTextPlugin);

export function DoughnutChart({ labels, data: dataValues, centerText, height = 200 }) {
    const { theme } = useTheme();
    const tc = getThemeColors(theme);

    const data = {
        labels,
        datasets: [{
            data: dataValues,
            backgroundColor: ['#818cf8', '#2a2f42', '#a78bfa', '#34d399', '#fbbf24'],
            borderColor: theme === 'dark' ? '#12151f' : '#ffffff',
            borderWidth: 3,
            hoverOffset: 6,
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: { display: false },
            centerText: { text: centerText, color: tc.tooltipText },
            tooltip: {
                backgroundColor: tc.tooltipBg, titleColor: tc.tooltipText, bodyColor: tc.tooltipText,
                borderColor: tc.tooltipBorder, borderWidth: 1, padding: 10, cornerRadius: 8,
            },
        },
    };

    return (
        <div className="chart-wrapper" style={{ height }}>
            <Doughnut data={data} options={options} />
        </div>
    );
}
