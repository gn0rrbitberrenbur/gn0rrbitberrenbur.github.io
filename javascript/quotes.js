function loadQuote() { 
    fetch('resources/quotes.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Netzwerkantwort war nicht ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            const quotes = data.quotes; // access quote-arary
            const randomIndex = Math.floor(Math.random() * quotes.length);
            const quote = quotes[randomIndex];
            document.getElementById('quote').innerText = quote.text;
            document.getElementById('author').innerText = `— ${quote.author} —`;
        })
        .catch(error => {
            console.error('Fehler beim Laden der Zitate:', error);
        });
}

window.onload = loadQuote;