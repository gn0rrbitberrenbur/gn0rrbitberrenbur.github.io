function toggle() {
    const body = document.body;
    const toggleText = document.getElementById("lightsToggle");

    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        localStorage.setItem("lightState", "light-mode");
    } else {
        localStorage.setItem("lightState", "dark-mode");
    }

    if (body.classList.contains('light-mode')) {
        toggleText.textContent = "/lights off/";
    } else {
        toggleText.textContent = "/lights on/";
    }
}

function getLightState() {
    const body = document.body;
    const toggleText = document.getElementById("lightsToggle");

    const savedState = localStorage.getItem("lightState");

    if (savedState === "light-mode") {
        body.classList.add('light-mode');
        toggleText.textContent = "/lights off/";
    } else if (savedState === "dark-mode" || !savedState) {
        body.classList.remove('light-mode');
        toggleText.textContent = "/lights on/";
    }
}

window.onload = getLightState;