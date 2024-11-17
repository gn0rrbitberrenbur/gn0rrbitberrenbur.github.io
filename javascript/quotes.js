let quoteInterval;  // save quote interval
let authorInterval; // save author interval

function typeWriter(element, text, speed, callback) {
    let i = 0;
    // if interval is running already
    clearInterval(quoteInterval);
    clearInterval(authorInterval);
    
    const interval = setInterval(() => {
        element.innerHTML += text.charAt(i);
        i++;
        if (i === text.length) {
            clearInterval(interval);
            if (callback) callback();
        }
    }, speed);

    if (element.id === 'quote') {
        quoteInterval = interval;
    } else if (element.id === 'author') {
        authorInterval = interval;
    }
}

function loadQuote() {
    const speed = 25; // speed of animation (ms per symbol)

    fetch('resources/quotes.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Networkanswer was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            const quotes = data.quotes;
            const randomIndex = Math.floor(Math.random() * quotes.length);
            const quote = quotes[randomIndex];
            
            const quoteText = quote.text;
            const authorText = `— ${quote.author} —`;

            // typewriter quote
            const quoteElement = document.getElementById('quote');
            quoteElement.innerHTML = ''; // delete former content
            typeWriter(quoteElement, quoteText, speed, () => {
                // author
                const authorElement = document.getElementById('author');
                authorElement.innerHTML = '';
                typeWriter(authorElement, authorText, speed);
            });

        })
        .catch(error => {
            console.error('Error while loading the quotes:', error);
        });
}

window.onload = loadQuote;