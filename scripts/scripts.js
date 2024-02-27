const styling = {
  fonts: {
    chivo: 'Chivo',
  }, 
  colors: ['#006cba', '#000', '#abbaba', '#ff7b04', '#c43e3e', '#4b4bb0', '#720034', '#608864',],
  backgroundColor: '#efefef',
};

let gap;
let globalAmount = 5;
const initalCountries = ['Argentina', 'Mundo', 'Brasil', 'Chile', 'Suecia']
let selectedCountries;

const yearRange = { earliestYear: 0, latestYear: 0 };
const chartContainerId = 'chart-container';

const htmlTooltipHeader = '<table style="padding: 10px;"><tr><th style="border-bottom: 1px solid black; text-align: center; padding: 0 0 10px;" colspan="3">{point.key}</th></tr>';
const htmlTooltipContent = '<tr><td style="color: {series.color}; font-size: 12px;">⏺ \&nbsp </td><td>{series.name} </td><td style="text-align: right">{point.y}</td></tr>';
const htmlTooltipFooter = '</table>';

const renderChart = (data, amount = globalAmount, years, renderDuration = 1000) => {

  // shuffle array to get inital random configuration
  data = data.sort(() => Math.random() - 0.5);
  data = data.splice(0, amount);
  selectedCountries = data;
  
  gap = years.latestYear - years.earliestYear
  const interval = Math.round( (gap > 10) ? (gap / 6) : gap);

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
      height: 350,
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
        symbolStroke: 0,
        labelFormatter: function () {
          return `<p style="color:${this.color};">${this.name}</p>`;
      }
    },
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
      useHTML: true,
      valueDecimals: 2,
      valueSuffix: ' %',
      style: {
        fontSize: '12px',
        fontWeight: 400,
      },
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
  document.querySelector('#btn_download').addEventListener('click', () =>  chart.exportChart());
  document.querySelector('#btn_expand').addEventListener('click', () =>  chart.fullscreen.toggle());
};

const getCSVData = async () => {
  const route = 'scripts/TRANEN_g4.csv';    
  const res = await fetch(route);
  return await res.text();
};

const getCountryNames = async () => {
  const url = 'https://restcountries.com/v3.1/all';
  const response = await fetch(url);
  const data = await response.json();
  return data;
};

const processCountries = (data) => {
  const countries = [];
  for (const country of data) {
    countries.push({
      name: country.translations.spa.common,
      acronym: country.cca3
    });
  }
  return countries.sort();
};

const matchCountries = (countries, nameSets) => {
  countries.forEach((el, idx) => {
    const index = nameSets.findIndex(item => item.acronym === el.name);
    if (index !== -1) {
      el.name = nameSets[index].name;
    } else if (el.name === '') {
      countries.splice(idx, 1);
    } else if ((el.name === 'OWID_WRL') || (el.name === 'OWID_USS')) {
      const acr = el.name.substring(5);
      el.name = (acr === 'WRL') ? 'Mundo' : acr;
    } else {
      console.error('error: ', el)
    }
  });
  return countries;
};

document.addEventListener('DOMContentLoaded', async () => {

  const rawData = await getCSVData();
  const countries = Object.values(await getCountryNames());
  const countrySet = processCountries(countries).sort();

  const lines = rawData.split('\r\n');

  const seriesData = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    seriesData.push({ name: values[0], year: values[1], values: Number(values[2])});

    if (yearRange.earliestYear > Number(values[1]) || i === 1) {
      yearRange.earliestYear = Number(values[1]);
    }
    if (yearRange.latestYear < Number(values[1]) || i === 1) {
      yearRange.latestYear = Number(values[1]);
    }
  };

  const countriesArray = [];
  const countriesObject = seriesData.reduce((result, currentItem) => {
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
  const allCountriesComplete = matchCountries(countriesArray, countrySet);

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
    label.appendChild(input);
    countryList.appendChild(label);
  });

  const initialCountryArray = [];
  allCountriesComplete.forEach(el => {
    initalCountries.forEach(e => {
      if (e === el.name) initialCountryArray.push(el);
    });
  });
  
  // SET LISTENERS AND ACTIONS

  // open modal btn
  const selectCountriesBtn = document.querySelector('#buttons_select-countries')
  selectCountriesBtn.addEventListener('click', () => {
    const modal = document.querySelector('#countryModal')
    modal.classList.toggle('hide');
  });

  // close modal btn
  const closeModalBtn = document.querySelector('#btn_close')
  closeModalBtn.addEventListener('click', () => {
    const modal = document.querySelector('#countryModal')
    modal.classList.toggle('hide');
  });

  // select countries btn
  const submitModalBtn = document.querySelector('#btn_submit')
  submitModalBtn.addEventListener('click', () => {
    const modal = document.querySelector('#countryModal')
    
    const markedCheckbox = document.querySelectorAll('input[type="checkbox"]:checked');
    const newData = [];
    markedCheckbox.forEach(el => {
      const value = el.value;
      allCountriesComplete.filter((el) => {
        if (el.name.toLowerCase() === value.toLowerCase()) newData.push(el)
      });
    });

    if (markedCheckbox.length === 0) {
      alert('Por favor seleccione un país para visualizar en el gráfico');
    } else {
      modal.classList.toggle('hide');
      renderChart(newData, newData.length, yearRange, 1000)
    }
  });

  // clear modal btn
  const clearModalBtn = document.querySelector('#btn_clear')
  clearModalBtn.addEventListener('click', () => {
    const markedCheckbox = document.querySelectorAll('input[type="checkbox"]:checked');
    markedCheckbox.forEach(el => {
      el.checked = false;
    });
  });

  //search modal btn
  const modalInput = document.querySelector('#modal_search')
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  modalInput.addEventListener('keyup', () => {
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

  // play animation button in 8 seconds
  const playBtn = document.querySelector('#play-pause-button');
  playBtn.addEventListener('click', () => {
    const time = 8000;
    playBtn.disabled = true;
    setTimeout(() => playBtn.disabled = false, time);
    renderChart(selectedCountries, selectedCountries.length, yearRange, time)
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
  minRangeInput.min = yearRange.earliestYear;
  minRangeInput.max = yearRange.latestYear - 1;
  minRangeInput.value = yearRange.earliestYear;

  //max year range
  const maxYearLabel = document.querySelector('#play-controls .max-year')
  maxYearLabel.textContent = yearRange.latestYear;

  const maxRangeInput = document.querySelector('#max-year-range');
  maxRangeInput.min = yearRange.earliestYear + 1;
  maxRangeInput.max = yearRange.latestYear;
  maxRangeInput.value = yearRange.latestYear;

  minRangeInput.addEventListener('input', (e) => {
    minYearLabel.textContent = e.target.value;
    yearRange.earliestYear = Number(e.target.value);
    gap = yearRange.latestYear - yearRange.earliestYear;
    if (gap <= 1) return;

    renderChart(selectedCountries, selectedCountries.length, yearRange, 0)
  });

  maxRangeInput.addEventListener('input', (e) => {
    maxYearLabel.textContent = e.target.value;
    yearRange.latestYear = Number(e.target.value);
    gap = yearRange.latestYear - yearRange.earliestYear;
    if (gap <= 1) return;

    renderChart(selectedCountries, selectedCountries.length, yearRange, 0)
  });

  //share in FB btn
  document.querySelector('#btn_share').addEventListener('click', () => {
    let fbShare = 'https://www.facebook.com/sharer/sharer.php?u=';
    window.open(`${fbShare}${window.location.href}`, '_blank');
  });

  //first initial render 
  renderChart(initialCountryArray, globalAmount, yearRange);
});
