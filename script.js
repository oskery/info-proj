// Settings:
var minYear = 1800
var maxYear = 2020
var legendValues = [0, 30, 40, 50, 60]
var minVal = 24 // Not used atm
var maxVal = 64 // Not used atm

// Creates yearspan and retrieves active year
var yearSpan = [...Array(maxYear - minYear).keys()]
  .map(x => x + minYear)
  .filter(x => x % 10 === 0)
var year = document.getElementById('selected-year').innerHTML
var yearAvg = Array(maxYear - minYear)

// Retrieve slider div
var slider = document.getElementById('slider'),
  selectedYearDiv = document.getElementById('selected-year')

// Triggers if user uses slider
slider.oninput = function() {
  selectedYearDiv.innerHTML = this.value
  year = this.value
  reFillMap()
}

// The svg
var svg = d3.select('svg')

// Map and projection
var path = d3.geoPath()
var projection = d3.geoMercator().scale(90)

// Data, geoJSON and color scale
var data = d3.map()
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
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide)
    // set the color of each country
    .attr('fill', function(d) {
      d.total =
        (data.get(d.properties.name) && data.get(d.properties.name)[year]) || 0
      if (d.total === 0) return '#bbb'
      return colorScale(d.total)
    })
  getAvg()
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
