let allRecords = [];
let filteredRecords = [];
let distanciaChart;
let trendChartLejos;
let trendChartIntermedio;
let trendChartCerca;
let currentPage = 1;
const recordsPerPage = 10;
let currentFilter = '';
let sortDirection = 1;
let sortColumn = 'fecha';

async function fetchRecords() {
  document.getElementById('loading').classList.remove('d-none');
  document.getElementById('error').style.display = 'none';
  try {
    const response = await axios.get('https://lockreminder.onrender.com/ver');
    allRecords = response.data
      .filter(record => record.distancia && record.nombre && record.fecha)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Ordenar por fecha descendente
    currentPage = 1;
    displayLastRecord(); // Mostrar el último registro
    applyFilters();
    animateElements();
  } catch (error) {
    let message = 'Error desconocido';
    if (error.response) {
      message = `Error del servidor: ${error.response.status}`;
    } else if (error.request) {
      message = 'No se pudo conectar con el servidor';
    } else {
      message = `Error: ${error.message}`;
    }
    document.getElementById('error').innerText = message;
    document.getElementById('error').style.display = 'block';
    anime({ targets: '#error', opacity: 1, translateY: 0, duration: 800, easing: 'easeOutQuad' });
  } finally {
    document.getElementById('loading').classList.add('d-none');
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => Cypress
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function filterByDistancia(distancia) {
  currentFilter = distancia;
  currentPage = 1;
  
  // Resaltar el enlace activo en el sidebar
  const filterLinks = ['filterTodas', 'filterLejos', 'filterIntermedio', 'filterCerca'];
  filterLinks.forEach(link => {
    document.getElementById(link).classList.remove('active');
  });
  if (distancia === '') {
    document.getElementById('filterTodas').classList.add('active');
  } else if (distancia === 'Lejos') {
    document.getElementById('filterLejos').classList.add('active');
  } else if (distancia === 'Intermedio') {
    document.getElementById('filterIntermedio').classList.add('active');
  } else if (distancia === 'Cerca') {
    document.getElementById('filterCerca').classList.add('active');
  }

  // Mostrar u ocultar gráficos de tendencia según el filtro
  const trendCharts = ['trendChartLejosContainer', 'trendChartIntermedioContainer', 'trendChartCercaContainer'];
  trendCharts.forEach(chart => {
    document.getElementById(chart).style.display = 'none';
  });

  if (distancia === '') {
    trendCharts.forEach(chart => {
      document.getElementById(chart).style.display = 'block';
    });
  } else if (distancia === 'Lejos') {
    document.getElementById('trendChartLejosContainer').style.display = 'block';
  } else if (distancia === 'Intermedio') {
    document.getElementById('trendChartIntermedioContainer').style.display = 'block';
  } else if (distancia === 'Cerca') {
    document.getElementById('trendChartCercaContainer').style.display = 'block';
  }

  applyFilters();
}

function searchRecords() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  filteredRecords = allRecords.filter(record =>
    (!currentFilter || record.distancia === currentFilter) &&
    (record.nombre.toLowerCase().includes(searchTerm) ||
     new Date(record.fecha).toLocaleString('es-ES').toLowerCase().includes(searchTerm))
  );
  currentPage = 1;
  displayLastRecord(); // Actualizar el último registro después de buscar
  updatePage();
  updateCharts(filteredRecords);
}

function sortRecords(column) {
  if (sortColumn === column) {
    sortDirection *= -1;
  } else {
    sortColumn = column;
    sortDirection = 1;
  }
  filteredRecords.sort((a, b) => {
    let valA = a[sortColumn] || '';
    let valB = b[sortColumn] || '';
    if (sortColumn === 'fecha') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }
    return valA > valB ? sortDirection : -sortDirection;
  });
  updatePage();
}

function applyFilters() {
  filteredRecords = allRecords.filter(record => 
    !currentFilter || record.distancia === currentFilter
  );
  displayLastRecord(); // Actualizar el último registro después de filtrar
  updatePage();
  updateCharts(filteredRecords);
  updateStats(filteredRecords);
}

function updateStats(data) {
  document.getElementById('totalRecords').innerText = data.length;
  const distanciaCounts = { Lejos: 0, Intermedio: 0, Cerca: 0 };
  data.forEach(record => {
    if (record.distancia in distanciaCounts) distanciaCounts[record.distancia]++;
  });
  document.getElementById('recordsLejos').innerText = distanciaCounts.Lejos;
  document.getElementById('recordsIntermedio').innerText = distanciaCounts.Intermedio;
  document.getElementById('recordsCerca').innerText = distanciaCounts.Cerca;
}

function displayLastRecord() {
  const lastRecord = allRecords[0]; // El primer registro después de ordenar por fecha descendente
  const lastRecordElement = document.getElementById('lastRecord');
  if (lastRecord) {
    const date = new Date(lastRecord.fecha);
    const formattedDate = date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    lastRecordElement.innerHTML = `
      <strong>Distancia:</strong> ${lastRecord.distancia || 'N/A'}<br>
      <strong>Nombre:</strong> ${lastRecord.nombre || 'N/A'}<br>
      <strong>Fecha:</strong> ${formattedDate || 'N/A'}
    `;
    anime({
      targets: '.card-primary:has(#lastRecord)',
      scale: [1, 1.05, 1],
      opacity: [0.8, 1],
      duration: 1000,
      easing: 'easeOutElastic(1, 0.5)'
    });
  } else {
    lastRecordElement.innerHTML = 'No hay datos disponibles';
  }
}

function displayRecords(data) {
  const recordsContainer = document.getElementById('records');
  recordsContainer.innerHTML = '';
  const start = (currentPage - 1) * recordsPerPage;
  const end = start + recordsPerPage;
  const paginatedData = data.slice(start, end);
  const lastRecord = allRecords[0]; // Último registro para comparar
  paginatedData.forEach(record => {
    const row = document.createElement('tr');
    const date = new Date(record.fecha);
    const formattedDate = date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const isLastRecord = lastRecord && record.fecha === lastRecord.fecha && record.nombre === lastRecord.nombre && record.distancia === lastRecord.distancia;
    row.innerHTML = `
      <td>${record.distancia || 'N/A'}${isLastRecord ? ' <span class="new-badge">Nuevo</span>' : ''}</td>
      <td>${record.nombre || 'N/A'}</td>
      <td>${formattedDate || 'N/A'}</td>
    `;
    if (isLastRecord) row.classList.add('highlight-last');
    recordsContainer.appendChild(row);
  });
  updatePagination(data);
  animateElements();
}

function updatePagination(data) {
  const totalPages = Math.ceil(data.length / recordsPerPage);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  pagination.innerHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(-1)">Anterior</a></li>`;
  pagination.innerHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(1)">Siguiente</a></li>`;
}

function updateCharts(data) {
  updateDistanciaChart(data);
  updateTrendChartLejos(data);
  updateTrendChartIntermedio(data);
  updateTrendChartCerca(data);
}

function updateDistanciaChart(data) {
  const distanciaCounts = { Lejos: 0, Intermedio: 0, Cerca: 0 };
  data.forEach(record => {
    if (record.distancia in distanciaCounts) distanciaCounts[record.distancia]++;
  });

  const ctx = document.getElementById('distanciaChart').getContext('2d');
  if (distanciaChart) distanciaChart.destroy();

  if (!currentFilter) {
    const chartData = [distanciaCounts.Lejos, distanciaCounts.Intermedio, distanciaCounts.Cerca];
    const total = chartData.reduce((a, b) => a + b, 0);

    distanciaChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Lejos', 'Intermedio', 'Cerca'],
        datasets: [{
          label: 'Distribución de Distancias',
          data: chartData,
          backgroundColor: ['#ff6384', '#36a2eb', '#4bc0c0'],
          borderColor: ['#fff', '#fff', '#fff'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 1000, easing: 'easeInOutQuad' },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${percentage}% (${value})`;
              }
            }
          }
        }
      }
    });
  } else {
    const value = distanciaCounts[currentFilter] || 0;

    distanciaChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [currentFilter],
        datasets: [{
          label: `Cantidad de "${currentFilter}"`,
          data: [value],
          backgroundColor: currentFilter === 'Lejos' ? '#ff6384' :
                          currentFilter === 'Intermedio' ? '#36a2eb' : '#4bc0c0',
          borderColor: '#ccc',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 1000, easing: 'easeInOutQuad' },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } },
          x: { title: { display: true, text: 'Distancia' } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

function updateTrendChartLejos(data) {
  const lejosData = data.filter(record => record.distancia === 'Lejos');
  const dates = {};
  lejosData.forEach(record => {
    const date = new Date(record.fecha).toLocaleDateString('es-ES');
    dates[date] = (dates[date] || 0) + 1;
  });

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  const labels = [];
  const values = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toLocaleDateString('es-ES');
    labels.push(dateStr);
    values.push(dates[dateStr] || 0);
  }

  const ctx = document.getElementById('trendChartLejos').getContext('2d');
  if (trendChartLejos) trendChartLejos.destroy();

  trendChartLejos = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Registros por Día (Lejos)',
        data: values,
        borderColor: '#ff6384',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 1000, easing: 'easeInOutQuad' },
      scales: {
        y: { 
          beginAtZero: true, 
          title: { display: true, text: 'Cantidad' },
          suggestedMax: Math.max(...values, 1) + 1
        },
        x: { title: { display: true, text: 'Fecha' } }
      },
      plugins: { 
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Registros: ${context.raw}`;
            }
          }
        }
      }
    }
  });
}

function updateTrendChartIntermedio(data) {
  const intermedioData = data.filter(record => record.distancia === 'Intermedio');
  const dates = {};
  intermedioData.forEach(record => {
    const date = new Date(record.fecha).toLocaleDateString('es-ES');
    dates[date] = (dates[date] || 0) + 1;
  });

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  const labels = [];
  const values = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toLocaleDateString('es-ES');
    labels.push(dateStr);
    values.push(dates[dateStr] || 0);
  }

  const ctx = document.getElementById('trendChartIntermedio').getContext('2d');
  if (trendChartIntermedio) trendChartIntermedio.destroy();

  trendChartIntermedio = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Registros por Día (Intermedio)',
        data: values,
        borderColor: '#36a2eb',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 1000, easing: 'easeInOutQuad' },
      scales: {
        y: { 
          beginAtZero: true, 
          title: { display: true, text: 'Cantidad' },
          suggestedMax: Math.max(...values, 1) + 1
        },
        x: { title: { display: true, text: 'Fecha' } }
      },
      plugins: { 
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Registros: ${context.raw}`;
            }
          }
        }
      }
    }
  });
}

function updateTrendChartCerca(data) {
  const cercaData = data.filter(record => record.distancia === 'Cerca');
  const dates = {};
  cercaData.forEach(record => {
    const date = new Date(record.fecha).toLocaleDateString('es-ES');
    dates[date] = (dates[date] || 0) + 1;
  });

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  const labels = [];
  const values = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toLocaleDateString('es-ES');
    labels.push(dateStr);
    values.push(dates[dateStr] || 0);
  }

  const ctx = document.getElementById('trendChartCerca').getContext('2d');
  if (trendChartCerca) trendChartCerca.destroy();

  trendChartCerca = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Registros por Día (Cerca)',
        data: values,
        borderColor: '#4bc0c0',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 1000, easing: 'easeInOutQuad' },
      scales: {
        y: { 
          beginAtZero: true, 
          title: { display: true, text: 'Cantidad' },
          suggestedMax: Math.max(...values, 1) + 1
        },
        x: { title: { display: true, text: 'Fecha' } }
      },
      plugins: { 
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Registros: ${context.raw}`;
            }
          }
        }
      }
    }
  });
}

function changePage(direction) {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  currentPage = Math.max(1, Math.min(currentPage + direction, totalPages));
  updatePage();
}

function updatePage() {
  displayRecords(filteredRecords);
}

function animateElements() {
  anime({
    targets: '.table-container, .chart-container, #error, .card-primary:not(:has(#lastRecord))',
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 800,
    easing: 'easeOutQuad',
    delay: anime.stagger(200)
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const navbar = document.querySelector('.main-header');
  navbar.classList.toggle('navbar-dark');
  navbar.classList.toggle('navbar-light');
  const sidebar = document.querySelector('.main-sidebar');
  sidebar.classList.toggle('sidebar-dark-primary');
  sidebar.classList.toggle('sidebar-light-primary');
}

// Inicialización
fetchRecords();
setInterval(fetchRecords, 60000);
document.getElementById('searchInput').addEventListener('input', debounce(searchRecords, 300));

// Mostrar todos los gráficos de tendencia al inicio
document.addEventListener('DOMContentLoaded', () => {
  const trendCharts = ['trendChartLejosContainer', 'trendChartIntermedioContainer', 'trendChartCercaContainer'];
  trendCharts.forEach(chart => {
    document.getElementById(chart).style.display = 'block';
  });
});