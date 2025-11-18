const map = L.map('map').setView([52.52, 13.405], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    crossOrigin: 'anonymous'
}).addTo(map);

let markers = [];
let markerMode = false;
let currentColor = '#ff0000';
let currentIcon = 'map-marker-alt';

document.querySelectorAll('.icon-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        currentIcon = this.dataset.icon;
    });
});

document.getElementById('colorPicker').addEventListener('change', function(e) {
    currentColor = e.target.value;
});

function createCustomIcon(color, iconName) {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="custom-marker" style="background-color: ${color}; color: white;">
                <i class="fas fa-${iconName}"></i>
               </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
}

function updateMarkerCount() {
    document.getElementById('markerCount').textContent = markers.length;
}

function onMapClick(e) {
    if (!markerMode) return;
    
    const markerIndex = markers.length;
    const markerColor = currentColor;
    const markerIconName = currentIcon;
    
    const marker = L.marker(e.latlng, { 
        icon: createCustomIcon(markerColor, markerIconName)
    })
        .addTo(map)
        .bindPopup(`
            <div style="min-width: 150px;">
                <b>📍 Marker ${markerIndex + 1}</b><br>
                <i class="fas fa-${markerIconName}" style="color: ${markerColor}; font-size: 20px;"></i><br>
                <small>Lat: ${e.latlng.lat.toFixed(5)}<br>
                Lng: ${e.latlng.lng.toFixed(5)}</small><br>
                <button onclick="deleteMarker(${markerIndex})" style="margin-top: 8px; padding: 6px 12px; background-color: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 13px;">
                    <i class="fas fa-trash"></i> Löschen
                </button>
            </div>
        `);
    
    markers.push(marker);
    updateMarkerCount();
}

map.on('click', onMapClick);

document.getElementById('toggleMarker').addEventListener('click', function() {
    markerMode = !markerMode;
    this.textContent = `Marker-Modus: ${markerMode ? 'ON ✓' : 'OFF'}`;
    this.style.backgroundColor = markerMode ? '#ff9800' : '#4CAF50';
});

function deleteMarker(index) {
    if (markers[index]) {
        map.removeLayer(markers[index]);
        markers.splice(index, 1);
        updateMarkerCount();
    }
}

document.getElementById('clearMarkers').addEventListener('click', function() {
    if (markers.length === 0) {
        alert('No markers to delete!');
        return;
    }
    
    if (confirm(`Do you really want to delete all ${markers.length} markers?`)) {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        updateMarkerCount();
    }
});

async function captureMapAsImage() {
    const mapContainer = document.getElementById('map');
    const canvas = document.getElementById('screenshotCanvas');
    const ctx = canvas.getContext('2d');

    const rect = mapContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    try {
        const tiles = mapContainer.querySelectorAll('.leaflet-tile');
        const tilePromises = [];
        
        tiles.forEach(tile => {
            if (tile.complete && tile.src) {
                const promise = new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const tileRect = tile.getBoundingClientRect();
                        const x = tileRect.left - rect.left;
                        const y = tileRect.top - rect.top;
                        ctx.drawImage(img, x, y, tileRect.width, tileRect.height);
                        resolve();
                    };
                    img.onerror = () => resolve();
                    img.src = tile.src;
                });
                tilePromises.push(promise);
            }
        });
        
        await Promise.all(tilePromises);

        const markerElements = mapContainer.querySelectorAll('.custom-marker');
        markerElements.forEach(markerEl => {
            const markerRect = markerEl.getBoundingClientRect();
            const x = markerRect.left - rect.left;
            const y = markerRect.top - rect.top;

            const bgColor = markerEl.style.backgroundColor;
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.arc(x + 15, y + 15, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();

            const icon = markerEl.querySelector('i');
            if (icon) {
                ctx.fillStyle = 'white';
                ctx.font = '16px "Font Awesome 6 Free"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(icon.textContent || '📍', x + 15, y + 15);
            }
        });
        
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error while taking screenshot:', error);
        throw error;
    }
}

document.getElementById('saveMap').addEventListener('click', async function() {

    const controls = document.querySelector('.controls');
    controls.style.display = 'none';
    
    try {

        await new Promise(resolve => setTimeout(resolve, 200));
        
        const imageData = await captureMapAsImage();

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `karte_${timestamp}.png`;
        link.href = imageData;
        link.click();
        
        alert('Map was saved successfully!');
    } catch (error) {
        console.error('Error:', error);
        alert('Error while saving map');
    } finally {
        controls.style.display = 'block';
    }
});

map.on('load', function() {
    const tilePane = document.querySelector('.leaflet-tile-pane');
    if (tilePane) {
        tilePane.style.transform = 'translate3d(0, 0, 0)';
    }
});