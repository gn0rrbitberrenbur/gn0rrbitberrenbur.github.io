const rssURL = 'https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml';

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

        const feedList = document.getElementById('rssTagesschau');
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
                const isVisible = descriptionElement.style.display === 'block';
                if (isVisible) {
                    descriptionElement.style.display = 'none';
                } else {
                    descriptionElement.style.display = 'block';
                }
            });

            feedList.appendChild(listItem);
        });

    } catch (error) {
        console.error('Error while loading or parsing RSS-Feed', error);
    }
}

fetchRSS();
