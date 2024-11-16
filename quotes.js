function loadQuote() { 
    fetch('resources/quotes.json') // Stelle sicher, dass der Pfad korrekt ist
        .then(response => {
            if (!response.ok) {
                throw new Error('Netzwerkantwort war nicht ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            const quotes = data.quotes; // Zugriff auf das Zitat-Array
            const randomIndex = Math.floor(Math.random() * quotes.length);
            const quote = quotes[randomIndex];
            document.getElementById('quote').innerText = quote.text;
            document.getElementById('author').innerText = `— ${quote.author} —`;
        })
        .catch(error => {
            console.error('Fehler beim Laden der Zitate:', error);
        });
}

// Beim Laden der Seite ein Zitat anzeigen
window.onload = loadQuote; // Aufruf der Funktion beim Laden der Seite