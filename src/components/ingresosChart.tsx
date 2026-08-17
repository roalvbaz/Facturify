'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Definimos los parámetros que recibirá el gráfico desde el servidor
interface IngresosChartProps {
  labels: string[];
  pagado: number[];
  pendiente: number[];
}

export default function IngresosChart({ labels, pagado, pendiente }: IngresosChartProps) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Pagado',
        data: pagado,
        backgroundColor: '#10b981', // Verde
        borderRadius: 4,
      },
      {
        label: 'Pendiente',
        data: pendiente,
        backgroundColor: '#f59e0b', // Naranja
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom' as const } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
  };

  return <Bar data={data} options={options} />;
}