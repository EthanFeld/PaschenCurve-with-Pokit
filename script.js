document.getElementById('upload-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const dsoFiles = document.getElementById('dso-files').files;
    const pressureFile = document.getElementById('pressure-file').files[0];

    if (dsoFiles.length === 0 || !pressureFile) {
        alert('Please select both DSO and pressure data files.');
        return;
    }

    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    readPressureFile(pressureFile).then(pressureData => {
        Array.from(dsoFiles).forEach(dsoFile => {
            readDsoFile(dsoFile).then(dsoData => {
                const maxes = findMaxes(dsoData);
                const meanMax = calculateMean(maxes);
                const stdMax = calculateStd(maxes);
                const pressure = mapPressureToFile(pressureData, dsoFile.name);
                const result = {
                    fileName: dsoFile.name,
                    meanMax,
                    stdMax,
                    pressure
                };
                displayResult(result);
            });
        });
    });
});

function readDsoFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const text = event.target.result;
            const rows = text.split('\n');
            const data = [];
            let headers;
            rows.forEach(row => {
                const cols = row.split(',');
                if (cols[0] === 'Time (ms)') {
                    headers = cols;
                } else if (headers) {
                    data.push(cols);
                }
            });
            resolve(data);
        };
        reader.readAsText(file);
    });
}

function readPressureFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const text = event.target.result;
            const rows = text.split('\n');
            const data = [];
            rows.forEach(row => {
                const cols = row.split(',');
                if (cols.length > 1) {
                    data.push({ date: new Date(cols[0]), pressure: parseFloat(cols[1]) });
                }
            });
            resolve(data);
        };
        reader.readAsText(file);
    });
}

function findMaxes(data) {
    const maxes = [];
    let prev = 0;
    data.forEach(row => {
        const val = Math.abs(parseFloat(row[1]));
        if (prev > Math.max(4 * val, 10)) {
            maxes.push(prev);
            prev = val;
        } else if (prev < val) {
            prev = val;
        }
    });
    if (maxes.length > 0) {
        maxes.shift();
    }
    const std = calculateStd(maxes);
    const bound = calculateMean(maxes) - 2 * std;
    return maxes.filter(m => m >= bound);
}

function calculateMean(array) {
    return array.reduce((a, b) => a + b, 0) / array.length;
}

function calculateStd(array) {
    const mean = calculateMean(array);
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / (array.length - 1));
}

function mapPressureToFile(pressureData, fileName) {
    const fileTimeStr = fileName.replace("Pokit DSO Export ", "").replace(".csv", "").replace("-", " ");
    const fileTime = new Date(fileTimeStr);
    let closest = pressureData[0];
    let minDiff = Math.abs(fileTime - closest.date);
    pressureData.forEach(entry => {
        const diff = Math.abs(fileTime - entry.date);
        if (diff < minDiff) {
            closest = entry;
            minDiff = diff;
        }
    });
    return closest.pressure;
}

function displayResult(result) {
    const resultsContainer = document.getElementById('results');
    const resultDiv = document.createElement('div');
    resultDiv.innerHTML = `
        <h3>${result.fileName}</h3>
        <p>Mean of Maxes: ${result.meanMax}</p>
        <p>Standard Deviation of Maxes: ${result.stdMax}</p>
        <p>Pressure (micron): ${result.pressure}</p>
    `;
    resultsContainer.appendChild(resultDiv);
}
