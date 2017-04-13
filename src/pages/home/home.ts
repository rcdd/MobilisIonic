import { Component } from '@angular/core';

import { AlertController, NavController, ToastController } from 'ionic-angular';

import { Http, Response } from '@angular/http';

import { Geolocation } from 'ionic-native';

// import { busLines } from './busLines';
import { DatabaseProvider } from '../../providers/database-provider';
import { Platform } from 'ionic-angular';

import 'rxjs/add/operator/map';
import 'leaflet';
import 'leaflet.markercluster';
import 'leaflet-easybutton';
import 'leaflet-search';
import 'leaflet-knn';
import 'leaflet.featuregroup.subgroup'

declare var L: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  public stops: any; // PARAGENS
  public routes: any = {}; // LINHAS
  public markersCluster: any; // CLUSTER
  private markers;

  private map: any;
  private currentPosition: any;
  private currentPositionCircle: any;
  public debug: any;
  private controlSearch: any;
  private allowLocation = false;
  private CheckBoxRoutes: any = [];

  private iconBus = L.icon({
    iconUrl: 'assets/icon/android-bus.png',
    iconSize: [25, 25]
  });


  constructor(platform: Platform, public navCtrl: NavController, public toastCtrl: ToastController, public http: Http, public alertCtrl: AlertController, public db: DatabaseProvider) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.

      // ISTO FOI PARA TESTES!
    });
  }

  ngOnInit(): void {


    this.initMap();
    this.getCurrentLocation();
    this.getStopsStations();
    this.getBusLines();


    //Cenas de Localização
    let self = this;
    this.map.on('locationerror', function (e) {
      self.allowLocation = false;
      alert('User denied localization. For better performance, please allow your location.');
    });
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

    this.markersCluster = L.markerClusterGroup({ maxClusterRadius: 100, removeOutsideVisibleBounds: true });

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

      self.map.fitBounds(self.markersCluster.getBounds());
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
        self.map.setView([min.lat, min.lon], 19);
        self.markersCluster.eachLayer(function (layer) {
          if (layer.options.id == min.id) {
            // self.markersCluster.getVisibleParent(layer);
            let popUpOptions =
              {
                'className': 'custom'
              }
            L.popup(popUpOptions)
              .setLatLng(layer.getLatLng())
              .setContent(layer._popup._content)
              .openOn(self.map);
            console.log(layer);
          }
        });

        self.showToast(min.message + " from you!", 3000);
      } else {
        self.showToast("We can't calculate your position", 3000);
      }

    }).addTo(this.map);


    self.controlSearch = new L.Control.Search({
      container: 'findbox',
      position: 'topleft',
      placeholder: 'Search...:)',
      layer: this.markersCluster,
      initial: false,
      zoom: 20,
      marker: false
    });
    this.map.addControl(self.controlSearch);

  }

  // OLD VERSION
  getStopsStations() {
    return this.http.get(`http://194.210.216.191/otp/routers/default/index/stops`)
      .map((res: Response) => res.json()).subscribe(a => {
        this.stops = a;
        //this.updateClusterGroup();
        this.getCurrentLocation();
      });
    /*this.db.query("SELECT * FROM STOPS")
      .then(res => {
        this.stops = res;
        this.getCurrentLocation();
        console.log(this.stops);
      })
      .catch(err => {
        console.log("Error: ", err);
      });*/
  }

  getBusLines() {
    // NEW WAY
    /*this.db.query("SELECT * FROM BUSLINES")
      .then(res => {
        res.forEach(route => {
          this.routes[route.id] = {};
          this.routes[route.id].id = route.id;
          this.routes[route.id].longName = route.longName;
          this.routes[route.id].mode = route.mode;
          this.routes[route.id].shortName = route.shortName;
          this.CheckBoxRoutes.push({ id: this.routes[route.id], name: this.routes[route.id], label: this.routes[route.id].longName, type: "checkbox", value: this.routes[route.id], checked: false });
          this.CheckBoxRoutes.sort(function (a, b) { return (a.name.longName > b.name.longName) ? 1 : ((b.name.longName > a.name.longName) ? -1 : 0); });
        });
        this.getStationsFromBusLines();
      })
      .catch(err => {
        console.log("Error: ", err);
      });*/
    return this.http.get(`http://194.210.216.191/otp/routers/default/index/routes`)
      .map((res: Response) => res.json()).subscribe(a => {
        a.forEach(route => {
          this.routes[route.id] = {};
          this.routes[route.id].id = route.id;
          this.routes[route.id].longName = route.longName;
          this.routes[route.id].mode = route.mode;
          this.routes[route.id].shortName = route.shortName;
          this.CheckBoxRoutes.push({ id: this.routes[route.id], name: this.routes[route.id], label: this.routes[route.id].longName, type: "checkbox", value: this.routes[route.id], checked: false });
          this.CheckBoxRoutes.sort(function (a, b) { return (a.name.longName > b.name.longName) ? 1 : ((b.name.longName > a.name.longName) ? -1 : 0); });
        });
        this.getStationsFromBusLines();
      });
  }

  getStationsFromBusLines() {
    for (let route in this.routes) {
      this.http.get("http://194.210.216.191/otp/routers/default/index/routes/" + route + "/stops")
        .map((res: Response) => res.json()).subscribe(stops => {
          this.routes[route].stops = stops;
        });
    }


    /* console.log("Stops:")
     console.dir(this.routes);*/



    /*   this.routes.forEach(route => {
         this.markers[route.id] = L.featureGroup.subGroup(this.markersCluster);
         this.http.get("http://194.210.216.191/otp/routers/default/index/routes/" + route.id + "/stops")
           //this.http.get("http://194.210.216.191/otp/routers/default/index/patterns/" + route.id + ":0:01")
           .map((res: Response) => res.json()).subscribe(stops => {
             // this.LinesStations.push({ id: route.id, selected: true, stops: a.stops });
             //i++;
             stops.forEach(stop => {
               let popUp = '<h6>' + stop.name + '</h6><hr>' + 'Linha: ' + route.shortName + '<br>';
               let popUpOptions =
                 {
                   'className': 'custom'
                 }
               new L.marker([stop.lat, stop.lon], { icon: this.iconBus, id: stop.id, title: stop.name })
                 .bindPopup(popUp, popUpOptions)
                 .on('click', function (e) {
                   this.openPopup();
                 })
                 .addTo(this.markers[route.id]);
             });
             //this.markers[route.id].addTo(this.map);
           });
       });
       this.markersCluster.addTo(this.map);
   */

    /* this.controlSearch = new L.Control.Search({
       container: 'findbox',
       position: 'topleft',
       placeholder: 'Search...',
       layer: this.markersCluster,
       initial: false,
       zoom: 20,
       marker: false
     });*/

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
      //console.dir(data);
      if (data.code != 1) {
        self.allowLocation = true;
        /*console.log('Distances:');
        console.dir(self.currentPosition.getLatLng());
        console.dir(data.coords);*/
        if (self.currentPosition.getLatLng().lat != data.coords.latitude ||
          self.currentPosition.getLatLng().lng != data.coords.longitude) {
          self.updateCurrentLocation(data.coords);
          //self.updateClusterGroup();
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

    this.map.removeLayer(this.markersCluster);
    this.markersCluster = new L.markerClusterGroup({ maxClusterRadius: 100, removeOutsideVisibleBounds: true });

    this.markers.forEach(stop => {
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
      let popUp = '<h6>' + stop.name + '</h6><hr>' + dist + 'Linhas:';
      stop.lines.forEach(line => {
        popUp += '<br>' + line;
      });
      let popUpOptions =
        {
          'className': 'custom'
        }
      new L.marker([stop.lat, stop.lon], { icon: this.iconBus, id: stop.id, title: stop.name })
        .bindPopup(popUp, popUpOptions)
        .on('click', function (e) {
          this.openPopup();
        }).addTo(this.markersCluster);
    });

    this.map.addLayer(this.markersCluster);

    //console.log("Populate Search Box");
    this.map.removeControl(this.controlSearch);
    this.controlSearch = new L.Control.Search({
      container: 'findbox',
      position: 'topleft',
      placeholder: 'Search...',
      layer: this.markersCluster,
      initial: false,
      zoom: 20,
      marker: false
    });

    this.map.addControl(this.controlSearch);
    this.map.addLayer(this.markersCluster);
  }

  showBusLines() {
    let alert = this.alertCtrl.create({
      title: 'Filter Bus Lines',
      inputs: this.CheckBoxRoutes,
      buttons: [{
        text: 'Ok',
        handler: data => {
          console.dir(data);
          this.markers = [];
          data.forEach(line => {
            line.stops.forEach(stop => {
              console.log(stop.id);
              let existMarker: boolean = false;
              this.markers.forEach(marker => {
                if (marker.id == stop.id) {
                  //console.log('Im old', marker);
                  marker.lines.push(line.shortName);
                  existMarker = true;
                }
              });
              if (existMarker == false) {
                // console.log('Im new', stop);
                stop.lines = [line.shortName];
                this.markers.push(stop);
              }

            });
          });
          //console.dir(this.markers);

          this.updateClusterGroup();

          this.CheckBoxRoutes.forEach(checkBox => {
            data.includes(checkBox.id) ? checkBox.checked = true : checkBox.checked = false;
          });

          alert.dismiss();
          return false;
        }
      },
      {
        text: 'Cancel',
        role: 'cancel',
        handler: data => {
          console.log('Cancel clicked');
        }
      }]
    });
    alert.present();
  }
}
