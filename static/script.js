let audio = document.getElementById("audioPlayer");

function playAudio() {
    if (audio) audio.play();
}

function pauseAudio() {
    if (audio) audio.pause();
}

function stopAudio() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}
