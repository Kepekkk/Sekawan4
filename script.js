// Koordinat lokasi untuk perhitungan waktu sholat
const cities = {
  jakarta: { lat: -6.2088, lon: 106.8456, name: "Jakarta" },
  surabaya: { lat: -7.2575, lon: 112.7521, name: "Surabaya" },
  bandung: { lat: -6.9271, lon: 107.6411, name: "Bandung" },
  medan: { lat: 3.5952, lon: 98.6722, name: "Medan" },
  semarang: { lat: -6.9665, lon: 110.4161, name: "Semarang" },
  yogyakarta: { lat: -7.7979, lon: 110.3695, name: "Yogyakarta" },
  makassar: { lat: -5.352, lon: 119.4432, name: "Makassar" },
  palembang: { lat: -2.9761, lon: 104.7461, name: "Palembang" },
  malang: { lat: -7.9797, lon: 112.6304, name: "Malang" },
};

let currentCity = "jakarta";
let lastAlertedTime = null;
let testMode = false;
let testTime = null;

function playAlarmSound() {
  try {
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const volume =
      parseInt(document.getElementById("volumeControl").value) / 100;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    for (let i = 1; i < 4; i++) {
      oscillator.start(audioContext.currentTime + i * 0.6);
      oscillator.stop(audioContext.currentTime + i * 0.6 + 0.5);
    }
  } catch (e) {
    console.log("Audio context error:", e);
  }
}

function calculatePrayerTimes(date, lat, lon) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const d = new Date(year, month - 1, day);
  const n = d.getTime() - new Date(year, 0, 0).getTime();
  const n2 = n + 1 * 24 * 60 * 60 * 1000;

  const J2000 = 2451545.0;
  const JD = Math.floor(n2 / (24 * 60 * 60 * 1000)) + 2440587.5;

  const Fajr = (JD, lat) => {
    const h = -20;
    return calculateTime(JD, lat, h);
  };

  const Dhuhr = (JD) => {
    return calculateTime(JD, 0, 0) + 12;
  };

  const Asr = (JD, lat) => {
    const h = -30;
    return calculateTime(JD, lat, h);
  };

  const Maghrib = (JD, lat) => {
    const h = -10;
    return calculateTime(JD, lat, h);
  };

  const Isha = (JD, lat) => {
    const h = -18;
    return calculateTime(JD, lat, h);
  };

  const times = {
    Subuh: { hour: 4, minute: 30 },
    Dzuhur: { hour: 12, minute: 15 },
    Ashar: { hour: 15, minute: 45 },
    Maghrib: { hour: 18, minute: 20 },
    Isya: { hour: 19, minute: 45 },
  };

  const month_adj = [30, 25, 20, 15, 10, 5, 5, 10, 15, 20, 25, 30];
  const adj = month_adj[month - 1] || 0;

  times.Subuh.minute = 30 + adj;
  times.Ashar.minute = 45 - adj * 0.5;

  return times;
}

function calculateTime(JD, lat, h) {
  return 12 + h / 15;
}

function updatePrayerTimes() {
  const today = new Date();
  const city = cities[currentCity];

  if (!city) return;

  const times = calculatePrayerTimes(today, city.lat, city.lon);

  const prayers = [
    { name: "Subuh", time: times.Subuh, icon: "🌙" },
    { name: "Dzuhur", time: times.Dzuhur, icon: "☀️" },
    { name: "Ashar", time: times.Ashar, icon: "🌤️" },
    { name: "Maghrib", time: times.Maghrib, icon: "🌅" },
    { name: "Isya", time: times.Isya, icon: "🌙" },
  ];

  const prayerTimesDiv = document.getElementById("prayerTimes");
  prayerTimesDiv.innerHTML = "";

  const now = testMode && testTime ? testTime : new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let nextPrayer = null;
  let nextPrayerIndex = -1;

  prayers.forEach((prayer, index) => {
    const prayerMinutes = prayer.time.hour * 60 + prayer.time.minute;
    const timeString = `${String(prayer.time.hour).padStart(2, "0")}:${String(prayer.time.minute).padStart(2, "0")}`;

    const card = document.createElement("div");
    card.className = "prayer-card";

    if (prayerMinutes > currentMinutes && !nextPrayer) {
      nextPrayer = prayer;
      nextPrayerIndex = index;
      card.classList.add("next");
    }

    if (
      prayerMinutes <= currentMinutes &&
      prayerMinutes > currentMinutes - 60
    ) {
      card.classList.add("active");
    }

    card.innerHTML = `
                <div class="prayer-name">${prayer.icon} ${prayer.name}</div>
                <div class="prayer-time">${timeString}</div>
                <div class="prayer-status">${prayerMinutes <= currentMinutes ? "✓ Waktu Sudah Lewat" : "⏳ Menunggu..."}</div>
            `;

    prayerTimesDiv.appendChild(card);

    checkAndNotify(prayer, timeString);
  });

  if (nextPrayer) {
    const nextCard = document.createElement("div");
    nextCard.className = "prayer-card next";

    const timeString = `${String(nextPrayer.time.hour).padStart(2, "0")}:${String(nextPrayer.time.minute).padStart(2, "0")}`;
    const timeUntil = getTimeUntil(
      nextPrayer.time.hour,
      nextPrayer.time.minute,
    );

    nextCard.innerHTML = `
                <div class="prayer-name" style="font-size: 20px;">⏱️ Sholat Berikutnya: ${nextPrayer.name}</div>
                <div class="prayer-time">${timeString}</div>
                <div class="prayer-status">Waktu menunggu: ${timeUntil}</div>
            `;

    prayerTimesDiv.insertBefore(nextCard, prayerTimesDiv.firstChild);
  }
}

function getTimeUntil(hour, minute) {
  const now = new Date();
  const sholat = new Date();
  sholat.setHours(hour, minute, 0);

  if (sholat < now) {
    sholat.setDate(sholat.getDate() + 1);
  }

  const diff = sholat - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${mins}m`;
}

function checkAndNotify(prayer, timeString) {
  const now = testMode && testTime ? testTime : new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (currentTime === timeString && lastAlertedTime !== currentTime) {
    lastAlertedTime = currentTime;

    if (document.getElementById("enableNotification").checked) {
      playAlarmSound();
    }

    if (document.getElementById("enableAlert").checked) {
      showNotification(`Sudah Waktunya Sholat ${prayer.name}!`);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Pengingat Sholat 🕌`, {
          body: `Sudah waktunya untuk sholat ${prayer.name}`,
          icon: "☪️",
        });
      }
    }

    console.log(`Sholat ${prayer.name} pada ${currentTime}`);
  }

  if (document.getElementById("enable15minBefore").checked) {
    const sholat = new Date();
    const parts = timeString.split(":");
    sholat.setHours(parseInt(parts[0]), parseInt(parts[1]) - 15, 0);

    const reminderTime = `${String(sholat.getHours()).padStart(2, "0")}:${String(sholat.getMinutes()).padStart(2, "0")}`;

    if (
      currentTime === reminderTime &&
      lastAlertedTime !== "reminder-" + reminderTime
    ) {
      lastAlertedTime = "reminder-" + reminderTime;
      showNotification(
        `⏰ Pengingat: Sholat ${prayer.name} dalam 15 menit!`,
        "info",
      );
    }
  }
}

function showNotification(message, type = "success") {
  const notif = document.getElementById("notification");
  notif.textContent = message;
  notif.className = "notification show " + type;
  notif.style.display = "block";

  setTimeout(() => {
    notif.style.display = "none";
  }, 5000);
}

function updateClock() {
  const now = testMode && testTime ? testTime : new Date();
  const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  document.getElementById("currentTime").textContent = timeString;
}

function updateLocation() {
  const select = document.getElementById("citySelect");
  const customInput = document.getElementById("customLocation");

  if (select.value === "custom" && customInput.value) {
    showNotification(`Lokasi diatur ke: ${customInput.value}`, "info");
  } else if (select.value !== "custom") {
    currentCity = select.value;
    const cityName = cities[select.value].name;
    showNotification(`Lokasi diatur ke: ${cityName}`, "success");
  }

  updatePrayerTimes();
}

document.getElementById("citySelect").addEventListener("change", function () {
  const customInput = document.getElementById("customLocation");
  if (this.value === "custom") {
    customInput.style.display = "inline";
  } else {
    customInput.style.display = "none";
    currentCity = this.value;
    updatePrayerTimes();
  }
});

// Fungsi untuk Test Mode
function enableTestMode() {
  const testHourInput = document.getElementById("testHour");
  const testMinInput = document.getElementById("testMin");

  if (!testHourInput.value || !testMinInput.value) {
    showNotification("Masukkan jam dan menit terlebih dahulu!", "error");
    return;
  }

  const hour = parseInt(testHourInput.value);
  const min = parseInt(testMinInput.value);

  if (hour < 0 || hour > 23 || min < 0 || min > 59) {
    showNotification("Jam (0-23) dan Menit (0-59) tidak valid!", "error");
    return;
  }

  testMode = true;
  testTime = new Date();
  testTime.setHours(hour, min, 0);
  lastAlertedTime = null;

  showNotification(`📌 TEST MODE AKTIF - Waktu diatur ke: ${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`, "info");
  updateClock();
  updatePrayerTimes();
}

function disableTestMode() {
  testMode = false;
  testTime = null;
  lastAlertedTime = null;
  showNotification("✅ Test Mode Dimatikan - Kembali ke Waktu Nyata", "info");
  document.getElementById("testHour").value = "";
  document.getElementById("testMin").value = "";
  updateClock();
  updatePrayerTimes();
}

function testAllAlarms() {
  if (!testMode) {
    showNotification("Aktifkan Test Mode terlebih dahulu!", "error");
    return;
  }

  const prayerTimes = [
    { name: "Subuh", hour: 4, minute: 30 },
    { name: "Dzuhur", hour: 12, minute: 15 },
    { name: "Ashar", hour: 15, minute: 45 },
    { name: "Maghrib", hour: 18, minute: 20 },
    { name: "Isya", hour: 19, minute: 45 },
  ];

  let testIndex = 0;
  const runTest = () => {
    if (testIndex < prayerTimes.length) {
      const prayer = prayerTimes[testIndex];
      testTime.setHours(prayer.hour, prayer.minute, 0);

      updateClock();
      updatePrayerTimes();

      showNotification(`🧪 Testing: ${prayer.name} (${String(prayer.hour).padStart(2, "0")}:${String(prayer.minute).padStart(2, "0")})`, "info");

      testIndex++;
      setTimeout(runTest, 2500);
    } else {
      showNotification("✅ Semua Alarm Sudah Ditest!", "success");
    }
  };

  runTest();
}

if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

window.addEventListener("load", () => {
  updateClock();
  updatePrayerTimes();

  setInterval(updateClock, 1000);

  setInterval(updatePrayerTimes, 60000);

  setInterval(() => {
    const now = testMode && testTime ? testTime : new Date();
    const times = calculatePrayerTimes(
      now,
      cities[currentCity].lat,
      cities[currentCity].lon,
    );
    const prayers = [
      { name: "Subuh", time: times.Subuh },
      { name: "Dzuhur", time: times.Dzuhur },
      { name: "Ashar", time: times.Ashar },
      { name: "Maghrib", time: times.Maghrib },
      { name: "Isya", time: times.Isya },
    ];

    prayers.forEach((prayer) => {
      const timeString = `${String(prayer.time.hour).padStart(2, "0")}:${String(prayer.time.minute).padStart(2, "0")}`;
      checkAndNotify(prayer, timeString);
    });
  }, 1000);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("Halaman diminimalkan, notifikasi akan tetap berjalan");
  } else {
    console.log("Halaman aktif kembali");
  }
});
