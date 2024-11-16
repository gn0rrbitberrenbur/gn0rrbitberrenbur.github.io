function toggle() {
    const body = document.body;
    const toggleText = document.getElementById("lightsToggle");

    // Wechsel zwischen den Modus-Klassen
    body.classList.toggle('light-mode');
    
    // Speichern des aktuellen Modus im LocalStorage
    if (body.classList.contains('light-mode')) {
        localStorage.setItem("lightState", "light-mode");
    } else {
        localStorage.setItem("lightState", "dark-mode");
    }

    // Text des Links je nach Modus ändern
    if (body.classList.contains('light-mode')) {
        toggleText.textContent = "/lights off/"; // Wenn Light Mode aktiv ist
    } else {
        toggleText.textContent = "/lights on/"; // Wenn Dark Mode aktiv ist
    }
}

function getLightState() {
    const body = document.body;
    const toggleText = document.getElementById("lightsToggle");

    // Überprüfen, ob im LocalStorage ein Modus gespeichert wurde
    const savedState = localStorage.getItem("lightState");

    // Wenn kein gespeicherter Modus vorhanden ist, setze Dark Mode als Standard
    if (savedState === "light-mode") {
        body.classList.add('light-mode');
        toggleText.textContent = "/lights off/"; // Wenn Light Mode aktiv ist
    } else if (savedState === "dark-mode" || !savedState) {
        // Wenn Dark Mode gespeichert ist oder nichts gespeichert wurde (Standard-Fall)
        body.classList.remove('light-mode');
        toggleText.textContent = "/lights on/"; // Wenn Dark Mode aktiv ist
    }
}

// Beim Laden der Seite den gespeicherten Zustand oder Standard-Modus wiederherstellen
window.onload = getLightState;