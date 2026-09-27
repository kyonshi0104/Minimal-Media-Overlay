const musicTitle = document.getElementById("music-title");
const musicArtist = document.getElementById("music-artist");
const artworkLayers = [...document.querySelectorAll(".music-display__thumbnail")];
const musicDisplay = document.querySelector(".music-display");
const defaultArtwork = "./res/default-thumbnail.jpg";
let activeArtworkIndex = 0;
let artworkRequestId = 0;
let currentTrack = { title: "", artist: "", artwork: defaultArtwork };

const clockHoursMinutes = document.getElementById("clock-hours-minutes");
const clockSeconds = document.getElementById("clock-seconds");
const clockDate = document.getElementById("clock-date");
const clockWeekday = document.getElementById("clock-weekday");
const clock = document.querySelector(".clock");
const clockPositions = ["top-right", "top-left", "center", "hidden"];
const musicPositions = ["bottom-left", "bottom-right", "bottom-center", "hidden"];
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const audioVisualizer = document.getElementById("audio-visualizer");
const audioVisualizerContext = audioVisualizer.getContext("2d");
const backgroundVideo = document.getElementById("background-video");
const backgroundImage = document.getElementById("background-image");

const cpuUsage = document.getElementById("cpu-usage");
const ramUsage = document.getElementById("ram-usage");
let waveformSensitivity = 1;
let waveformColor = "#FFFFFF";
let backgroundRequestId = 0;

function updateClock() {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const date = String(now.getDate()).padStart(2, "0");
    const timeText = `${hours}:${minutes}`;
    const dateText = `${year}.${month}.${date}`;

    if (clockHoursMinutes.textContent !== timeText) clockHoursMinutes.textContent = timeText;
    if (clockSeconds.textContent !== seconds) clockSeconds.textContent = seconds;
    if (clockDate.textContent !== dateText) clockDate.textContent = dateText;
    if (clockWeekday.textContent !== weekdays[now.getDay()]) clockWeekday.textContent = weekdays[now.getDay()];
}

updateClock();

function animateTextChange(element) {
    element.animate(
        [
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 0.8, transform: "translateY(0)" },
        ],
        { duration: 400, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
    );
}

function updateArtwork(source) {
    const requestId = ++artworkRequestId;
    const preloadedArtwork = new Image();

    preloadedArtwork.onload = () => {
        if (requestId !== artworkRequestId) {
            return;
        }

        const nextIndex = 1 - activeArtworkIndex;
        const previousArtwork = artworkLayers[activeArtworkIndex];
        const nextArtwork = artworkLayers[nextIndex];
        nextArtwork.src = source;

        requestAnimationFrame(() => {
            nextArtwork.classList.add("music-display__thumbnail--active");
            previousArtwork.classList.remove("music-display__thumbnail--active");
            activeArtworkIndex = nextIndex;
        });
    };

    preloadedArtwork.src = source;
}

function updateTrackPresentation(nextTrack) {
    if (nextTrack.title !== currentTrack.title) {
        musicTitle.textContent = nextTrack.title;
        animateTextChange(musicTitle);
    }

    if (nextTrack.artist !== currentTrack.artist) {
        musicArtist.textContent = nextTrack.artist;
        animateTextChange(musicArtist);
    }

    if (nextTrack.artwork !== currentTrack.artwork) {
        updateArtwork(nextTrack.artwork);
    }

    currentTrack = nextTrack;
}

function livelyCurrentTrack(data) {
    const track = JSON.parse(data);

    if (track?.Title) {
        const artwork = track.Thumbnail
            ? track.Thumbnail.startsWith("data:image")
                ? track.Thumbnail
                : `data:image/jpeg;base64,${track.Thumbnail}`
            : defaultArtwork;

        updateTrackPresentation({
            title: track.Title,
            artist: track.Artist ?? "",
            artwork,
        });
        return;
    }

    updateTrackPresentation({ title: "", artist: "", artwork: defaultArtwork });
    musicDisplay.classList.remove("music-display--visible");
}

let silenceTimer = null;
let isPlaying = false;

function livelyAudioListener(audioData) {
    audioVisualizerContext.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);

    const barCount = audioData.length;
    const barWidth = audioVisualizer.width / barCount;
    let isSilent = true;

    for (let index = 0; index < barCount; index++) {
        const sample = audioData[index];
        if (!(sample <= 0.01)) {
            isSilent = false;
        }

        const barHeight = sample * audioVisualizer.height * waveformSensitivity;
        const x = index * barWidth;
        const y = audioVisualizer.height - barHeight;
        audioVisualizerContext.fillRect(x, y, Math.max(0, barWidth - 4), barHeight);
    }

    if (!isSilent) {
        if (!isPlaying) {
            isPlaying = true;
            clearTimeout(silenceTimer);
            silenceTimer = null;
            musicDisplay.classList.add("music-display--visible");
        }
        return;
    }

    if (isPlaying) {
        isPlaying = false;
        silenceTimer = setTimeout(() => {
            musicDisplay.classList.remove("music-display--visible");
            silenceTimer = null;
        }, 3000);
    }
}

function livelySystemInformation(data) {
    const systemInformation = JSON.parse(data);

    if (!systemInformation) {
        return;
    }

    cpuUsage.textContent = Math.round(systemInformation.CurrentCpu);

    const usedRam = systemInformation.TotalRam - systemInformation.CurrentRamAvail;
    const ramPercentage = (usedRam / systemInformation.TotalRam) * 100;
    ramUsage.textContent = Math.round(ramPercentage);
}

function livelyPropertyListener(name, value) {
    switch (name) {
        case "clockPosition": {
            const position = clockPositions[Number(value)] ?? clockPositions[0];
            clock.classList.remove(...clockPositions.map((item) => `clock--${item}`));
            clock.classList.add(`clock--${position}`);
            break;
        }
        case "musicPosition": {
            const position = musicPositions[Number(value)] ?? musicPositions[0];
            musicDisplay.classList.remove(...musicPositions.map((item) => `music-display--${item}`));
            musicDisplay.classList.add(`music-display--${position}`);
            break;
        }
        case "showSysInfo": {
            const systemInfoContainer = document.getElementById("system-info-container");
            systemInfoContainer.style.display = value ? "block" : "none";
            break;
        }
        case "backgroundMedia": {
            const fileName = String(value).replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "";
            const mediaUrl = `./media/${encodeURIComponent(fileName)}`;
            const extension = fileName.split(".").pop().toLowerCase();
            const isVideo = ["mp4", "webm", "m4v", "mov"].includes(extension);
            const requestId = ++backgroundRequestId;

            if (isVideo) {
                backgroundImage.hidden = true;
                backgroundVideo.hidden = false;

                if (backgroundVideo.getAttribute("src") !== mediaUrl) {
                    backgroundVideo.src = mediaUrl;
                    backgroundVideo.load();
                }
                backgroundVideo.play().catch((error) => console.error("Background video playback failed.", error));
                break;
            }

            const preloadedImage = new Image();
            preloadedImage.onload = () => {
                if (requestId !== backgroundRequestId) {
                    return;
                }

                backgroundVideo.pause();
                backgroundVideo.hidden = true;
                backgroundImage.src = mediaUrl;
                backgroundImage.hidden = false;
            };
            preloadedImage.src = mediaUrl;
            break;
        }
        case "textColor":
            document.documentElement.style.setProperty("--text-color", value);
            break;
        case "waveformColor":
            waveformColor = value;
            audioVisualizerContext.fillStyle = waveformColor;
            break;
        case "waveformSensitivity":
            waveformSensitivity = Number(value) / 100;
            break;
        case "backgroundVolume": {
            const volume = Math.min(100, Math.max(0, Number(value))) / 100;
            backgroundVideo.volume = volume;
            backgroundVideo.muted = volume === 0;
            break;
        }
        case "backgroundBlur":
            document.documentElement.style.setProperty("--background-blur", `${Number(value)}px`);
            break;
    }
}

const defaultProperties = {
    clockPosition: 0,
    musicPosition: 0,
    backgroundMedia: "default.png",
    textColor: "#F0F8FF",
    waveformColor: "#FFFFFF",
    waveformSensitivity: 100,
    backgroundVolume: 50,
    backgroundBlur: 0,
};

for (const [name, value] of Object.entries(defaultProperties)) {
    livelyPropertyListener(name, value);
}

setInterval(updateClock, 1000);