const createWeatherCardImage = (weather) =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Weather card image rendering is unavailable."));
      return;
    }

    const background = context.createLinearGradient(0, 0, 1200, 630);
    background.addColorStop(0, "#142b38");
    background.addColorStop(1, "#08131d");
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(126, 216, 187, 0.08)";
    context.beginPath();
    context.arc(1010, 170, 220, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#88ddc1";
    context.font = "600 26px system-ui, sans-serif";
    context.fillText("✳ skyward", 72, 82);
    context.fillStyle = "#91a0aa";
    context.font = "600 17px system-ui, sans-serif";
    context.fillText("CURRENT WEATHER", 76, 178);

    context.fillStyle = "#f0f5f6";
    context.font = "500 58px system-ui, sans-serif";
    context.fillText(weather.name, 72, 254, 780);
    if (weather.sys.country) {
      context.fillStyle = "#99aab3";
      context.font = "400 30px system-ui, sans-serif";
      context.fillText(`, ${weather.sys.country}`, 78 + context.measureText(weather.name).width, 254);
    }

    const celsius = Math.round(weather.main.temp);
    context.fillStyle = "#f5f7f4";
    context.font = "400 174px system-ui, sans-serif";
    context.fillText(`${celsius}°C`, 68, 465);
    context.fillStyle = "#c4d0d4";
    context.font = "400 28px system-ui, sans-serif";
    context.fillText(weather.weather?.[0]?.description || "Current conditions", 78, 524);

    context.fillStyle = "#82939d";
    context.font = "500 16px system-ui, sans-serif";
    context.fillText("Shared from Skyward", 76, 590);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Weather card image could not be created."));
          return;
        }
        const safeName = weather.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        resolve(new File([blob], `skyward-${safeName}-weather.png`, { type: "image/png" }));
      },
      "image/png"
    );
  });

const downloadWeatherCard = (imageFile) => {
  const imageUrl = URL.createObjectURL(imageFile);
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = imageFile.name;
  link.click();
  URL.revokeObjectURL(imageUrl);
};

export { createWeatherCardImage, downloadWeatherCard };
