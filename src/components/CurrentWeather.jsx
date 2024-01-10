import { Button, Input } from "antd";
import { useState } from "react";

const CurrentWeather = () => {
  const api_key = "c9c49f5e59fdde9943de3de8534c1c35";
  const [city, setCity] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  const handleOnChange = (event) => {
    setCity(event.target.value);
  };

  const getCurrentWeather = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${api_key}`
      );

      // Check if the response status is OK (200)
      if (!response.ok) {
        throw new Error("City not found");
      }

      const responseData = await response.json();
      setResult(responseData);
    } catch (err) {
      setMessage("City not found");
    }
  };

  const handleOnSearch = () => {
    getCurrentWeather();
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <div className="flex w-[350px] ">
        <Input placeholder="Enter City" onChange={handleOnChange} />
        <Button className="bg-blue-600 text-white" onClick={handleOnSearch}>
          Search
        </Button>
      </div>
      <br />

      {result ? (
        <div>
          <img
            src={`https://openweathermap.org/img/wn/${result.weather[0].icon}@2x.png`}
            alt="Weather icon"
          />
          <p className="text-2xl text-green-600">{result.name}</p>
          <p className="text-2xl text-red-500">
            {parseInt(result.main.temp)} °C
          </p>
          <p>{result.weather[0].description}</p>
        </div>
      ) : (
        <p className="text-lg text-red-500 font-semibold">{message}</p>
      )}
    </div>
  );
};

export default CurrentWeather;
