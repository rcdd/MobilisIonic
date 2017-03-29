import { Component } from '@angular/core';

import { NavController, ToastController } from 'ionic-angular';

import { Http, Response } from '@angular/http';

import { Geolocation } from 'ionic-native';


import 'rxjs/add/operator/map';
import 'leaflet';
import 'leaflet.markercluster';
import 'leaflet-easybutton';
import 'leaflet-search';
import 'leaflet-knn';

declare var L: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  private stops: any;
  private map: any;
  private currentPosition: any;
  private currentPositionCircle: any;
  public debug: any;
  private markers: any;
  private controlSearch: any;
  private allowLocation = false;

  private iconBus = L.icon({
    iconUrl: 'assets/icon/android-bus.png',
    iconSize: [25, 25]
  });


  constructor(public navCtrl: NavController, public toastCtrl: ToastController, public http: Http) {
  }

  ngOnInit(): void {


    this.initMap();
    this.getStopsStations();


    //Cenas de Localização
    let self = this;
    this.map.on('locationerror', function (e) {
      self.allowLocation = false;
      alert('User denied localization. For better performance, please allow your location.');
    });

    this.getCurrentLocation();


  }

  initMap(): void {
    let tiles = L.tileLayer('https://api.mapbox.com/styles/v1/rcdd/cj0lffm3h006c2qjretw3henw/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Application power by RD&RP :)',
      maxZoom: 20,
      id: 'mapbox.mapbox-traffic-v1',
      accessToken: 'sk.eyJ1IjoicmNkZCIsImEiOiJjajBiOGhzOGUwMDF3MzNteDB1MzJpMTl6In0.1fiOkskHZqGiV20G95ENaA',
      // CACHE STUFF
      useCache: true,
      useOnlyCache: true,
      crossOrigin: true,
      saveToCache: true,
      cacheMaxAge: (24 * 3600000), // 24h
    });

    this.map = L.map('mapid')
      .addLayer(tiles)
      .setView([39.7460465, -8.8059954], 14);
    this.map.locate({ setView: true, maxZoom: 15 });

    /*// Listen to cache hits and misses and spam the console
    tiles.on('tilecachehit', function (ev) {
      console.log('Cache hit: ', ev.url);
    });
    tiles.on('tilecachemiss', function (ev) {
      console.log('Cache miss: ', ev.url);
    });
    tiles.on('tilecacheerror', function (ev) {
      console.log('Cache error: ', ev.tile, ev.error);
    });*/


    this.currentPosition = L.marker(this.map.getCenter()).addTo(this.map);
    this.currentPositionCircle = L.circle(this.map.getCenter()).addTo(this.map);


    // CONTROLS OF THE MAP
    var self = this;
    L.easyButton({
      states: [
        {
          stateName: 'unloaded',
          icon: 'fa fa-map-marker',
          title: 'load image',
          onClick: function (control) {
            control.state("loading");
            control._map.on('locationfound', function (e) {
              this.setView(e.latlng, 17);
              let data = { latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy: e.accurancy };
              self.updateCurrentLocation(data);
              control.state('loaded');
            });
            control._map.on('locationerror', function () {
              control.state('error');
            });
            control._map.locate()
          }
        }, {
          stateName: 'loading',
          icon: 'fa-spinner fa-spin'
        }, {
          stateName: 'loaded',
          icon: 'fa-location-arrow',
          onClick: function (control) {
            control.state("loading");
            control._map.on('locationfound', function (e) {
              this.setView(e.latlng, 17);
              let data = { latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy: e.accurancy };
              self.updateCurrentLocation(data);
              control.state('loaded');
            });
            control._map.on('locationerror', function () {
              control.state('error');
            });
            control._map.locate()
          }
        }, {
          stateName: 'error',
          icon: 'fa-frown-o',
          title: 'location not found',
          onClick: function (control) {
            control.state("loading");
            control._map.on('locationfound', function (e) {
              this.setView(e.latlng, 17);
              let data = { latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy: e.accurancy };
              self.updateCurrentLocation(data);
              control.state('loaded');
            });
            control._map.on('locationerror', function () {
              control.state('error');
            });
            control._map.locate()
          }
        }
      ]
    }).addTo(this.map);

    L.easyButton('fa fa-map', function () {

      self.map.fitBounds(self.markers.getBounds());
      //self.map.panTo(new L.LatLng(39.7460465, -8.8059954), 11);
    }).addTo(this.map);

    L.easyButton('fa fa-bus', function () {
      let min: any;
      let minMetrs: number = Number.MAX_SAFE_INTEGER;
      if (self.allowLocation == true) {
        self.stops.forEach(stop => {
          if (stop.meters <= minMetrs) {
            minMetrs = stop.meters;
            min = stop;
          }
        });
        self.map.setView([min.lat, min.lon], 17);
        self.showToast(min.message + " from you!", 3000);
      } else {
        self.showToast("We can't calculate your position", 3000);
      }

    }).addTo(this.map);


    self.controlSearch = new L.Control.Search({
      container: 'findbox',
      position: 'topleft',
      placeholder: 'Search...:)',
      layer: this.markers,
      initial: false,
      zoom: 20,
      marker: false
    });
    this.map.addControl(self.controlSearch);

  }


  getStopsStations() {
    return this.http.get(`http://194.210.216.191/otp/routers/default/index/stops`)
      .map((res: Response) => res.json()).subscribe(a => {
        this.stops = a;
        this.updateClusterGroup();
        this.getCurrentLocation();
      });
  }


  showToast(msg: string, ms: number): void {
    let toast = this.toastCtrl.create({
      message: msg,
      duration: ms,
      position: 'top',
      showCloseButton: true
    });
    toast.onDidDismiss(() => {
      console.log('Dismissed toast');
    });

    toast.present();
  }

  getCurrentLocation() {
    let self = this;
    let watch = Geolocation.watchPosition();
    watch.subscribe((data: any) => {
      console.dir(data);
      if (data.code != 1) {
        self.allowLocation = true;
        /*console.log('Distances:');
        console.dir(self.currentPosition.getLatLng());
        console.dir(data.coords);*/
        if (self.currentPosition.getLatLng().lat != data.coords.latitude ||
          self.currentPosition.getLatLng().lng != data.coords.longitude) {
          self.updateCurrentLocation(data.coords);
          self.updateClusterGroup();
        }
        //self.debug = self.currentPosition;
        //console.dir(data);
      } else {
        this.allowLocation = false;
      }
    });
  }

  updateCurrentLocation(data): void {
    var radius = (data.accuracy / 2).toFixed(1);
    var currentPosition = [data.latitude, data.longitude];
    this.currentPosition.setLatLng(currentPosition);
    this.currentPosition.bindPopup("You are within " + radius + " meters from this point");
    this.currentPositionCircle.setLatLng(currentPosition);

  }

  updateClusterGroup() {
    this.markers = L.markerClusterGroup();

    this.stops.forEach(stop => {
      let dist: any;
      if (this.allowLocation == true) {
        stop.meters = this.currentPosition.getLatLng().distanceTo([stop.lat, stop.lon]);
        dist = '';
        if (stop.meters > 1000) {
          dist += (stop.meters / 1000).toFixed(0) + ' Kms';
        } else {
          dist += stop.meters.toFixed(0) + ' meters';
        }
        stop.message = dist;
        dist += ' from me<hr>';
      } else {
        dist = '';
      }

      let popUp = '<h6>' + stop.name + '</h6><hr>' + dist + 'Linhas:<br/>Mob1<br>Mob3';
      let popUpOptions =
        {
          'className': 'custom'
        }
      this.markers.addLayer(new L.marker([stop.lat, stop.lon], { icon: this.iconBus, title: stop.name })
        .bindPopup(popUp, popUpOptions)
        .on('click', function (e) {
          this.openPopup();
        }));
    });

    console.log("Populate Search Box");
    this.map.removeControl(this.controlSearch);
    this.controlSearch = new L.Control.Search({
      container: 'findbox',
      position: 'topleft',
      placeholder: 'Search...:)',
      layer: this.markers,
      initial: false,
      zoom: 20,
      marker: false
    });

    this.map.addControl(this.controlSearch);
    this.map.addLayer(this.markers);
  }
}
