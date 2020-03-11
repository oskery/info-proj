// Settings:
var minYear = 1800
var maxYear = 2020
var legendValues = [0, 30, 40, 50, 60]
var minVal = 24 // Not used atm
var maxVal = 64 // Not used atm
var title = 'How it works'
var startPageText2 = ""
var startPageText =
  'This visualization present how income inequality has changed over time, and how the levels of inequality in different countries can vary significantly. \n\n The inequality is measured through the Gini coefficient. The value ranges from 0 to 100, where 0 equals total equality and 100 total inequality.'

// Creates yearspan and retrieves active year
var yearSpan = [...Array(maxYear - minYear).keys()]
  .map(x => x + minYear)
  .filter(x => x % 10 === 0)
var year = document.getElementById('selected-year').innerHTML
var yearAvg = Array(maxYear - minYear)
var selectedCountry = null
var clicks = 0
var news = {}
var lastFetch = new Date()

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
  fetchNews()

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
    if (selectedCountry && data.get(selectedCountry))
      return selectedCountry + ': ' + data.get(selectedCountry)[year]
    var val = data.get(selectedCountry) && data.get(selectedCountry)[year]
    if (val) {
      returnselectedCountry + ': ' + val
    } else {
      return selectedCountry + ': No data.'
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

// Zoom
var zoom = d3
  .zoom()
  .scaleExtent([1, 8])
  .on('zoom', function () {
    var element = document.getElementById('zoom-button')
    svg.selectAll('path').attr('transform', d3.event.transform)
  })

svg.call(zoom)

// Draw legend
var legend = document.getElementById('legend')
var cols = d3.schemeReds[legend.length]

for (var i = 0; i < legendValues.length; i++) {
  var element = document.createElement('div')
  element.className = 'l-' + i
  element.style.background = colorScale(legendValues[i])
  var text
  if (i === 0) text = '<' + legendValues[i + 1]
  else if (i === legendValues.length - 1) text = '>' + legendValues[i]
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
  var button1 = document.getElementsByTagName('button')[0]
  button1.style.visibility = 'hidden'
  document.getElementById("news").style.display = "none"

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

function clickedCountry (d) {
  let copy = selectedCountry

  selectedCountry = d.properties.name
  var element = document.getElementById('country-title')
  element.innerText = selectedCountry
  var button1 = document.getElementsByTagName('button')[0]

  if (copy == d.properties.name) {
    reFillMap()
    tip.hide(d)
    selectedCountry = null
    initSidebar()
    document.getElementById("news").style.display = "none"
  } else {
    tip.show(d)
    activeCountry(d.properties.name)
    updateSidebar()
    button1.style.visibility = 'visible'
  fetchNews()
  document.getElementById("news").style.display = "flex"

  }
}

function updateSidebar() {
  var maintext = document.getElementsByTagName('section')[0]
  maintext.style.display = 'none'
  var pop =
    (population.get(selectedCountry) &&
      population.get(selectedCountry)[year]) ||
    0
  var numPoor =
    (nrPoor.get(selectedCountry) && nrPoor.get(selectedCountry)[year]) || 0

  var textBlock = document.getElementById('country-text')
  textBlock.innerHTML = ''
  var textPop = document.createElement('li')
  textPop.innerHTML =
    'Population: <span class="bigger">' +
    (pop == 0
      ? 'N/A'
      : pop / 1000000 > 1000
      ? pop / 1000000000 + ' billion'
      : pop / 1000000 + ' million')
  textPop.innerHTML += '<div class="tooltip"><i class="fas fa-question-circle"></i><span class="tooltiptext"><a target="_blank" href="https://www.gapminder.org/data/documentation/gd003/">Source</a></a></span></div></span>'
  var textNrPoor = document.createElement('li')
  textNrPoor.innerHTML =
    'People living below 1.25$/day: <span class="bigger">' +
  (numPoor === 0 ? 'N/A</span>' : numPoor + ' million</span>')
  textNrPoor.innerHTML += '<div class="tooltip"><i class="fas fa-question-circle"></i><span class="tooltiptext">1.25$ at 2005 international prices, data taken from <a target="_blank" href="https://www.gapminder.org/data/">Gapminder</a></a></span></div></span>'

  var textAvgIncome

  textBlock.appendChild(textPop)
  textBlock.appendChild(textNrPoor)

  var richMoney = rich.get(selectedCountry) && rich.get(selectedCountry)[year] || 0
  var poorMoney = poor.get(selectedCountry) && poor.get(selectedCountry)[year] || 0

  var pie = document.getElementById('pie-chart')
  if (richMoney === 0 || poorMoney === 0) {
    pie.innerHTML = '<i><small>No data available for pie chart. Please try another year!</small></i>'
  } else {
    bb.generate({
      data: {
        columns: [
          ['Income share of richest 10%', richMoney],
          ['Income share of poorest 10%', poorMoney],
          ['The rest', 100 - richMoney - poorMoney],
        ],
        color: function(color, d) {
          return {
            'Income share of richest 10%': '#000',
            'Income share of poorest 10%': '#f00',
            'The rest': '#ddd',
          }[d]
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
}

function initSidebar() {
  var maintext = document.getElementsByTagName('section')[0]
  maintext.style.display = 'block'
  /*parent.innerHTML +=
    '<br /><br /><i>"If we are concerned about equality of opportunity tomorrow, we need to be concerned about inequality of outcome today"</i><span style="float:right; margin-top: 10px">- Anthony B. Atkinson</span>'
*/
  cTitle = document.getElementById('country-title')
  cTitle.innerText = 'Country details'
  parent = document.getElementById('country-text')
  parent.innerText =
    'Click on a country on the map to get specific information.'
  var pie = document.getElementById('pie-chart')
  pie.innerHTML = ''
}

function reset() {
  selectedCountry = null
  initSidebar()
  reFillMap()
}

function resetZoom () {
  zoom.transform(svg.transition().duration(450), d3.zoomIdentity)
  var element = document.getElementById('zoom-button')
}

function zoomIn () {
	zoom.scaleBy(svg.transition().duration(450), 2.0);
}

function zoomOut() {
	zoom.scaleBy(svg.transition().duration(450), 1/2.0);
}

function clickedMap() {
  if (!selectedCountry) clicks = 0
  else clicks++
  if (clicks > 1 && selectedCountry) {
    console.log('reset')
    selectedCountry = null
    clicks = 0
    reset()
  }
}


function fetchNews () {
  if (new Date() - lastFetch > 2000) {
    lastFetch = new Date()
    var newsbox = document.getElementById('news')
    newsbox.innerHTML = "<span><i class='fas fa-spinner fa-pulse'></i> Retrieving news...</span>"

    console.log(selectedCountry)
    fetch(`https://api.nytimes.com/svc/search/v2/articlesearch.json?q=war+${selectedCountry}&api-key=oKAtSPoKpprCCjG2mWr3TNXVHOwnKk4O&fq=pub_year:("${year}") AND print_page:("1") &fl=headline&fl=web_url&fl=source`)
    .then((response) => {
      return response.json();
    })
      .then((data) => {
        if (data.response.docs.length > 0) {
          let text = data.response.docs[0].headline.main
          newsbox.innerHTML = `<a href="${data.response.docs[0].web_url}"><h3>${text.substring(0,52).concat("..")}</h3></a><small><i>- ${data.response.docs[0].source}, ${year}</i></small>`
          newsbox.innerHTML += `<div class='tooltip'><div class='tooltiptext'>News from ${year} related to ${selectedCountry}. Source: <a href="https://developer.nytimes.com/apis">New York Times</a></div><i class='far fa-newspaper'></i></div>`
        }
        else {
          newsbox.innerHTML = `No news related to ${selectedCountry} from ${year} was found..`
        }
      }).catch(e => newsbox.innerHTML =  `No news related to ${selectedCountry} from ${year} was found..`
      );
      newsbox.innerHTML += `<div class='tooltip'><div class='tooltiptext'>News from ${year} related to ${selectedCountry}. Source: <a href="https://developer.nytimes.com/apis">New York Times</a></div><i class='far fa-newspaper'></i></div>`
  }
}