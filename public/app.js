let expandedYears = new Set();

async function handleSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  if (!formData.get('file')) {
    alert('Please select a PDF file');
    return;
  }

  document.querySelector('button[type="submit"]').disabled = true;
  document.querySelector('button[type="submit"]').textContent = 'Processing...';

  try {
    const res = await fetch('http://localhost:3000/parse-pdf', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.error) throw new Error(data.error);
    renderResults(data);
  } catch (error) {
    alert(error.message);
  } finally {
    document.querySelector('button[type="submit"]').disabled = false;
    document.querySelector('button[type="submit"]').textContent = 'Calculate GPA';
  }
}

function toggleYear(year) {
  if (expandedYears.has(year)) {
    expandedYears.delete(year);
  } else {
    expandedYears.add(year);
  }
  const result = JSON.parse(document.getElementById('app').dataset.result);
  renderResults(result);
}

function renderResults(result) {
  const app = document.getElementById('app');
  app.dataset.result = JSON.stringify(result);

  app.innerHTML = `
   <main class="p-8 max-w-4xl mx-auto">
     <h1 class="text-4xl font-bold mb-8 text-center">Leiden GPA Calculator</h1>
     <div class="bg-gray-800 rounded-lg p-6 shadow-xl">
       <form id="uploadForm" class="space-y-6">
         <div>
           <input type="file" name="file" accept="application/pdf" class="block w-full text-sm text-gray-400
             file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
             file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-200
             hover:file:bg-gray-600 cursor-pointer" />
         </div>
         <button type="submit" 
           class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg
           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
           transition duration-200 ease-in-out transform hover:scale-105">
           Calculate GPA
         </button>
       </form>

       <div class="mt-8 space-y-6">
         <div class="p-4 bg-gray-700 rounded-lg">
           <p class="text-xl text-gray-400">Program: ${result.program}</p>
           <h2 class="text-2xl font-bold mb-2">CGPA: ${result.cgpa}</h2>
           <p class="text-gray-300">
             Total ECTS: ${result.totalECTS}
            ${result.excludedECTS > 0 ? `<span class="text-gray-400 text-sm ml-2">(${result.excludedECTS} excluded)</span>` : ''}
           </p>
         </div>

         <div class="space-y-4">
           <h3 class="text-xl font-semibold">GPA by Year</h3>
           <div class="grid gap-4">
             ${result.yearDetails.map(({ year, gpa, ects }, index) => `
               ${index > 0 ? '<div class="border-t border-gray-600 my-2"></div>' : ''}
               <div>
                 <div class="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                   <span>Year ${year}</span>
                   <div class="space-x-4">
                     <span class="text-gray-400">${ects} ECTS</span>
                     <span class="font-mono bg-gray-600 px-3 py-1 rounded">
                       GPA ${gpa}
                     </span>
                     <button onclick="toggleYear(${year})" 
                       class="text-blue-400 hover:text-blue-300">
                       ${expandedYears.has(parseInt(year)) ? '▼' : '▶'}
                     </button>
                   </div>
                 </div>
                 ${expandedYears.has(parseInt(year)) ? `
                   <div class="mt-2 overflow-x-auto">
                     <table class="w-full text-sm">
                       <thead class="bg-gray-700">
                         <tr>
                           <th class="px-4 py-2 text-left">Course</th>
                           <th class="px-4 py-2 text-right">Grade</th>
                           <th class="px-4 py-2 text-right">ECTS</th>
                           <th class="px-4 py-2 text-right">Status</th>
                         </tr>
                       </thead>
                       <tbody class="divide-y divide-gray-700">
                         ${result.courses
    .filter(course => course.year === year)
    .map(course => `
                             <tr class="hover:bg-gray-700">
                               <td class="px-4 py-2">${course.name}</td>
                               <td class="px-4 py-2 text-right font-mono">${course.grade}</td>
                               <td class="px-4 py-2 text-right">${course.ects}</td>
                               <td class="px-4 py-2 text-right ${
      course.status === 'Included' ? 'text-green-400' :
        course.status === 'Failed' ? 'text-red-400' :
          'text-gray-400'
    }">${course.status}</td>
                             </tr>
                           `).join('')}
                       </tbody>
                     </table>
                   </div>
                 ` : ''}
               </div>
             `).join('')}
           </div>
         </div>
         
         ${result.extracurricular && result.extracurricular.length > 0 ? `
        <div class="mt-8">
          <h3 class="text-xl font-semibold mb-4">Extracurricular Activities (${result.totalExtracurricularECTS} ECTS)</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left">Program</th>
                  <th class="px-4 py-2 text-left">Course</th>
                  <th class="px-4 py-2 text-right">Grade</th>
                  <th class="px-4 py-2 text-right">ECTS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                ${result.extracurricular.map(course => `
                  <tr class="hover:bg-gray-700">
                    <td class="px-4 py-2 text-gray-400">${course.section}</td>
                    <td class="px-4 py-2">${course.name}</td>
                    <td class="px-4 py-2 text-right font-mono">${course.grade}</td>
                    <td class="px-4 py-2 text-right">${course.ects}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
         
         ${result.parseErrors ? `
           <div class="mt-4 p-4 bg-red-900/50 rounded-lg">
             <h4 class="font-semibold text-red-400 mb-2">Parse Errors</h4>
             <ul class="text-sm space-y-1">
               ${result.parseErrors.map(error => `
                 <li class="text-red-300">${error}</li>
               `).join('')}
             </ul>
           </div>
         ` : ''}
       </div>
     </div>
   </main>
 `;

  document.getElementById('uploadForm').addEventListener('submit', handleSubmit);
}

// Initial render
document.getElementById('app').innerHTML = `
 <main class="p-8 max-w-4xl mx-auto">
   <h1 class="text-4xl font-bold mb-8 text-center">Leiden GPA Calculator</h1>
   <div class="bg-gray-800 rounded-lg p-6 shadow-xl">
     <form id="uploadForm" class="space-y-6">
       <div>
         <input type="file" name="file" accept="application/pdf" class="block w-full text-sm text-gray-400
           file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
           file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-200
           hover:file:bg-gray-600 cursor-pointer" />
       </div>
       <button type="submit" 
         class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg
         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
         transition duration-200 ease-in-out transform hover:scale-105">
         Calculate GPA
       </button>
     </form>
   </div>
 </main>
`;

document.getElementById('uploadForm').addEventListener('submit', handleSubmit);