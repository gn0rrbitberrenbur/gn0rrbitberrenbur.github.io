const resources = [
    'Wald', 'Wald', 'Wald', 'Wald',
    'Weideland', 'Weideland', 'Weideland', 'Weideland',
    'Ackerland', 'Ackerland', 'Ackerland', 'Ackerland',
    'Hügelland', 'Hügelland', 'Hügelland',
    'Gebirge', 'Gebirge', 'Gebirge',
    'Wüste'
];

const numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

function generateBoard() {
    const board = document.getElementById('board');
    board.innerHTML = ''; // empty board

    // shuffle resources and numbers
    const resourceTiles = shuffle(resources.slice());

    const numberTiles = shuffle(numbers.slice());

    // create hexagon
    const hexagonPositions = [
        [0, 1, 2],             // 1st row (3 hex)
        [3, 4, 5, 6],         // 2nd row (4 hex)
        [7, 8, 9, 10, 11],    // 3rd row (5 hex)
        [12, 13, 14, 15],     // 4th row (4 hex)
        [16, 17, 18]          // 5th row (3 hex)
    ];

    let numberIndex = 0;

    hexagonPositions.forEach((row) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';

        row.forEach((hexIndex) => {
            const hexDiv = document.createElement('div');
            hexDiv.classList.add('hex');

            // allocate resources
            const resource = resourceTiles[hexIndex];
            let number;

            // set desert=0
            if (resource === 'Wüste') {
                number = 0;
            } else {
                number = numberTiles[numberIndex++];
            }

            // add colour
            switch (resource) {
                case 'Wald':
                    hexDiv.classList.add('hex-forest');
                    break;
                case 'Weideland':
                    hexDiv.classList.add('hex-sheep');
                    break;
                case 'Ackerland':
                    hexDiv.classList.add('hex-grain');
                    break;
                case 'Hügelland':
                    hexDiv.classList.add('hex-brick');
                    break;
                case 'Gebirge':
                    hexDiv.classList.add('hex-ore');
                    break;
                case 'Wüste':
                    hexDiv.classList.add('hex-desert');
                    break;
            }

            // add resource and colour
            hexDiv.innerHTML = `<div class="hex-number">${number}</div>${resource}`;
            rowDiv.appendChild(hexDiv);
        });

        board.appendChild(rowDiv); // add row to board
    });
}

// shuffle array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}