// This example adds a search box to a map, using the Google Place Autocomplete
// feature. People can enter geographical searches. The search box will return a
// pick list containing a mix of places and predicted search terms.
var colorArray = ['#7BB5E1', '#8379A7', '#2B9A77', '#C758A5', '#795548', '#FFC107', '#FF7636', '#810969', '#0065BA'],
allMarkers = {},
allResults = [],
selectedArea = null,
userLocationMarker = null;

function initAutocomplete() {
  // Create the search box and link it to the UI element.
  var input = document.getElementById('pac-input');
  var defaultLocation = {lat: 33.682, lng: -117.890};
  var map = new google.maps.Map(document.getElementById('map'), {
    center: defaultLocation,
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false
  });

  var takeMeHomeButton = document.getElementById('take-me-home'),
  editHomeButton = document.getElementById('edit-home');

  google.maps.event.addDomListener(takeMeHomeButton, "click", function(event){
    map.setZoom(15);
    map.setCenter(userLocationMarker.getPosition());
  });

  google.maps.event.addDomListener(editHomeButton, "click", function(event){
    setLocationSearchbox();
  });

  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      var marker = new google.maps.Marker({
        map: map,
        position: pos,
        animation: google.maps.Animation.DROP,
        zIndex: google.maps.Marker.MAX_ZINDEX + 1,
        optimized: false
      });

      marker.addListener('click', function() {
        map.setZoom(15);
        map.setCenter(pos);
      });

      userLocationMarker = marker;
      map.setCenter(pos);
      setMap();
    }, function() {
      setLocationSearchbox();
    });

  } else {
    // Browser doesn't support Geolocation
    setLocationSearchbox();
  }

  function redoSearchResults() {
    for (var i = 0; i < allResults.length; i++) {
      console.log(allResults[i]);
    }
  }

  function setLocationSearchbox() {
    document.getElementsByTagName('body')[0].setAttribute('location-set', 'false');
    google.maps.event.clearInstanceListeners(input);
    input.setAttribute("placeholder", "Set location...");
    input.setAttribute("style", "");
    input.value = "";
    input.focus();
    if(userLocationMarker)
      userLocationMarker.setMap(null);
    userLocationMarker = null;
    var userLocationSearchBox = new google.maps.places.SearchBox(input);
    var userLocationSearchBoxEvent = userLocationSearchBox.addListener('places_changed', function() {
      var places = userLocationSearchBox.getPlaces();
      if (places.length == 0) {
        return;
      }

      var marker = new google.maps.Marker({
        map: map,
        position: places[0].geometry.location,
        animation: google.maps.Animation.DROP,
        zIndex: google.maps.Marker.MAX_ZINDEX + 1,
        optimized: false
      });

      marker.addListener('click', function() {
        map.setZoom(15);
        map.setCenter(places[0].geometry.location);
      });

      map.setCenter(places[0].geometry.location);
      userLocationMarker = marker;
      setMap();

      // redo past searches
      redoSearchResults();
    });
  }

  function setMap(){
    document.getElementsByTagName('body')[0].setAttribute('location-set', 'true');
    google.maps.event.clearInstanceListeners(input);
    input.setAttribute("placeholder", "Search...");
    input.setAttribute("style", "");
    input.value = "";
    input.focus();

    var searchBoxOptions = {
      bounds: new google.maps.Circle({center: userLocationMarker.getPosition(), radius: 30}).getBounds()
    };

    var resultLimitInput = document.getElementById('result-limit-num'),
    searchBox = new google.maps.places.SearchBox(input, searchBoxOptions),
    infowindow = new google.maps.InfoWindow(),
    detailService = new google.maps.places.PlacesService(map);
    input.setAttribute("style", "");

    map.addListener('click', function() {
      input.blur();
      infowindow.close();
    });

    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function() {
      var places = searchBox.getPlaces();
      resultLimitInput.value = Math.round(resultLimitInput.value);
      if (places.length == 0) {
        return;
      }

      // create result
      var searchTerm = input.value,
      color = getRandomColor(),
      results = places.length === 1 ? '' : places.length >= resultLimitInput.value ? '<div class="result-amount">' + resultLimitInput.value +' results</div>' : '<div class="result-amount">' + places.length +' results</div>';

      var result = createResult({
        searchTerm: searchTerm,
        content: '<div class="result-text">' + searchTerm + results + '</div><button class="remove-result" type="button">×</button>',
        color: color,
        markers: []
      });

      // For each place, get the icon, name and location.
      var bounds = new google.maps.LatLngBounds();
      places.forEach(function(place, index) {
        if(index >= resultLimitInput.value)
          return false;

        var resultColor = color;
        if(selectedArea)
          resultColor = google.maps.geometry.poly.containsLocation(place.geometry.location, selectedArea) ? color : 'rgba(0,0,0,.15)';

        var icon = {
          path: "M19.39,1.562c-2.505-1.238-5.94-0.477-8.377,1.643C8.576,1.085,5.141,0.323,2.636,1.562 C-0.357,3.039-0.88,6.782,1.474,9.924l1.962,2.065l0.402,0.425l7.174,7.56l7.174-7.56l0.402-0.425l1.963-2.065 C22.906,6.782,22.383,3.039,19.39,1.562z",
          fillColor: resultColor,
          strokeColor: '#fff',
          fillOpacity: 1,
          strokeOpacity: .5,
          anchor: new google.maps.Point(11, 11)
        };

        // Create a marker for each place.
        var marker = new google.maps.Marker({
          id: place.place_id,
          map: map,
          title: place.name,
          position: place.geometry.location,
          resultColor: color,
          icon: icon,
          animation: google.maps.Animation.DROP
        });

        marker.addListener('click', function() {
          var request = {
            placeId: place.place_id
          };

          detailService.getDetails(request, detailCallback);

          function detailCallback(placeDetail, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {
              place = placeDetail;
            }
            infowindow.setContent("<div class='infoWindow'>" + buildInfoWindowHtml(place) +  "</div>");
            infowindow.open(map, marker);
            var removeBtn = document.getElementById('remove' + place.place_id);
            google.maps.event.addDomListener(removeBtn, "click", function(event){
              event.preventDefault();
              marker.setMap(null);
              delete allMarkers[marker.id];
            });
            google.maps.event.addDomListener(removeBtn, "touchend", function(event){
              event.stopPropagation();
              marker.setMap(null);
              delete allMarkers[marker.id];
            });
          }
        });

        allMarkers[marker.id] = marker;
        result.markers.push(marker);
      });

      for (var i in allMarkers) {
        bounds.extend(allMarkers[i].getPosition());
      }
      bounds.extend(userLocationMarker.getPosition());
      map.fitBounds(bounds);
      input.value = "";
    });
  }
}

function buildInfoWindowHtml(place) {
  var photo = "";
  if(place.photos){
    var src = place.photos[0].getUrl({'maxHeight': 500, 'maxWidth': 500});
    photo = "<div class='place-img' style='background-image:url("+src+");'></div><span class='attribution'>" + place.photos[0].html_attributions[0] + "</span><br>";
  }

  var name = "<strong>" + place.name + "</strong>";

  var remove = "<button id='remove" + place.place_id + "' type='button' class='btn btn-danger btn-xs remove-single-result'>remove</button>";

  var address = "";
  for (var i = 0; i < place.address_components.length; i++) {
    if(i === 0)
      address += "<br>";
    if(place.address_components[i].types[0] === "locality"){
      if(i !== 0)
        address += "<br>";
      address += place.address_components[i].short_name + ", ";
    }else if(place.address_components[i].types[0] !== "country" && place.address_components[i].types[0] !== "administrative_area_level_3" && place.address_components[i].types[0] !== "administrative_area_level_2"){
      address += place.address_components[i].short_name + " ";
    }
  }

  var phone = "";
  if(place.formatted_phone_number)
    phone = "<br><a href='tel:" + place.formatted_phone_number + "'>" + place.formatted_phone_number + "</a>";

  var website = "";
  if(place.website || place.url){
    var site = place.website ? place.website : place.url;
    website = "<br><a class='website' href='" + site + "'>" + site + "</a>";
  }

  var open_now = "";
  if(place.opening_hours)
    open_now = place.opening_hours.open_now ? "<br><span class='openNow'>Open meow!</span>" : "<br><span class='closedNow'>closed :(</span>";

  return photo + name + remove + address + phone + website + open_now;
}

function randomIntFromInterval(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

function getRandomColor() {
  var color = colorArray.splice(randomIntFromInterval(0, colorArray.length - 1), 1);
  return color[0];
};

function createResult(result){
  var resultsWrap = document.getElementById('results-wrap'),
  resultElement = document.createElement("div");
  resultElement.className = "result";
  resultElement.innerHTML = result.content;
  resultElement.style.background = result.color;

  function checkColorArray () {
    if(colorArray.length === 0){
      document.body.setAttribute('full', true);
    }else{
      document.body.setAttribute('full', false);
    }
  };

  checkColorArray();
  allResults.push(result.searchTerm);

  function removeResult (event) {
    event.preventDefault();
    result.markers.forEach(function(marker) {
      marker.setMap(null);
      delete allMarkers[marker.id];
    });
    allResults.splice(allResults.indexOf(result.searchTerm), 1);
    resultElement.parentNode.removeChild(resultElement);
    resultElement = null;
    if(result.color !== undefined)
      colorArray.push(result.color);

    checkColorArray();
  };

  var removeBtn = resultElement.getElementsByClassName("remove-result")[0];
  removeBtn.addEventListener("click", removeResult);
  removeBtn.addEventListener("touchend", removeResult);

  // Prepend it to the parent element
  resultsWrap.insertBefore(resultElement, resultsWrap.firstChild);

  return result;
};
