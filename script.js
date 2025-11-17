// グローバル変数
let rawData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 25;
let charts = {};

// JSONファイルの読み込み
document.getElementById("jsonFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    try {
      parseJSON(JSON.parse(text));
    } catch (error) {
      document.getElementById("uploadStatus").innerHTML =
        '<span style="color: #f56565;">JSONの読み込みに失敗しました: ' + error.message + '</span>';
    }
  };
  reader.readAsText(file, "UTF-8");

  document.getElementById("uploadStatus").innerHTML =
    '<span style="color: #48bb78;">読み込み中...</span>';
});

// JSONパース関数
function parseJSON(data) {
  if (!Array.isArray(data)) {
    throw new Error("JSONはオブジェクトの配列である必要があります");
  }

  // 重複した「合計」エントリを除外してデータをクリーニング
  const cleanedData = data.filter(item => {
    // typeが「合計」で、categoryが「合計」の場合は除外（重複データ）
    if (item.type === "合計" && item.category === "合計") {
      return false;
    }
    return true;
  });

  rawData = cleanedData.map(item => {
    const maleStudent = item.population?.sutudent?.data?.find(d => d.type === "男")?.population || 0;
    const femaleStudent = item.population?.sutudent?.data?.find(d => d.type === "女")?.population || 0;
    
    // null値を0に変換
    const validMale = maleStudent === null ? 0 : maleStudent;
    const validFemale = femaleStudent === null ? 0 : femaleStudent;
    
    return {
      year: item.year,
      school: item.school,
      type: item.type,
      category: item.category,
      teacher: item.population?.teacher || 0,
      maleStudent: validMale,
      femaleStudent: validFemale,
      totalStudent: validMale + validFemale
    };
  });

  filteredData = [...rawData];
  
  if (rawData.length > 0) {
    document.getElementById(
      "uploadStatus"
    ).innerHTML = `<span style="color: #48bb78;">✓ ${rawData.length}件のデータを読み込みました</span>`;
    initializeFilters();
    updateDashboard();
  } else {
    document.getElementById("uploadStatus").innerHTML =
      '<span style="color: #f56565;">データの読み込みに失敗しました</span>';
  }
}

// フィルター初期化
function initializeFilters() {
  // 年度フィルター
  const years = [...new Set(rawData.map(d => d.year))].sort((a, b) => a - b);
  const yearFilter = document.getElementById("yearFilter");
  years.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year + "年度";
    yearFilter.appendChild(option);
  });

  // フィルターセクション表示
  document.getElementById("filterSection").classList.remove("hidden");
}

// フィルター変更イベント
document.getElementById("yearFilter").addEventListener("change", applyFilters);
document.getElementById("typeFilter").addEventListener("change", applyFilters);
document.getElementById("categoryFilter").addEventListener("change", applyFilters);

// フィルター適用
function applyFilters() {
  const year = document.getElementById("yearFilter").value;
  const type = document.getElementById("typeFilter").value;
  const category = document.getElementById("categoryFilter").value;

  filteredData = rawData.filter(row => {
    return (!year || row.year == year) &&
           (!type || row.type === type) &&
           (!category || row.category === category);
  });

  currentPage = 1;
  updateDashboard();
}

// ダッシュボード更新
function updateDashboard() {
  // セクション表示
  document.getElementById("summarySection").classList.remove("hidden");
  document.getElementById("chartsSection").classList.remove("hidden");
  document.getElementById("changeRateSection").classList.remove("hidden");
  document.getElementById("teacherSection").classList.remove("hidden");
  document.getElementById("tableSection").classList.remove("hidden");

  // サマリーカード更新
  updateSummaryCards();

  // チャート更新
  updateCharts();

  // テーブル更新
  updateTable();
}

// サマリーカード更新
function updateSummaryCards() {
  // 学校数
  const totalSchools = filteredData.reduce((sum, d) => sum + d.school, 0);
  document.getElementById("schoolCount").textContent = totalSchools;

  // 教員数
  const totalTeachers = filteredData.reduce((sum, d) => sum + d.teacher, 0);
  document.getElementById("teacherCount").textContent = totalTeachers.toLocaleString();

  // 生徒数（計）
  const totalStudents = filteredData.reduce((sum, d) => sum + d.totalStudent, 0);
  document.getElementById("totalStudent").textContent = totalStudents.toLocaleString();

  // 男女比
  const totalMale = filteredData.reduce((sum, d) => sum + d.maleStudent, 0);
  const totalFemale = filteredData.reduce((sum, d) => sum + d.femaleStudent, 0);
  const malePercent = totalStudents > 0 ? ((totalMale / totalStudents) * 100).toFixed(1) : 0;
  document.getElementById("genderRatio").textContent = `男 ${malePercent}%`;
}

// チャート更新
function updateCharts() {
  updateGenderChart();
  updateCategoryChart();
  updateTypeChart();
  updateYearTrendChart();
  updateTeacherChart();
  updateChangeRateChart();
}

// 性別生徒数チャート
function updateGenderChart() {
  const totalMale = filteredData.reduce((sum, d) => sum + d.maleStudent, 0);
  const totalFemale = filteredData.reduce((sum, d) => sum + d.femaleStudent, 0);

  if (charts.gender) charts.gender.destroy();

  const ctx = document.getElementById("genderChart").getContext("2d");
  charts.gender = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["男", "女"],
      datasets: [{
        data: [totalMale, totalFemale],
        backgroundColor: ["#FFB3D9", "#B3E5FC"],
        borderColor: ["#FFC0E0", "#C0F0FF"],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

// 学校種別別生徒数チャート
function updateCategoryChart() {
  const byCategory = {};
  filteredData.forEach(d => {
    if (!byCategory[d.category]) {
      byCategory[d.category] = 0;
    }
    byCategory[d.category] += d.totalStudent;
  });

  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  const colors = ["#FFD9B3", "#FFB3D9"];

  if (charts.category) charts.category.destroy();

  const ctx = document.getElementById("categoryChart").getContext("2d");
  charts.category = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "生徒数",
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString();
            }
          }
        },
      },
    },
  });
}

// 設置種別別生徒数チャート
function updateTypeChart() {
  const byType = {};
  filteredData.forEach(d => {
    if (!byType[d.type]) {
      byType[d.type] = 0;
    }
    byType[d.type] += d.totalStudent;
  });

  const labels = Object.keys(byType);
  const data = Object.values(byType);
  const colors = ["#FFB3D9", "#FFD9B3", "#B3E5FC", "#D9A5FF"];

  if (charts.type) charts.type.destroy();

  const ctx = document.getElementById("typeChart").getContext("2d");
  charts.type = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: "#fff",
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

// 年度別推移チャート
function updateYearTrendChart() {
  const byYear = {};
  filteredData.forEach(d => {
    if (!byYear[d.year]) {
      byYear[d.year] = { male: 0, female: 0 };
    }
    byYear[d.year].male += d.maleStudent;
    byYear[d.year].female += d.femaleStudent;
  });

  const years = Object.keys(byYear).sort((a, b) => a - b);
  const maleData = years.map(year => byYear[year].male);
  const femaleData = years.map(year => byYear[year].female);

  if (charts.yearTrend) charts.yearTrend.destroy();

  const ctx = document.getElementById("yearTrendChart").getContext("2d");
  charts.yearTrend = new Chart(ctx, {
    type: "line",
    data: {
      labels: years.map(y => y + "年度"),
      datasets: [
        {
          label: "女",
          data: femaleData,
          borderColor: "#FFB3D9",
          backgroundColor: "rgba(255, 179, 217, 0.1)",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "男",
          data: maleData,
          borderColor: "#B3E5FC",
          backgroundColor: "rgba(179, 229, 252, 0.1)",
          borderWidth: 2,
          tension: 0.3,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString();
            }
          }
        },
      },
    },
  });
}

// 教員数チャート
function updateTeacherChart() {
  const teacherData = {};
  filteredData.forEach(d => {
    const key = d.type + " - " + d.category;
    if (!teacherData[key]) {
      teacherData[key] = 0;
    }
    teacherData[key] += d.teacher;
  });

  const labels = Object.keys(teacherData);
  const data = Object.values(teacherData);
  const colors = ["#FFB3D9", "#FFD9B3", "#B3E5FC", "#D9A5FF", "#B3FFD9", "#FFFFC0"];

  if (charts.teacher) charts.teacher.destroy();

  const ctx = document.getElementById("teacherChart").getContext("2d");
  charts.teacher = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "教員数",
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString();
            }
          }
        },
      },
    },
  });
}

// テーブル更新
function updateTable() {
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageData = filteredData.slice(start, end);

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  pageData.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.year}年度</td>
      <td>${row.type}</td>
      <td>${row.category}</td>
      <td>${row.school}</td>
      <td>${row.teacher}</td>
      <td>${row.maleStudent.toLocaleString()}</td>
      <td>${row.femaleStudent.toLocaleString()}</td>
      <td>${row.totalStudent.toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });

  updatePagination();
}

// ページネーション更新
function updatePagination() {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  document.getElementById(
    "pageInfo"
  ).textContent = `${currentPage} / ${totalPages}`;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

// 検索機能
document.getElementById("searchInput").addEventListener("input", function (e) {
  const searchTerm = e.target.value.toLowerCase();
  filteredData = rawData.filter((row) => {
    return Object.values(row).some((value) =>
      String(value).toLowerCase().includes(searchTerm)
    );
  });
  currentPage = 1;
  updateTable();
});

// ページあたりの表示件数変更
document
  .getElementById("itemsPerPage")
  .addEventListener("change", function (e) {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    updateTable();
  });

// ページネーションボタン
document.getElementById("prevPage").addEventListener("click", function () {
  if (currentPage > 1) {
    currentPage--;
    updateTable();
  }
});

document.getElementById("nextPage").addEventListener("click", function () {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    updateTable();
  }
});

// 年次間の生徒数変化率チャート
function updateChangeRateChart() {
  const byYear = {};
  filteredData.forEach(d => {
    if (!byYear[d.year]) {
      byYear[d.year] = { male: 0, female: 0, total: 0 };
    }
    byYear[d.year].male += d.maleStudent;
    byYear[d.year].female += d.femaleStudent;
    byYear[d.year].total += d.totalStudent;
  });

  const years = Object.keys(byYear).sort((a, b) => a - b).map(Number);
  
  // 前年度比の変化率を計算
  const labels = [];
  const maleChangeData = [];
  const femaleChangeData = [];
  const totalChangeData = [];

  for (let i = 1; i < years.length; i++) {
    const prevYear = years[i - 1];
    const currYear = years[i];
    
    const prevData = byYear[prevYear];
    const currData = byYear[currYear];
    
    const maleChange = ((currData.male - prevData.male) / prevData.male) * 100;
    const femaleChange = ((currData.female - prevData.female) / prevData.female) * 100;
    const totalChange = ((currData.total - prevData.total) / prevData.total) * 100;
    
    labels.push(prevYear + "→" + currYear);
    maleChangeData.push(maleChange);
    femaleChangeData.push(femaleChange);
    totalChangeData.push(totalChange);
  }

  if (charts.changeRate) charts.changeRate.destroy();

  const ctx = document.getElementById("changeRateChart").getContext("2d");
  charts.changeRate = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "男生徒数変化率",
          data: maleChangeData,
          backgroundColor: "#FFB3D9",
          borderColor: "#FFC0E0",
          borderWidth: 1,
        },
        {
          label: "女生徒数変化率",
          data: femaleChangeData,
          backgroundColor: "#B3E5FC",
          borderColor: "#C0F0FF",
          borderWidth: 1,
        },
        {
          label: "計の変化率",
          data: totalChangeData,
          backgroundColor: "#D9A5FF",
          borderColor: "#E6C0FF",
          borderWidth: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return value.toFixed(1) + "%";
            }
          },
          title: {
            display: true,
            text: "前年度比変化率"
          }
        },
      },
    },
  });
}
