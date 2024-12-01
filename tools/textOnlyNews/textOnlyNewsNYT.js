let rssURL = 'https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml';

async function fetchRSS() {
    try {
        const response = await fetch(rssURL);

        if (!response.ok) {
            throw new Error('Error while fetching the feed');
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        const items = xmlDoc.getElementsByTagName('item');

        const feedList = document.getElementById('rssNYTimes');
        feedList.innerHTML = '';

        Array.from(items).forEach(item => {
            const title = item.getElementsByTagName('title')[0].textContent;
            const description = item.getElementsByTagName('description')[0].textContent;
            const link = item.getElementsByTagName('link')[0].textContent;

            const listItem = document.createElement('li');

            const linkElement = document.createElement('a');
            linkElement.href = "#";
            linkElement.textContent = title;
            linkElement.className = 'titleLink';
            listItem.appendChild(linkElement);

            const descriptionElement = document.createElement('p');
            descriptionElement.className = 'description';
            descriptionElement.textContent = description;

            const readMoreLink = document.createElement('a');
            readMoreLink.href = link;
            readMoreLink.textContent = '[Read more]';
            readMoreLink.target = '_blank';

            descriptionElement.appendChild(readMoreLink);
            listItem.appendChild(descriptionElement);

            linkElement.addEventListener('click', function(event) {
                event.preventDefault();
                // Toggle die Anzeige der Beschreibung
                descriptionElement.classList.toggle('show');
            });

            feedList.appendChild(listItem);
        });

    } catch (error) {
        console.error('Error while loading or parsing RSS-Feed', error);
    }
}

// Toggle-Funktion zum Ein- und Ausklappen der New York Times
document.getElementById('toggleButtonNYT').addEventListener('click', function() {
    const feedList = document.getElementById('rssNYTimes');
    const source = document.getElementById('sourceNYT');

    if (feedList.style.display === 'none' || feedList.style.display === '') {
        feedList.style.display = 'block';
        source.style.display = 'block';  // Zeige den Quell-Link an
        fetchRSS(); // RSS Feed wird nur geladen, wenn der Bereich sichtbar ist
    } else {
        feedList.style.display = 'none';
        source.style.display = 'none';  // Verstecke den Quell-Link
    }
});

// Initiales Laden des RSS-Feeds
fetchRSS();
