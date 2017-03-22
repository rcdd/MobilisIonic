import { Component } from '@angular/core';

import { NavController, ToastController } from 'ionic-angular';

import { Http, Response } from '@angular/http';

import { Geolocation } from 'ionic-native';

import 'rxjs/add/operator/map';
import 'leaflet';
import 'leaflet.markercluster';
import 'leaflet-easybutton';
import 'leaflet-search';

declare var L: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  private stops: any;
  private map: any;
  private currentPosition: any;
  public debug: any;

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
    var self = this;
    this.map.on('locationerror', function (e) {
      alert('User denied localization. For better performance, please allow your location.');
    });

    let watch = Geolocation.watchPosition();
    watch.subscribe((data) => {
      self.currentLocation(data.coords);
      //self.debug = self.currentPosition;
      //console.dir(data);
    });

  }

  initMap(): void {
    let tiles = L.tileLayer('https://api.mapbox.com/styles/v1/rcdd/cj0lffm3h006c2qjretw3henw/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Application power by RD&RP :)',
      maxZoom: 20,
      id: 'mapbox.mapbox-traffic-v1',
      accessToken: 'sk.eyJ1IjoicmNkZCIsImEiOiJjajBiOGhzOGUwMDF3MzNteDB1MzJpMTl6In0.1fiOkskHZqGiV20G95ENaA'
    });

    this.map = L.map('mapid')
      .addLayer(tiles)
      .setView([39.7460465, -8.8059954], 14);
    this.map.locate({ setView: true, maxZoom: 15 });

    this.currentPosition = L.marker(this.map.getCenter()).addTo(this.map);
    //L.circle(this.map.getCenter()).addTo(self.map);

    var self = this;
    L.easyButton({
      states: [
        {
          stateName: 'unloaded',
          icon: 'fa-location-arrow',
          title: 'load image',
          onClick: function (control) {
            control.state("loading");
            control._map.on('locationfound', function (e) {
              this.setView(e.latlng, 17);
              let data = { latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy: e.accurancy };
              self.currentLocation(data);
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
              self.currentLocation(data);
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
              self.currentLocation(data);
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

    L.easyButton('icon ion-pinpoint', function () {
      self.map.panTo(new L.LatLng(39.7460465, -8.8059954), 15);
    }).addTo(this.map);

  }


  getStopsStations() {
    return this.http.get(`http://194.210.216.191/otp/routers/default/index/stops`)
      .map((res: Response) => res.json()).subscribe(a => {
        this.stops = a;

        
        let markers = L.markerClusterGroup();

        var controlSearch = new L.Control.Search({
          position: 'topright',
          layer: markers,
          initial: false,
          zoom: 18,
          marker: false
        });

        this.stops.forEach(stop => {
          markers.addLayer(new L.marker([stop.lat, stop.lon], { icon: this.iconBus, title: stop.name })
            .bindPopup(stop.name)
            .on('click', function (e) {
              this.openPopup();
            }));
        });

        this.map.addLayer(markers);
        this.map.fitBounds(markers.getBounds());
        this.map.addControl(controlSearch);

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

  currentLocation(data): void {
    var radius = (data.accuracy / 2).toFixed(1);
    var currentPosition = [data.latitude, data.longitude];
    this.currentPosition.setLatLng(currentPosition);
    this.currentPosition.bindPopup("You are within " + radius + " meters from this point");
  }

}
