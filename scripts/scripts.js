const styling = {
  fonts: {
    chivo: 'Chivo',
  }, 
  colors: [ '#000', '#abbaba', '#006cba', '#c43e3e', '#4b4bb0', '#720034', '#608864', '#ff7b04'],
  backgroundColor: '#efefef',
}

let globalAmount = 6;
let selectedCountries;

const yearRange = { earliestYear: 0, latestYear: 0 };
const chartContainerId = 'chart-container';

const htmlTooltipHeader = '<table style="padding: 10px;"><tr><th style="border-bottom: 1px solid black; text-align: center; padding: 0 0 10px;" colspan="3">{point.key}</th></tr>';
const htmlTooltipContent = '<tr><td style="color: {series.color}; font-size: 12px;">⏺ \&nbsp </td><td>{series.name} </td><td style="text-align: right">{point.y}</td></tr>';
const htmlTooltipFooter = '</table>';

const renderChart = (data, amount, years, renderDuration) => {

  // shuffle array to get inital random configuration
  data = data.sort(() => Math.random() - 0.5);
  data = data.splice(0, amount);
  selectedCountries = data;

  const interval = Math.round((years.latestYear - years.earliestYear) / 6)


  if (!renderDuration) renderDuration = 1000;

  const chartConfigObj = {
    title: {
      text: null,
    },
    chart: {
      renderTo: chartContainerId,
      type: 'line',
      style: {
        fontFamily: styling.fonts.chivo,
      },
      backgroundColor: styling.backgroundColor,
    },

    yAxis: {
      title: {
        text: null
      },
      labels: {
        format: '{value}%',
      },
    },

    xAxis: {
      accessibility: {
            rangeDescription: `Range: ${years.earliestYear} to ${years.latestYear}` 
      },
      min: years.earliestYear,
      max: years.latestYear,
      showFirstLabel: true,
      showLastLabel: true,
      tickInterval: interval,
      tickLength: 0,
    },

    legend: {
        layout: 'proximate',
        align: 'right',
        // x: 300,
        symbolStroke: 0,
        labelFormatter: function () {
          return `<p style="color:${this.color};">${this.name}</p>`;
      }
    },
    // PLOT OPTIONS
    plotOptions: {
        series: {
          label: {
              connectorAllowed: false
          },
          pointStart: years.earliestYear,
          marker: {
            enabled: false,
            symbol: 'circle',
            lineColor: this.color,
            lineWidth: 0,
            radius: 3,
          },
          states: {
            hover: {
              enabled: true,
              lineWidth: 0,
              halo: {
                  size: 0,
              },
              lineWidthPlus: 0,
            }
          },
          animation: {
            duration: renderDuration,
          },
          legendSymbol: 'none',
        }
    },
    // the data goes here
    series: data,

    navigation: {
      buttonOptions: {
          enabled: false
      }
    },
    credits:{
      enabled: false,
    },
    tooltip: {
      crosshairs: true,
      shared: true,
      borderRadius: 0,
      borderColor: '#000',
      shadow: 0,
      className: 'chart-tooltip',
      distance: 20,
      padding: 0,
      headerFormat: htmlTooltipHeader,
      pointFormat: htmlTooltipContent,
      footerFormat: htmlTooltipFooter,
      // headerFormat: '<span><p style="font-size: 1em; font-weight: 600; margin-bottom: 5px;">{point.x}</p></span></br>',
      // pointFormat: '{series.name}: <b>{point.y:,.2f}% </b></br>',
      useHTML: true,
      valueDecimals: 2,
      valueSuffix: ' %',
      style: {
        fontSize: '12px',
        fontWeight: 400,
      },
      // formatter: function () {
      //     return this.points.reduce(function (s, point) {
      //         return s + '<br/>' + point.series.name + ': ' +
      //             point.y + 'm';
      //     }, '<b>' + this.x + '</b>');
      // },
    },
    responsive: {
      rules: [{
          condition: {
              maxWidth: 500,
          },
          chartOptions: {
              legend: {
                  layout: 'horizontal',
                  align: 'center',
                  verticalAlign: 'bottom'
              }
          }
      }]
    }
  };

  Highcharts.setOptions({
    colors: styling.colors,
  });

  let chart = Highcharts.chart(chartConfigObj);

  // chart actions
  document.querySelector('.btn_download').addEventListener('click', function() {
    chart.exportChart();
  });

  document.querySelector('.btn_expand').addEventListener('click', function() {
    chart.fullscreen.toggle();
  });
}

const getCSVData = async () => {
  const route = 'scripts/TRANEN_g4.csv';    
  const res = await fetch(route);
  return await res.text();
}

const getCountryNames = async () => {
  const url = 'https://restcountries.com/v3.1/all';
  const response = await fetch(url);
  const data = await response.json();
  return data
}

function processCountries(data) {
  const countries = [];
  for (const country of data) {
    countries.push({
      name: country.name.common,
      acronym: country.cca3
    });
  }
  return countries.sort();
}

const matchCountries = (countries, nameSets) => {
  countries.forEach((el, idx) => {
    const index = nameSets.findIndex(item => item.acronym === el.name);
    if (index !== -1) {
      el.name = nameSets[index].name;
    } else if (el.name === '') {
      countries.splice(idx, 1)
    } else if ((el.name === 'OWID_WRL') || (el.name === 'OWID_USS')) {
      const acr = el.name.substring(5)
      el.name = (acr === 'WRL') ? 'World' : acr;
    } else {
      console.error('error: ', el)
    }
  });
  return countries;
}

document.addEventListener('DOMContentLoaded', async function() {

  const rawData = await getCSVData();
  const countries = Object.values(await getCountryNames());
  const countrySet = processCountries(countries).sort()

  const lines = rawData.split('\r\n');

  const seriesData = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    seriesData.push({ name: values[0], year: values[1], values: Number(values[2])});

    if (yearRange.earliestYear > Number(values[1]) || i === 1) {
      yearRange.earliestYear = Number(values[1])
    }
    if (yearRange.latestYear < Number(values[1]) || i === 1) {
      yearRange.latestYear = Number(values[1])
    }
  }

  const countriesArray = [];
  const countriesObject = seriesData.reduce((result, currentItem, idx) => {
    const name = currentItem.name;
    if (!result[name]) {
        result[name] = {
            name,
            data: [],
        };
    }
    result[name].data.push(currentItem.values);
    return result;
  }, {});

  countriesArray.push(...Object.values(countriesObject));
  const allCountriesComplete = matchCountries(countriesArray, countrySet)
  selectedCountries = allCountriesComplete;

  const countryList = document.querySelector('#country-list form');
  selectedCountries.forEach((el, idx) => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `country-${idx}`;
    input.name = el.name;
    input.value = el.name;
    const label = document.createElement('label');
    label.for = el.name;
    label.innerText = el.name;
    label.appendChild(input)
    countryList.appendChild(label)
  });
  


  // SET LISTENERS AND ACTIONS

  // open modal btn
  const selectCountriesBtn = document.querySelector('#buttons_select-countries')
  selectCountriesBtn.addEventListener('click', function(e) {
    const modal = document.querySelector('#countryModal')
    modal.classList.toggle('hide');
  });

  // close modal btn
  const closeModalBtn = document.querySelector('#btn_close')
  closeModalBtn.addEventListener('click', function(e) {
    const modal = document.querySelector('#countryModal')
    modal.classList.toggle('hide');
  });

  // select countries btn
  const submitModalBtn = document.querySelector('#btn_submit')
  submitModalBtn.addEventListener('click', function(e) {
    const modal = document.querySelector('#countryModal')
    
    var markedCheckbox = document.querySelectorAll('input[type="checkbox"]:checked');
    const newData = [];
    markedCheckbox.forEach(el => {
      const value = el.value;
      allCountriesComplete.filter((el) => {
        if (el.name === value) newData.push(el)
      });
    });

    if (markedCheckbox.length === 0) {
      alert('Por favor seleccione un país para visualizar en el gráfico');
    } else {
      modal.classList.toggle('hide');
      // globalAmount = markedCheckbox.length;
      // selectedCountries = newData;
      console.log(newData.length)
      console.log(newData)

      renderChart(newData, newData.length, yearRange, 1000)
    }
  });

  // clear modal btn
  const clearModalBtn = document.querySelector('#btn_clear')
  clearModalBtn.addEventListener('click', function(e) {
    var markedCheckbox = document.querySelectorAll('input[type="checkbox"]:checked');
    markedCheckbox.forEach(el => {
      el.checked = false;
    });
  });

  //search modal btn
  const modalInput = document.querySelector('#modal_search')
  var checkboxes = document.querySelectorAll('input[type="checkbox"]');
  modalInput.addEventListener('keyup', function(e) {

  const value = modalInput.value;
  const length = value.length;

  if (length === 0) {
    checkboxes.forEach(box => {
      box.parentNode.style = 'opacity: 1;';
      box.disabled = false;
    });
  } else if (length != 0 ) {
    checkboxes.forEach(box => {
      const name = box.name.substring(0,length);
      if ((name.toLowerCase() != value) && (box.checked === false)) {
        box.parentNode.style = 'opacity: 0.4;';
        box.disabled = true;
      } else {
        box.parentNode.style = 'opacity: 1;';
        box.disabled = false;
      }
    });
  }

  
  
  
  });

  // play animation button
  const playBtn = document.querySelector('#play-pause-button');
  playBtn.addEventListener('click', function() {
    renderChart(selectedCountries, selectedCountries.length, yearRange, 8000)
  });

  // set range inputs and labels
  const rangeInputs = document.querySelectorAll('.year-range');
  rangeInputs.forEach((range, idx) => {
    range.min = yearRange.earliestYear;
    range.max = yearRange.latestYear;
    range.value = (idx === 0) ? yearRange.earliestYear : yearRange.latestYear;

  });
  //min year range
  const minYearLabel = document.querySelector('#play-controls .min-year')
  minYearLabel.textContent = yearRange.earliestYear;
  const minRangeInput = document.querySelector('#min-year-range');

  //max year range
  const maxYearLabel = document.querySelector('#play-controls .max-year')
  maxYearLabel.textContent = yearRange.latestYear;
  const maxRangeInput = document.querySelector('#max-year-range');

  minRangeInput.addEventListener('input', function(e) {
    maxRangeInput.min = e.target.value;
    minYearLabel.textContent = e.target.value;
    yearRange.earliestYear = Number(e.target.value);
    console.log(yearRange)
    renderChart(selectedCountries, selectedCountries.length, yearRange, 0)
  });
  maxRangeInput.addEventListener('input', function(e) {
    minRangeInput.max = e.target.value;
    maxYearLabel.textContent = e.target.value;
    yearRange.latestYear = Number(e.target.value);
    console.log(yearRange)
    renderChart(selectedCountries, selectedCountries.length, yearRange, 0)
  });

  //share in FB btn
  document.querySelector('.btn_share').addEventListener('click', function(e) {
    let fbShare = 'https://www.facebook.com/sharer/sharer.php?u=';
    window.open(`${fbShare}${window.location.href}`, '_blank');
  });

  //first initial render
  renderChart(selectedCountries, globalAmount, yearRange, 1000);
});
