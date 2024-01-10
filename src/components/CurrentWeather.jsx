import { Button, Input } from "antd";
import { useState } from "react";

const CurrentWeather = () => {
  const api_key = "c9c49f5e59fdde9943de3de8534c1c35";
  const [city, setCity] = useState("");
  const handleOnChange = (event) => {
    setCity(event.target.value);
  };

  const getCurrentWeather = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api_key}`
      );
      const responseData = await response.json();

      console.log(responseData);
    } catch (err) {
      console.log(err.message);
    }
  };

  const handleOnSearch = () => {
    getCurrentWeather();
    console.log(city);
  };

  return (
    <div className="flex w-[350px]">
      <Input placeholder="Enter City" onChange={handleOnChange} />
      <Button className="bg-blue-600 text-white" onClick={handleOnSearch}>
        Search
      </Button>
    </div>
  );
};
export default CurrentWeather;
