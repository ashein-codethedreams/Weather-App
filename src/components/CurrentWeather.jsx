import { Button, Input } from "antd";
import { useState } from "react";

const CurrentWeather = () => {
  const api_key = "c9c49f5e59fdde9943de3de8534c1c35";
  const [isLoading, setIsLoading] = useState(false);
  const [city, setCity] = useState("");

  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  const handleOnChange = (event) => {
    setCity(event.target.value.trim());
  };

  const getCurrentWeather = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8080/weather?city=${city}&apiKey=${api_key}`
      );

      // Check if the response status is OK (200)
      if (!response.ok) {
        throw new Error("City not found");
      }
      const responseData = await response.json();
      setResult(responseData);
      setIsLoading(false);
    } catch (err) {
      setMessage("City not found");
      setIsLoading(false);
    }
  };

  const handleOnSearch = () => {
    setResult(null);
    setMessage(null);
    setIsLoading(true);
    getCurrentWeather();
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleOnSearch();
    }
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <div className="flex w-[350px] ">
        <Input
          className="h-12 md:h-auto"
          placeholder="Enter City"
          onChange={handleOnChange}
          style={{ borderRadius: "1px" }}
          onPressEnter={handleKeyPress}
        />
        <Button
          style={{ borderRadius: "1px" }}
          className="h-12 md:h-auto bg-blue-600 text-white"
          onClick={handleOnSearch}
        >
          Search
        </Button>
      </div>
      <br />
      {isLoading ? (
        <p>Searching weather for {city} ...</p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default CurrentWeather;
