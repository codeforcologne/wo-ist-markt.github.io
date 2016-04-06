#!/usr/local/bin/python
# coding: utf-8

import json
import csv
import googlemaps

# Replace the API key below with a valid API key.
gmaps = googlemaps.Client(key='YOUR_API_KEY')
weekdays = {4 : 'Mo', 5: 'Tu', 6: 'We', 7: 'Th', 8: 'Fr', 9: 'Sa'}
standard_hours = '07:00-13:00'

def unicode_csv_reader(utf8_data, dialect=csv.excel, **kwargs):
    csv_reader = csv.reader(utf8_data, delimiter=';')
    csv_reader.next()
    for row in csv_reader:
        yield [unicode(cell, 'utf-8') for cell in row]

csvfile = "20150730_Wochenmaerkte.csv"
reader = unicode_csv_reader(open(csvfile))
markets = []

for row in reader:
    place = row[3] + u", Köln"
    geocode_result = gmaps.geocode(place)

    if len(geocode_result) > 0:
        market = {}
        market['coordinates'] = []
        market['coordinates'].append(geocode_result[0]['geometry']['location']['lng'])
        market['coordinates'].append(geocode_result[0]['geometry']['location']['lat'])
        market['location'] = row[3]
        market['title'] =  "Wochenmarkt " + row[2]
        market['opening_hours'] = ""
        for index, weekday in weekdays.iteritems():
            if row[index] == "X":
                market['opening_hours']  = " ".join((market['opening_hours'], weekday, standard_hours, ";"))
        markets.append(market)

data = {}
data['features'] = []

data['metadata'] = {'data_source': {'title': 'Offene Daten Köln', 'url': 'http://www.offenedaten-koeln.de/dataset/wochenmaerkte-koeln'}, 'map_initialization': {'coordinates': [50.936389,6.952778], 'zoom_level': 11}}
data['type'] = "FeatureCollection"

for market in markets:
    feature_market = {}
    feature_market['geometry'] = {'coordinates' : market['coordinates'], 'type': 'Point'}
    feature_market['properties'] = {'location' : market['location'], 'opening_hours': market['opening_hours'], 'title': market['title']}
    feature_market['type'] = "Feature"
    data['features'].append(feature_market);

with open('köln.json', 'w') as outfile:
    json.dump(data, outfile)
