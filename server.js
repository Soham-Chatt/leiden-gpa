const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const pdf = require('pdf-parse');
const path = require('path');

const app = express();

const corsOptions = {
  origin: ['http://localhost:3000', 'https://leiden-gpa.vercel.app'],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Date', 'X-Api-Version'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/parse-pdf', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const pdfFile = req.files.file;
    const data = await pdf(pdfFile.data);
    const result = calculateWeightedGPA(data.text);
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

function calculateWeightedGPA(text) {
  const mainStudy = ['bachelor year', 'master year', 'bachelor jaar', 'master jaar'];
  const programMatch = text.match(/(Exam\s+components|Examenonderdelen)\s*[:"]?\s*([^"\n]+)/);
  const program = programMatch ? programMatch[2].trim() : 'Unknown Program';
  const lines = text.split('\n');
  let totalECTS = 0;
  let excludedECTS = 0;
  const gradesByYear = {};
  const courseDetails = [];
  const extracurricularCourses = [];

  let currentYear = null;
  let inBachelorSection = false;
  let currentSection = null;

  const lineRegex = new RegExp([
    '^(.+?)\\s+(\\d{2}-\\d{2}-\\d{4})',
    '((?:Passed|Voldaan)\\d{1,2}\\d{3}|\\d{1,2}(?:,\\d)?\\d{1,2}\\d{3})$'
  ].join(''));

  for (const line of lines) {
    if (mainStudy.some(study => line.toLowerCase().includes(study))) {
      inBachelorSection = true;
      const yearMatch = line.match(/(?:bachelor|master)\s+(?:year|jaar)\s*(\d+)|(?:bachelor|master)jaar\s*(\d+)/i);
      currentYear = yearMatch ? (yearMatch[1] || yearMatch[2]) : 'Unknown';
      continue;
    }

    if (/Honours\s+College|\bExtracurricula(?:i)?r\b/i.test(line)) {
      inBachelorSection = false;
      currentSection = line.trim()
        .replace(/(?:Components\s*Exam|Examenonderdelen)\s*date\s*Grade\s*ECTS\s*Level/i, '')
        .replace(/(?:bachelor|master|bsc|msc|ba|ma)(?:\s+(?:of|in|of science|of arts|der))?\s+[^"]*/i, '')
        .trim();
      continue;
    }

    const match = line.trim().match(lineRegex);
    if (!match) continue;

    const [, courseName, examDate, gradeBlock] = match;
    let grade = null, ects = null, level = null;

    if (gradeBlock.startsWith('Passed') || gradeBlock.startsWith('Voldaan')) {
      grade = 'Passed';
      const startPos = gradeBlock.startsWith('Passed') ? 6 : (gradeBlock.startsWith('Voldaan') ? 7 : 1);
      ects = parseInt(gradeBlock.slice(startPos, -3), 10);
      level = parseInt(gradeBlock.slice(-3), 10);
    } else {
      const gradeMatch = gradeBlock.match(/(\d{1,2}(?:,\d)?)(\d{1,2})(\d{3})/);
      if (!gradeMatch) continue;
      grade = parseFloat(gradeMatch[1].replace(',', '.'));
      ects = parseInt(gradeMatch[2], 10);
      level = parseInt(gradeMatch[3], 10);
    }

    if (inBachelorSection) {
      const courseEntry = {
        year: currentYear,
        name: courseName.trim(),
        date: examDate,
        grade: typeof grade === 'number' ? grade.toFixed(1) : grade,
        ects,
        level,
        included: false
      };

      if (!gradesByYear[currentYear]) {
        gradesByYear[currentYear] = { points: 0, ects: 0, totalECTS: 0 };
      }

      if (grade === 'Passed') {
        totalECTS += ects;
        gradesByYear[currentYear].totalECTS += ects;
        courseEntry.status = 'Included';
      } else if (grade >= 6.0) {
        totalECTS += ects;
        gradesByYear[currentYear].totalECTS += ects;
        courseEntry.included = true;
        courseEntry.status = 'Included';
        gradesByYear[currentYear].points += (grade * ects);
        gradesByYear[currentYear].ects += ects;
      } else {
        courseEntry.status = 'Failed';
      }
      courseDetails.push(courseEntry);
    } else if (currentSection) {
      extracurricularCourses.push({
        section: currentSection,
        name: courseName.trim(),
        date: examDate,
        grade: typeof grade === 'number' ? grade.toFixed(1) : grade,
        ects,
        level,
        status: 'Extracurricular'
      });
    }
  }

  if (totalECTS === 0) {
    return {
      error: 'No valid courses found',
      details: 'Could not find any graded bachelor courses in the transcript.'
    };
  }

  const yearDetails = Object.entries(gradesByYear).map(([year, data]) => ({
    year,
    gpa: (data.points / data.ects).toFixed(2),
    ects: data.totalECTS
  }));

  let gradedECTS = 0;
  let gradedPoints = 0;
  Object.values(gradesByYear).forEach(data => {
    gradedPoints += data.points;
    gradedECTS += data.ects;
  });
  const weightedGPA = gradedPoints / gradedECTS;

  const totalExtracurricularECTS = extracurricularCourses.reduce((sum, course) => sum + course.ects, 0);
  return {
    program,
    cgpa: weightedGPA.toFixed(2),
    totalECTS,
    excludedECTS,
    yearDetails,
    courses: courseDetails,
    extracurricular: extracurricularCourses,
    totalExtracurricularECTS
  };
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));