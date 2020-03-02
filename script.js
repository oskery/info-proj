// Settings:
var minYear = 1800
var maxYear = 2020
var legendValues = [0, 30, 40, 50, 60]
var minVal = 24 // Not used atm
var maxVal = 64 // Not used atm
var title = 'How it works'
var startPageText =
  'This visualization present how income inequality has changed over time, and how the levels of inequality in different countries can vary significantly. \n\n The inequality is measured through the Gini coefficient (shown). The value ranges from 0 to 100, where 0 equals total equality and 100 total inequality.'

// Creates yearspan and retrieves active year
var yearSpan = [...Array(maxYear - minYear).keys()]
  .map(x => x + minYear)
  .filter(x => x % 10 === 0)
var year = document.getElementById('selected-year').innerHTML
var yearAvg = Array(maxYear - minYear)
var selectedCountry

// Retrieve slider div
var slider = document.getElementById('slider'),
  selectedYearDiv = document.getElementById('selected-year')

// Triggers if user uses slider
slider.oninput = function() {
  selectedYearDiv.innerHTML = this.value
  year = this.value
  if (selectedCountry) {
    activeCountry(selectedCountry)
    updateSidebar()
    tip.show()
  } else {
    reFillMap()
    initSidebar()
  }
}

// The svg
var svg = d3.select('svg'),
  width = +svg.attr('width'),
  height = +svg.attr('height')

// Map and projection
var path = d3.geoPath()
var projection = d3.geoMercator().scale(90)

// Data, geoJSON and color scale
var data = d3.map()
var rich = d3.map()
var poor = d3.map()
var population = d3.map()
var nrPoor = d3.map()
var avgIncome = d3.map()

var topo
var colorScale = d3
  .scaleThreshold()
  .domain(legendValues)
  .range(d3.schemeReds[legendValues.length + 1]) // why + 1?? :S

// Load geoJSON and CSV
Promise.all([
  d3
    .json(
      'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'
    )
    .then(data => {
      topo = data
    }),
  d3.csv('csv/gini.csv').then(d => {
    d.map(x => {
      data.set(x.country, x)
    })
  }),
  d3.csv('csv/income_share_of_poorest_10percent.csv').then(d => {
    d.map(x => {
      poor.set(x.country, x)
    })
  }),
  d3.csv('csv/income_share_of_richest_10percent.csv').then(d => {
    d.map(x => {
      rich.set(x.country, x)
    })
  }),
  d3.csv('csv/number_of_people_in_poverty.csv').then(d => {
    d.map(x => {
      nrPoor.set(x.country, x)
    })
  }),
  d3.csv('csv/population_total.csv').then(d => {
    d.map(x => {
      population.set(x.country, x)
    })
  }),
]).then(drawMap)

// Get average GINI for current year
function getAvg() {
  var sum = 0
  var tot = 0
  for (var i in data) {
    var d = data[i][year]
    if (d) {
      sum += +d
      tot++
    }
  }
  var avg = Math.floor(sum / tot)
  var yearText = document.getElementById('selected-year')
  yearText.style.color = colorScale(avg)
  var yearText = document.getElementById('year-avg')
  yearText.innerText = 'World average this year: ' + avg
}

// Tooltip
var tip = d3
  .tip()
  .attr('class', 'd3-tip')
  .offset([-5, 0])
  .html(function(d) {
    if (selectedCountry)
      return selectedCountry + ': ' + data.get(selectedCountry)[year]
    var val = data.get(d.properties.name) && data.get(d.properties.name)[year]
    if (val) {
      return d.properties.name + ': ' + val
    } else {
      return d.properties.name + ': No data.'
    }
  })

svg.call(tip)

// Draw the map
function drawMap() {
  svg
    .append('g')
    .selectAll('path')
    .data(topo.features)
    .enter()
    .append('path')
    // draw each country
    .attr('d', d3.geoPath().projection(projection))
    .attr('class', 'country')
    .on('mouseover', d => {
      if (!selectedCountry) tip.show(d)
    })
    .on('mouseout', d => {
      if (!selectedCountry) tip.hide(d)
    })
    .on('click', clickedCountry)

    // set the color of each country
    .attr('fill', function(d) {
      d.total =
        (data.get(d.properties.name) && data.get(d.properties.name)[year]) || 0
      if (d.total === 0) return '#bbb'
      return colorScale(d.total)
    })
  getAvg()
  initSidebar()
}

// Draw legend
var legend = document.getElementById('legend')
var cols = d3.schemeReds[legend.length]

for (var i = 0; i < legendValues.length; i++) {
  var element = document.createElement('div')
  element.className = 'l-' + i
  element.style.background = colorScale(legendValues[i])
  var text
  if (i === 0) text = '<' + legendValues[i + 1]
  else if (i === legendValues.length - 1) text = '>' + legendValues[i - 1]
  else text = legendValues[i] + '-' + legendValues[i + 1]
  element.innerText = text
  legend.appendChild(element)
}

// Draw on map
function reFillMap() {
  svg.selectAll('path').attr('fill', function(d) {
    d.total =
      (data.get(d.properties.name) && data.get(d.properties.name)[year]) || 0
    if (d.total === 0) return '#bbb'
    return colorScale(d.total)
  })
  getAvg()
}

// Change color on active country
function activeCountry(selectedCountry) {
  svg.selectAll('path').attr('fill', function(d) {
    d.total =
      (data.get(d.properties.name) && data.get(d.properties.name)[year]) || 0
    if (d.total === 0)
      return `#bbbbbb${selectedCountry == d.properties.name ? '' : '30'}`
    return `${colorScale(
      d.total
    )}${selectedCountry == d.properties.name ? '' : '30'}`
  })
}

function clickedCountry(d) {
  let copy = selectedCountry

  selectedCountry = d.properties.name
  var element = document.getElementById('country-title')
  element.innerText = selectedCountry

  if (copy == d.properties.name) {
    reFillMap()
    tip.hide(d)
    selectedCountry = null
    initSidebar()
  } else {
    tip.show(d)
    activeCountry(d.properties.name)
    updateSidebar()
  }
}

function updateSidebar() {
  var pop =
    (population.get(selectedCountry) &&
      population.get(selectedCountry)[year]) ||
    0
  var numPoor =
    (nrPoor.get(selectedCountry) && nrPoor.get(selectedCountry)[year]) || 0

  var textBlock = document.getElementById('country-text')
  textBlock.innerHTML = ''
  var textPop = document.createElement('p')
  textPop.innerText =
    'Population: ' +
    (pop == 0
      ? 'N/A'
      : pop / 1000000 > 1000
      ? pop / 1000000000 + ' billion'
      : pop / 1000000 + ' million')
  var textNrPoor = document.createElement('p')
  textNrPoor.innerText =
    'Number of poor: ' + (numPoor === 0 ? 'N/A' : numPoor + ' million')
  var textAvgIncome

  textBlock.appendChild(textPop)
  textBlock.appendChild(textNrPoor)

  var richMoney = rich.get(selectedCountry)[year] || 0
  var poorMoney = poor.get(selectedCountry)[year] || 0

  bb.generate({
    data: {
      columns: [
        ['Rich', richMoney],
        ['Poor', poorMoney],
        ['The rest', 100 - richMoney - poorMoney],
      ],
      color: function(color, d) {
        return { Rich: '#000', Poor: '#f00', 'The rest': '#fff' }[d]
      },
      type: 'pie',
    },
    bindto: '#pie-chart',
    interaction: {
      enabled: false,
    },
    legend: {
      item: {
        onclick: () => {},
      },
    },
  })
}

function initSidebar() {
  var cTitle = document.getElementById('info-title')
  cTitle.innerText = title
  var parent = document.getElementById('info-text')
  parent.innerText = startPageText

  cTitle = document.getElementById('country-title')
  cTitle.innerText = 'Country details'
  parent = document.getElementById('country-text')
  parent.innerText =
    'Click on a country on the map to get specific information.'
  var pie = document.getElementById('pie-chart')
  pie.innerHTML = ''
}
