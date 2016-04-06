See all info on *Wo ist Markt?* in the original [repository](https://github.com/wo-ist-markt/wo-ist-markt.github.io) and http://wo-ist-markt.de

# How to convert Cologne data

The data on farmers' markets provided by the City of Cologne is by itself not suitable to be used in the *Wo ist Markt?* project: Instead of GeoJSON, it is a CSV file with location info as street name strings.

The python script **cologne_data/convert_data.py** tries to geocode all CSV locations with the help of the Google Maps Geocoding API. The weekdays are converted into the OpenStreetMap opening hours format. Everything is saved to a GeoJSON file.

To use the script, you have to have Python 2.7 installed.

1. Download the [market data](http://www.offenedaten-koeln.de/dataset/wochenmaerkte-koeln) from Offene Daten Köln and put it in the cologne_data folder.

2. Install [Google Maps Services](https://github.com/googlemaps/google-maps-services-python) `pip install -U googlemaps`

3. Get a Google Maps API Key and insert it into the line `gmaps = googlemaps.Client(key='YOUR_API_KEY')` in the script.

4. Execute the script: `python cologne_data/convert_data.py`

5. Manually replace all incorrect coordinates in the resulting köln.json

6. Manually change all hours for those markets that are not open during standard hours. (Listed [here](http://www.offenedaten-koeln.de/dataset/wochenmaerkte-koeln))
