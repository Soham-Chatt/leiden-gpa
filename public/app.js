// Store expanded years in state
let expandedYears = new Set();

async function handleSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  if (!formData.get('file')) {
    alert('Please select a PDF file');
    return;
  }

  const submitButton = document.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';

  try {
    const res = await fetch('http://localhost:3000/parse-pdf', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (data.error) throw new Error(data.error);
    renderResults(data);
  } catch (error) {
    alert(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Calculate GPA';
  }
}

function toggleYear(year) {
  if (expandedYears.has(year)) {
    expandedYears.delete(year);
  } else {
    expandedYears.add(year);
  }

  // Get the stored result and re-render
  const app = document.getElementById('app');
  const result = JSON.parse(app.dataset.result || '{}');
  renderResults(result);
}

function renderResults(result = null) {
  const app = document.getElementById('app');

  // Only store the result if it's not null
  if (result) {
    app.dataset.result = JSON.stringify(result);
  }

  app.innerHTML = `
    <main class="p-6 sm:p-8 w-full max-w-xl mx-auto min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-center mb-6 sm:mb-8 text-blue-400">
        Leiden GPA Calculator
      </h1>
      <div class="bg-gray-900 rounded-xl p-6 sm:p-8 shadow-lg">
        <form id="uploadForm" class="space-y-6">
          <div>
            <label for="file" class="block text-sm sm:text-base font-medium text-gray-300 mb-2">
              Upload your transcript (PDF)
            </label>
            <input
              type="file"
              id="file"
              name="file"
              accept="application/pdf"
              class="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 sm:file:py-3 file:px-4 sm:file:px-6 file:rounded-lg file:border-0
              file:bg-blue-500 file:text-white file:font-semibold file:cursor-pointer
              hover:file:bg-blue-600 focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            type="submit"
            class="w-full px-4 sm:px-5 py-2 sm:py-3 bg-blue-600 text-white rounded-lg text-base sm:text-lg font-semibold
            hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Calculate GPA
          </button>
        </form>
        
        ${
    result
      ? `
            <div class="mt-8 space-y-6">
              <div class="bg-gray-800 rounded-lg p-4">
                <p class="text-sm sm:text-base text-gray-400">Program: ${result.program}</p>
                <h2 class="text-xl sm:text-2xl font-bold mt-2">CGPA: ${Number(result.cgpa).toFixed(1)}</h2>
                <p class="text-sm sm:text-base text-gray-300">
                  Total ECTS: ${result.totalECTS}
                  ${
        result.excludedECTS > 0
          ? `<span class="text-sm text-gray-400 ml-2">(${result.excludedECTS} excluded)</span>`
          : ''
      }
                </p>
              </div>
              <div class="space-y-4">
                <h3 class="text-lg sm:text-xl font-semibold">GPA by Year</h3>
                <div class="space-y-3">
                  ${result.yearDetails
        .map(
          ({ year, gpa, ects }) => `
                    <div>
                      <div class="year-header bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors" data-year="${year}">
                        <div class="flex justify-between items-center">
                          <span class="font-medium text-sm sm:text-base">Year ${year}</span>
                          <div class="flex items-center gap-3 text-sm sm:text-base">
                            <span class="text-gray-400">${ects} ECTS</span>
                            <span class="font-mono bg-gray-700 px-3 py-1 rounded">GPA ${gpa}</span>
                            <span class="text-blue-400">
                              ${expandedYears.has(year) ? '▼' : '▶'}
                            </span>
                          </div>
                        </div>
                      </div>
                      ${
            expandedYears.has(year)
              ? `
                          <div class="mt-2 overflow-x-auto">
                            <table class="w-full text-sm border border-gray-700 rounded-lg">
                              <thead class="bg-gray-800 text-gray-300">
                                <tr>
                                  <th class="p-3 text-left">Course</th>
                                  <th class="p-3 text-right">Grade</th>
                                  <th class="p-3 text-right">ECTS</th>
                                  <th class="p-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody class="divide-y divide-gray-700 text-gray-400">
                                ${result.courses
                .filter((course) => course.year === year)
                .map(
                  (course) => `
                                    <tr class="hover:bg-gray-700/50">
                                      <td class="p-3">${course.name}</td>
                                      <td class="p-3 text-right font-mono">${course.grade}</td>
                                      <td class="p-3 text-right">${course.ects}</td>
                                      <td class="p-3 text-right ${
                    course.status === 'Included'
                      ? 'text-green-400'
                      : course.status === 'Failed'
                        ? 'text-red-400'
                        : 'text-gray-400'
                  }">${course.status}</td>
                                    </tr>
                                  `
                )
                .join('')}
                              </tbody>
                            </table>
                          </div>
                          `
              : ''
          }
                    </div>
                  `
        )
        .join('')}
                </div>
              </div>
            </div>
          `
      : ''
  }
      </div>
      
    ${result.extracurricular.length > 0 ? `
  <div class="space-y-4 mt-6">
    <div class="flex justify-between items-center">
      <h3 class="text-lg sm:text-xl font-semibold">Extracurricular Activities</h3>
      <span class="text-l text-gray-400">Total: ${result.totalExtracurricularECTS} ECTS</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border border-gray-700 rounded-lg">
        <thead class="bg-gray-800 text-gray-300">
          <tr>
            <th class="p-3 text-left">Course</th>
            <th class="p-3 text-right">Grade</th>
            <th class="p-3 text-right">ECTS</th>
            <th class="p-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700 text-gray-400">
          ${result.extracurricular.map(course => `
            <tr class="hover:bg-gray-700/50">
              <td class="p-3">${course.name}</td>
              <td class="p-3 text-right font-mono">${course.grade}</td>
              <td class="p-3 text-right">${course.ects}</td>
              <td class="p-3 text-right text-gray-400">${course.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
` : ''}
      
      <div class="mt-6 text-center text-xs sm:text-sm text-gray-400">
        <p><b>Supported PDF Format:</b> Transcript from uSis (English or Dutch)</p>
        <p><i>Your uploaded transcripts are <b>never</b> saved.</i></p>
      </div>
    </main>
  `;

  // Reattach event listeners
  document.getElementById('uploadForm').addEventListener('submit', handleSubmit);

  // Attach click handlers to year headers
  document.querySelectorAll('.year-header').forEach((header) => {
    header.addEventListener('click', () => {
      const year = header.getAttribute('data-year'); // No parseInt
      toggleYear(year);
    });
  });
}

function initialRender() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <main class="p-6 sm:p-8 w-full max-w-xl mx-auto min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-center mb-6 sm:mb-8 text-blue-400">
        Leiden GPA Calculator
      </h1>
      <div class="bg-gray-900 rounded-xl p-6 sm:p-8 shadow-lg">
        <form id="uploadForm" class="space-y-6">
          <div>
            <label for="file" class="block text-sm sm:text-base font-medium text-gray-300 mb-2">
              Upload your transcript (PDF)
            </label>
            <input
              type="file"
              id="file"
              name="file"
              accept="application/pdf"
              class="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 sm:file:py-3 file:px-4 sm:file:px-6 file:rounded-lg file:border-0
              file:bg-blue-500 file:text-white file:font-semibold file:cursor-pointer
              hover:file:bg-blue-600 focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            type="submit"
            class="w-full px-4 sm:px-5 py-2 sm:py-3 bg-blue-600 text-white rounded-lg text-base sm:text-lg font-semibold
            hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Calculate GPA
          </button>
        </form>
      </div>
      <div class="mt-6 text-center text-xs sm:text-sm text-gray-400">
        <p><b>Supported PDF Format:</b> Transcript from uSis (English or Dutch)</p>
        <p><i>Your uploaded transcripts are <b>never</b> saved.</i></p>
      </div>
    </main>
  `;

  document.getElementById('uploadForm').addEventListener('submit', handleSubmit);
}

// Initialize
document.addEventListener('DOMContentLoaded', initialRender);