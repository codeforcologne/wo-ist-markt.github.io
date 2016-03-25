/*
 * © Code for Karlsruhe and contributors.
 * See the file LICENSE for details.
 */

var TILES_URL = '//cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png';
var ATTRIBUTION = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> ' +
                  'contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">' +
                  'CC-BY-SA</a>. Tiles &copy; <a href="http://cartodb.com/attributions">' +
                  'CartoDB</a>';
var DEFAULT_CITY = "karlsruhe";

var map;
var nowGroup = L.layerGroup();
var todayGroup = L.layerGroup();
var otherGroup = L.layerGroup();
var unclassifiedGroup = L.layerGroup();

var now = new Date();
var TIME_NOW = [now.getHours(), now.getMinutes()];
var DAY_INDEX = (now.getDay() + 6) % 7;  // In our data, first day is Monday
var DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
var DEFAULT_MARKET_TITLE = 'Markt';

L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';
var nowIcon = L.AwesomeMarkers.icon({markerColor: 'green', icon: 'shopping-cart'});
var todayIcon = L.AwesomeMarkers.icon({markerColor: 'darkgreen', icon: 'shopping-cart'});
var otherIcon = L.AwesomeMarkers.icon({markerColor: 'cadetblue', icon: 'shopping-cart'});
var unclassifiedIcon = L.AwesomeMarkers.icon({markerColor: 'darkpurple', icon: 'shopping-cart'});

/*
 * Return 0-padded string of a number.
 */
function pad(num, totalDigits) {
    var s = num.toString();
    while (s.length < totalDigits) {
        s = '0' + s;
    }
    return s;
}

/*
 * Creates time-table HTML code.
 *
 * `openingRanges` is a list of ranges compiled via opening_hours.js.
 * The first and second element of each range item are the starting and closing dates.
 */
function getTimeTable(openingRanges) {
    var html = '<table class="times">';
    if (openingRanges !== undefined) {
        for (var index = 0, openingRangesLength = openingRanges.length; index < openingRangesLength; ++index) {
            var openingRange = openingRanges[index];

            var dayIsToday = openingRangeMatchesDay(openingRange, now);
            var tableRow = getTableRowForDay(openingRange, dayIsToday);
            html += tableRow;
        }
    }
    html += '</table>';
    return html;
}

/*
 * Returns table row for a day with opening hours.
 * If the day matches today the row is styled.
 */
function getTableRowForDay(openingRange, dayIsToday) {
    var openFromDate = openingRange[0];
    var openTillDate = openingRange[1];
    var dayNameIndex = openFromDate.getDay();
    var dayName = DAY_NAMES[dayNameIndex];
    var cls = dayIsToday ? ' class="today"' : '';
    var formattedOpenFrom = moment(openFromDate).format('HH:mm');
    var formattedOpenTill = moment(openTillDate).format('HH:mm');
    return '<tr' + cls + '><th>' + dayName + '</th>' +
           '<td>' + formattedOpenFrom + ' - ' + formattedOpenTill + ' Uhr</td></tr>';
}

/*
 * Initialize map.
 */
function initMap() {
    var tiles = new L.TileLayer(TILES_URL, {attribution: ATTRIBUTION});
    map = new L.Map('map').addLayer(tiles);
}

/*
 * Moves the map to its initial position.
 */
function positionMap(mapInitialization) {
    var coordinates = mapInitialization.coordinates;
    var zoomLevel = mapInitialization.zoom_level;
    map.setView(L.latLng(coordinates[1], coordinates[0]), zoomLevel);
}

/*
 * Initialize layer controls.
 *
 * Controls which serve no purpose are disabled. For example, if
 * currently no markets are open then the corresponding radio
 * button is disabled.
 */
function initControls() {
    var todayCount = todayGroup.getLayers().length;
    if (todayCount === 0) {
        // No markets today or all of today's markets currently open
        $('#today').attr('disabled', true);
    }
    if (nowGroup.getLayers().length > 0) {
        $('#now').attr('checked', true);
    } else {
        $('#now').attr('disabled', true);
        if (todayCount > 0) {
            $('#today').attr('checked', true);
        } else {
            $('#other').attr('checked', true);
        }
    }
    $("input[name=display]").change(updateLayers);
}

/*
 * Update layer visibility according to layer control settings.
 */
function updateLayers() {
    var value = document.querySelector('[name="display"]:checked').value;
    switch (value) {
        case "now":
            map.removeLayer(todayGroup);
            map.removeLayer(otherGroup);
            break;
        case "today":
            map.addLayer(todayGroup);
            map.removeLayer(otherGroup);
            break;
        case "other":
            map.addLayer(todayGroup);
            map.addLayer(otherGroup);
            break;
    }
}

/*
 * Returns true if opening range matches the day of the given date; otherwise false.
 */
function openingRangeMatchesDay(openingRange, date) {
    var openFromDate = openingRange[0];
    var openTillDate = openingRange[1];
    var dayIndex = date.getDay();
    return openFromDate.getDay() === dayIndex && openTillDate.getDay() === dayIndex;
}

/*
 * Returns true if opening range contains the time of the given date; otherwise false.
 */
function openingRangeContainsTime(openingRange, date) {
    var range = moment.range(openingRange[0], openingRange[1]);
    return range.contains(date);
}

/*
 * Returns opening ranges compiled via opening_hours.js.
 */
function getOpeningRanges(openingHoursStrings) {
    var monday = moment().startOf("week").add(1, 'days').toDate();
    var sunday = moment().endOf("week").add(1, 'days').toDate();
    var oh = new opening_hours(openingHoursStrings);
    return oh.getOpenIntervals(monday, sunday);
}

/*
 * Returns opening range for date or undefined.
 */
function getOpeningRangeForDate(openingRanges, date) {
    if (openingRanges !== undefined) {
        for (var index = 0, openingRangesLength = openingRanges.length; index < openingRangesLength; ++index) {
            var openingRange = openingRanges[index];

            var dayIsToday = openingRangeMatchesDay(openingRange, date);
            if (dayIsToday) {
                return openingRange;
            }
        }
    }
    return undefined;
}

/*
 * Create map markers from JSON market data.
 */
function initMarkers(featureCollection) {
    L.geoJson(featureCollection, {
        onEachFeature: initMarker
    });
}

function initMarker(feature) {
    var properties = feature.properties;
    var openingHoursStrings = properties.opening_hours;
    if (openingHoursStrings === undefined) {
        throw "Missing property 'opening_hours' for " + properties.title + " (" + properties.location + ").";
    }
    var todayOpeningRange;
    var timeTableHtml;
    var openingHoursUnclassified;
    if (openingHoursStrings === null || openingHoursStrings.length === 0) {
        openingHoursUnclassified = properties.openingHoursUnclassified;
    } else {
        var openingRanges = getOpeningRanges(openingHoursStrings);
        todayOpeningRange = getOpeningRangeForDate(openingRanges, now);
        timeTableHtml = getTimeTable(openingRanges);
    }

    var coordinates = feature.geometry.coordinates;
    var marker = L.marker(L.latLng(coordinates[1], coordinates[0]));
    var where = properties.location;
    if (where === undefined) {
        throw "Missing property 'location' for " + properties.title + ".";
    }
    if (where !== null) {
        where = '<p>' + where + '</p>';
    } else {
        where = '';
    }
    var title = properties.title;
    if (title === undefined) {
        throw "Missing property 'title'.";
    }
    if (title === null || title.length === 0) {
        title = DEFAULT_MARKET_TITLE;
    }
    var popupHtml = '<h1>' + title + '</h1>' + where;
    if (openingHoursUnclassified !== undefined) {
        popupHtml += '<p class="unclassified">' + openingHoursUnclassified + '</p>';
    } else {
        popupHtml += timeTableHtml;
    }
    marker.bindPopup(popupHtml);
    if (todayOpeningRange !== undefined) {
        if (openingRangeContainsTime(todayOpeningRange, now)) {
            marker.setIcon(nowIcon);
            nowGroup.addLayer(marker);
        } else {
            marker.setIcon(todayIcon);
            todayGroup.addLayer(marker);
        }
    } else {
        if (openingHoursUnclassified !== undefined) {
            marker.setIcon(unclassifiedIcon);
            unclassifiedGroup.addLayer(marker);
        } else {
            marker.setIcon(otherIcon);
            otherGroup.addLayer(marker);
        }
    }
}

/*
 * Initialize legend.
 */
function initLegend() {
    var legend = L.control({position: 'bottomright'}),
        currentCity = getCityName(),
        apiUrl = "//api.github.com/repos/wo-ist-markt/wo-ist-markt.github.io/contents/cities",
        dropDownCitySelection = $('#dropDownCitySelection');

    legend.onAdd = function () {
        return L.DomUtil.get('legend');
    };

    // populate select box
    $.get(apiUrl, function(result) {
        $.each(result, function(idx, value) {
            var cityKey = value.name.replace(".json", "");

            // capitalize first letter by Steve Harrison
            // http://stackoverflow.com/users/48492/steve-harrison
            // http://stackoverflow.com/a/1026087
            var cityLabel = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
            dropDownCitySelection.append(
                $('<option></option>').val(cityKey).html(cityLabel)
            );
            dropDownCitySelection.val(currentCity);
        });
        dropDownCitySelection.select2({
            minimumResultsForSearch: 10
        }).change(function() {
            updateUrlHash(dropDownCitySelection.select2().val());
            window.location.reload(true);
        });
        // Force select2 update to fix dropdown position
        dropDownCitySelection.select2('open');
        dropDownCitySelection.select2('close');
    });

    // Stop map movement by mouse events in legend.
    // See https://gis.stackexchange.com/a/106777/48264.
    L.DomEvent.disableClickPropagation(L.DomUtil.get('legend'));

    legend.addTo(map);
}

/*
 * Returns the city name when present in the hash of the current URI;
 * otherwise the default city name;
 */
function getCityName() {
    var hash = decodeURIComponent(window.location.hash);
    if (hash === undefined || hash === "") {
        return DEFAULT_CITY;
    } else {
        hash = hash.toLowerCase();
        return hash.substring(1, hash.length);
    }
}

/*
 * Updates the URL hash in the browser.
 */
function updateUrlHash(cityName) {
    if (cityName === undefined) {
        throw "City name is undefined.";
    }
    if (history.pushState) {
        history.pushState(null, null, "#" + cityName);
    } else {
        window.location.hash = cityName;
    }
}

/*
 * Constructs a file path for the market data from the given city name.
 */
function getMarketDataFilePath(cityName) {
    if (cityName === undefined) {
        throw "City name is undefined.";
    }
    return "cities/" + cityName + ".json";
}

/*
 * Returns the given string in camel case.
 */
function toCamelCase(str) {
    return str.replace(/(?:^|\s)\w/g, function(match) {
        return match.toUpperCase();
    });
}

/*
 * Updates the document title.
 */
function updateDocumentTitle(cityName) {
    if (cityName === undefined) {
        throw "City name is undefined.";
    }
    var formattedCityName = toCamelCase(cityName);
    document.title = "Wo ist Markt in " + formattedCityName +"?";
}

/*
 * Updates the legend data source.
 */
function updateLegendDataSource(dataSource) {
    var title = dataSource.title;
    var url = dataSource.url;
    $("#legend #dataSource").html('<a href="' + url + '">' + title + '</a>');
}

/*
 * Initialize application when market data is loaded.
 */
function init(json, cityName) {
    positionMap(json.metadata.map_initialization);
    updateLegendDataSource(json.metadata.data_source);
    initMarkers(json);
    initControls();
    map.addLayer(unclassifiedGroup);
    map.addLayer(nowGroup);
    updateLayers();
    updateDocumentTitle(cityName);
    updateUrlHash(cityName);
}

/*
 * Forces reloading when URI hash changed.
 */
$(window).on('hashchange',function() {
    window.location.reload(true);
});

$(document).ready(function() {
    initMap();
    initLegend();
    var cityName = getCityName();
    var marketDataFileName = getMarketDataFilePath(cityName);
    $.getJSON(marketDataFileName, function(json) {
        init(json, cityName);
    }).fail(function() {
        console.log("Failure loading '" + marketDataFileName + "'. Loading market file for default city (" + DEFAULT_CITY + ") instead.");
        cityName = DEFAULT_CITY;
        marketDataFileName = getMarketDataFilePath(cityName);
        $.getJSON(marketDataFileName, function(json) {
            init(json, cityName);
        }).fail(function() {
           console.log("Failure loading default market file.");
        });
    });
});
