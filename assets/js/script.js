const bodyContainer = document.body;
const cityNameInput = document.getElementById("city-input");
const cityResultsContainer = document.getElementById("c19-CR");

let cityData = {};
let covidData = {};
let weatherData = {};

const options = {
  fields: ["address_components", "geometry"],
  strictBounds: false,
  types: ["(cities)"],
  componentRestrictions: {
    country: "us",
  },
};

const autocomplete = new google.maps.places.Autocomplete(cityNameInput, options);

autocomplete.addListener("place_changed", () => {
  const place = autocomplete.getPlace();

  if (!place.geometry || !place.geometry.location) {
    return;
  }

  storeCityData(place);
});

function storeCityData(data) {
  const components = data;

  console.log(data);

  //Stores the city latatuide and longitude to cityData Object
  cityData["lat"] = components.geometry.location.lat();
  cityData["lon"] = components.geometry.location.lng();

  //Loops through adress_components and stores the values to cityData Object
  for (i = 0; i < components.address_components.length; i++) {
    const type = components.address_components[i].types[0];

    switch (type) {
      //locality is defined as the city's name (Ex: Akron)
      case "locality":
        //Saves the city's name under cityData.city
        cityData["city"] = components.address_components[i].long_name;
        break;
      //administrative_area_level_1 is defined as the city's state (Ex: OH)
      case "administrative_area_level_1":
        //Saves the city's state under cityData.state
        cityData["state"] = components.address_components[i].short_name;
        break;
      //administrative_area_level_2 is defined as the city's county name(Ex: Summit County)
      case "administrative_area_level_2":
        //Saves the city's county name under cityData.county_name
        cityData["county_name"] = components.address_components[i].long_name;
        break;
      //country is defined as the country name(Ex: USA)
      case "country":
        //Saves the country under cityData.country
        cityData["country"] = components.address_components[i].short_name;
        break;
    }
  }
  getCountyData(cityData.lat, cityData.lon, getCovidData);
  getWeatherData(cityData.lat, cityData.lon);
}

function getCountyData(lat, lon, callback) {
  const apiUrl = "https://geo.fcc.gov/api/census/area?lat=" + lat + "&lon=" + lon + "&format=json";

  fetch(apiUrl)
    .then(function (response) {
      if (response.ok) {
        response.json().then(function (data) {
          cityData["county_id"] = data.results[0].county_fips;
          return callback(data.results[0].county_fips);
        });
      } else {
        alert("Error");
      }
    })
    .catch(function (error) {
      alert("Unable to connect to API");
    });
}

function getCovidData() {
  const apiUrl =
    "https://api.covidactnow.org/v2/county/" + cityData.county_id + ".json?apiKey=a76656a67c614ecf8405967df3fded3f";

  fetch(apiUrl)
    .then(function (response) {
      if (response.ok) {
        response.json().then(function (data) {
          covidData = data;
          console.log(data);
          displayCovidData();
        });
      } else {
        alert("Error");
      }
    })
    .catch(function (error) {
      alert("Unable to connect to API");
    });
}

function getWeatherData(lat, lon) {
  var apiUrl =
    "https://api.openweathermap.org/data/2.5/onecall?lat=" +
    lat +
    "&lon=" +
    lon +
    "&exclude=minutely,hourly&units=imperial&appid=05d022c22c687fddb635d7cf8a4c9afb";

  fetch(apiUrl)
    .then(function (response) {
      if (response.ok) {
        response.json().then(function (data) {
          weatherData = data;
          displayFutureForecast();
        });
      } else {
        alert("Error: Can't find weather");
      }
    })
    .catch(function (error) {
      alert("Unable to connect to OpenWeatherAPI");
    });
}

function displayFutureForecast() {
  for (i = 0; i < 5; i++) {
    var header = document.getElementById("forecast-header-" + i);
    var date = moment.unix(weatherData.daily[i].dt).format("MM/DD/YYYY");
    header.textContent = date;

    var icon = document.getElementById("forecast-icon-" + i);

    if (icon) {
      icon.innerHTML = "";
    }

    var weatherIconId = weatherData.daily[i].weather[0].icon;

    var img = document.createElement("img");
    img.src = "https://openweathermap.org/img/w/" + weatherIconId + ".png";
    icon.appendChild(img);

    var p = document.createElement("p");
    p.textContent = weatherData.daily[i].weather[0].main;
    icon.appendChild(p);

    var body = document.getElementById("forecast-body-" + i);

    if (body) {
      body.innerHTML = "";
    }

    var temp = document.createElement("h5");
    temp.className = "card-text";
    temp.textContent =
      "H:" +
      Math.round(weatherData.daily[i].feels_like.day) +
      "° L:" +
      Math.round(weatherData.daily[i].feels_like.night) +
      "°";
    body.appendChild(temp);

    var wind = document.createElement("h5");
    wind.className = "card-text";
    wind.textContent = "Wind: " + Math.round(10 * weatherData.daily[i].wind_speed) / 10 + "MPH";
    body.appendChild(wind);

    var humidity = document.createElement("h5");
    humidity.className = "card-text";
    humidity.textContent = "Humidity: " + weatherData.daily[i].humidity + "%";
    body.appendChild(humidity);
  }
}

function displayCovidData() {
  const cityTitle = document.getElementById("c19-CT");

  cityTitle.textContent = cityData.city + ", " + cityData.state + " (" + cityData.county_name + ")";

  const riskLevel = document.getElementById("c19-RL");

  riskLevel.innerHTML = "";

  const riskResultDivEl = document.createElement("div");
  const riskResultSpanEl = document.createElement("span");

  let getRiskLevel = getRiskResult("RL", covidData.riskLevels.overall);

  riskResultDivEl.className = "risk-result " + getRiskLevel;
  riskResultSpanEl.textContent = getRiskLevel.toUpperCase();
  riskResultSpanEl.className = "bold";

  riskLevel.appendChild(riskResultDivEl);
  riskLevel.appendChild(riskResultSpanEl);

  const vaccineProgress1D = covidData.metrics.vaccinationsInitiatedRatio * 100;
  const vaccineProgress2D = covidData.metrics.vaccinationsCompletedRatio * 100;

  let VR1D = new ldBar("#PB-VR-1D");
  VR1D.set(roundDecimal(vaccineProgress1D), true);

  let VR2D = new ldBar("#PB-VR-2D");
  VR2D.set(roundDecimal(vaccineProgress2D), true);

  const dailyCasesEl = document.getElementById("DC");

  dailyCasesEl.innerHTML = "";

  const dcDiv = document.createElement("div");
  const dcSpan = document.createElement("span");
  const dcSpan2 = document.createElement("span");

  let getDailyCaseLevel = getRiskResult("DC", covidData.metrics.caseDensity);

  dcDiv.className = "risk-result " + getDailyCaseLevel;
  dcSpan.className = "bold";
  dcSpan.textContent = roundDecimal(covidData.metrics.caseDensity);
  dcSpan2.className = "small";
  dcSpan2.textContent = " per 100K";

  dailyCasesEl.appendChild(dcDiv);
  dailyCasesEl.appendChild(dcSpan);
  dailyCasesEl.appendChild(dcSpan2);

  const infectionRateEl = document.getElementById("IR");

  infectionRateEl.innerHTML = "";

  const irDiv = document.createElement("div");
  const irSpan = document.createElement("span");

  let getInfectinRateLevel = getRiskResult("IR", covidData.metrics.infectionRate);

  irDiv.className = "risk-result " + getInfectinRateLevel;
  irSpan.className = "bold";
  irSpan.textContent = roundDecimal(covidData.metrics.infectionRate) + "%";

  infectionRateEl.appendChild(irDiv);
  infectionRateEl.appendChild(irSpan);

  const positiveRateEl = document.getElementById("PT");

  positiveRateEl.innerHTML = "";

  const ptDiv = document.createElement("div");
  const ptSpan = document.createElement("span");

  const getPositiveTestNum = covidData.metrics.testPositivityRatio * 100;

  let getPositiveTestLevel = getRiskResult("PT", getPositiveTestNum);

  ptDiv.className = "risk-result " + getPositiveTestLevel;
  ptSpan.className = "bold";
  ptSpan.textContent = roundDecimal(getPositiveTestNum) + "%";

  positiveRateEl.appendChild(ptDiv);
  positiveRateEl.appendChild(ptSpan);

  const populationEl = document.getElementById("population");
  populationEl.textContent = numberWithCommas(covidData.population);

  const casesEl = document.getElementById("cases");
  casesEl.textContent = numberWithCommas(covidData.actuals.cases);

  const deathsEl = document.getElementById("deaths");
  deathsEl.textContent = numberWithCommas(covidData.actuals.deaths);

  const hospitalizedEl = document.getElementsByClassName("hospitalized");
  hospitalizedEl[0].textContent = numberWithCommas(
    covidData.actuals.hospitalBeds.currentUsageCovid + covidData.actuals.icuBeds.currentUsageCovid
  );
  hospitalizedEl[1].textContent = numberWithCommas(
    covidData.actuals.hospitalBeds.currentUsageCovid + covidData.actuals.icuBeds.currentUsageCovid
  );

  const stableEl = document.getElementsByClassName("stable-condition");
  stableEl[0].textContent = numberWithCommas(covidData.actuals.hospitalBeds.currentUsageCovid);
  stableEl[1].textContent = numberWithCommas(covidData.actuals.hospitalBeds.currentUsageCovid);

  const criticalEl = document.getElementsByClassName("critical-condition");
  criticalEl[0].textContent = numberWithCommas(covidData.actuals.icuBeds.currentUsageCovid);
  criticalEl[1].textContent = numberWithCommas(covidData.actuals.icuBeds.currentUsageCovid);
}

//function to place commas in a number
//SOURCE: (https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript)
function numberWithCommas(x) {
  if (x === null || x === 0) {
    return "N/A";
  }
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function roundDecimal(num) {
  return Math.round(num * 10) / 10;
}

function getRiskResult(type, num) {
  if (type === "RL") {
    if (num < 1) {
      return "low";
    } else if (num >= 1 && num < 2) {
      return "medium";
    } else if (num >= 2 && num < 3) {
      return "high";
    } else if (num >= 3 && num < 4) {
      return "critical";
    } else {
      return "severe";
    }
  }

  if (type === "DC") {
    if (num < 1) {
      return "low";
    } else if (num >= 1 && num < 10) {
      return "medium";
    } else if (num >= 10 && num < 25) {
      return "high";
    } else if (num >= 25 && num < 75) {
      return "critical";
    } else {
      return "severe";
    }
  }

  if (type === "IR") {
    if (num < 0.9) {
      return "low";
    } else if (num >= 0.9 && num < 1.1) {
      return "medium";
    } else if (num >= 1.1 && num < 1.4) {
      return "high";
    } else if (num >= 1.4 && num < 1.7) {
      return "critical";
    } else {
      return "severe";
    }
  }

  if (type === "PT") {
    if (num < 3) {
      return "low";
    } else if (num >= 3 && num < 10) {
      return "medium";
    } else if (num >= 10 && num < 20) {
      return "high";
    } else if (num >= 20 && num < 25) {
      return "critical";
    } else {
      return "severe";
    }
  }
}

function setHeaderText() {}

function setElements() {
  if ($(window).width() <= 991) {
    $("#x1").addClass("d-none");
    $("#x2").removeClass("d-none");
  } else {
    $("#x2").addClass("d-none");
    $("#x1").removeClass("d-none");
  }
  if ($(window).width() <= 686) {
    $(".other-results").removeClass("d-flex");
  } else {
    $(".other-results").addClass("d-flex");
  }
  if ($(window).width() <= 536) {
    $(".top-row").removeClass("d-flex justify-content-between").addClass("d- block justify-content-center");
  } else {
    $(".top-row").addClass("d-flex justify-content-between").removeClass("d-block justify-content-center");
  }
}

$(window).on("scroll", function () {
    if($(document).scrollTop() > 0) {
    $(".curve").css("padding", "0.1em 0.5em 1em").css("transition", "0.25s");
  } else {
    $(".curve").css("padding", "2em 0.5em 1.5em").css("transition", "0.25s");
    $(".curve").css("padding-bottom", "4em");
  }
});

$(window).on("resize", function () {
  setElements();
});

setElements();

//getLatLon();
