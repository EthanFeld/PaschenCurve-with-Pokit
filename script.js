function readCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n');
            const data = rows.map(row => row.split(','));
            resolve(data);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

function findMaxes(data) {
    let maxes = [];
    let prev = 0;
    data.forEach(row => {
        const value = parseFloat(row[1]);
        if (!isNaN(value)) {
            const i = Math.abs(value);
            if (prev > Math.max(4 * i, 10)) {
                maxes.push(prev);
                prev = i;
            } else if (prev < i) {
                prev = i;
            }
        }
    });

    const mean = maxes.reduce((a, b) => a + b, 0) / maxes.length;
    const std = Math.sqrt(maxes.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / (maxes.length - 1));
    const bound = mean - 2 * std;

    maxes = maxes.filter(x => x >= bound);
    return maxes.map(x => x * 16.318);
}

function processFiles() {
    const input = document.getElementById('fileInput');
    const files = input.files;

    if (files.length === 0) {
        alert('Please select files to process.');
        return;
    }

    const results = [];
    let filesProcessed = 0;

    Array.from(files).forEach(file => {
        readCSV(file).then(data => {
            const headersIndex = data.findIndex(row => row[0] === 'Time (ms)');
            const content = data.slice(headersIndex + 1);
            const maxes = findMaxes(content);

            if (maxes.length > 0) {
                const meanMax = maxes.reduce((a, b) => a + b, 0) / maxes.length;
                const stdMax = Math.sqrt(maxes.map(x => Math.pow(x - meanMax, 2)).reduce((a, b) => a + b, 0) / (maxes.length - 1));
                results.push({
                    'File Name': file.name,
                    'Mean of Maxes': meanMax,
                    'Standard Deviation of Maxes': stdMax
                });
            }

            filesProcessed++;
            if (filesProcessed === files.length) {
                downloadResults(results);
            }
        }).catch(error => {
            console.error('Error reading file:', error);
        });
    });
}

function downloadResults(results) {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "File Name,Mean of Maxes,Standard Deviation of Maxes\n"
        + results.map(e => `${e['File Name']},${e['Mean of Maxes']},${e['Standard Deviation of Maxes']}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.getElementById('downloadLink');
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "summary_results.csv");
    link.style.display = 'block';
    link.innerText = 'Download Results';
}
