import { Component } from '@angular/core';

import { AlertController, NavController, NavParams, ToastController } from 'ionic-angular';

import { Http } from '@angular/http';

import { Geolocation } from '@ionic-native/geolocation';


// import { busLines } from './busLines';
import { DatabaseProvider } from '../../providers/database-provider';
import { DataProvider } from '../../providers/data-provider';
//import { Observable } from 'rxjs/Observable';

import 'rxjs/add/operator/map';
import 'leaflet';
import 'leaflet.markercluster';
import 'leaflet-easybutton';
import 'leaflet-search';
import 'leaflet-knn';
import 'leaflet.featuregroup.subgroup'
import 'leaflet-routing-machine'

declare var L: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  public stops: any; // PARAGENS
  public markersCluster: any; // CLUSTER
  private markers: any = []; // CLUSTER ON MAP

  private map: any;
  private currentPosition: any;
  private currentPositionCircle: any;
  public debug: any;
  private controlSearch: any;
  private allowLocation = false;
  private CheckBoxRoutes: any = [];
  public planning: any = [];
  public route: any;

  private iconBus = L.icon({
    iconUrl: 'assets/icon/android-bus.png',
    iconSize: [25, 25]
  });


  constructor(public navCtrl: NavController, private navParams: NavParams,
    public toastCtrl: ToastController, public http: Http,
    public alertCtrl: AlertController, public db: DatabaseProvider,
    public dataProvider: DataProvider, public geolocation: Geolocation
  ) { }



  async ngOnInit() {
    console.log("Init cenas");
    this.dataProvider.getDataFromServer().then((resp) => {
      this.dataProvider.loading = 100;
      this.stops = resp;
      //console.log("imported stops:", Object.keys(this.stops).length);
      //console.log("imported stops:", this.stops);
      this.initMap();
      this.populateCheckBoxs();
      this.getCurrentLocation();

      //Cenas de Localização
      let self = this;
      this.map.on('locationerror', function (e) {
        self.allowLocation = false;
        self.showToast('You denied localization. For better performance, please allow your location.', 3000);
      });
    });
    console.log("Init Done!");
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

    this.map.on('click', (e) => {
      if (!this.planning.orig) {
        this.planning.dest = "";
        this.planning.orig = L.marker(e.latlng, { draggable: true })
          .bindPopup("Origem")
          .addTo(this.map)
          .on('dragend', (e) => {
            console.log("drag", e);
            this.planning.orig.latlng = e.target._latlng.lat + "," + e.target._latlng.lng;
          });
        this.planning.orig.latlng = e.latlng.lat + "," + e.latlng.lng;
      } else if (!this.planning.dest) {
        this.planning.dest = L.marker(e.latlng, { draggable: true })
          .bindPopup("Destino")
          .addTo(this.map)
          .on('dragend', (e) => {
            console.log("drag", e);
            this.planning.dest.latlng = e.target._latlng.lat + "," + e.target._latlng.lng;
          });
        this.planning.dest.latlng = e.latlng.lat + "," + e.latlng.lng;
      }
    });


    this.markersCluster = L.markerClusterGroup({ maxClusterRadius: 100, removeOutsideVisibleBounds: true });

    this.currentPosition = L.marker(this.map.getCenter()).addTo(this.map);
    this.currentPositionCircle = L.circle(this.map.getCenter()).addTo(this.map);

    // ROUTING OF THE MAP
    /*this.route = L.Routing.control({
      waypoints: [
        L.latLng(39.75313, -8.81104),
        L.latLng(39.73326, -8.76160)
      ],
      routeWhileDragging: true
    }).addTo(this.map);
*/

    // CONTROLS OF THE MAP
    var self = this;
    // LOCATION
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

    // FIT MARKERS
    L.easyButton('fa fa-map', function () {

      if (self.markers.length != 0) {
        self.map.fitBounds(self.markersCluster.getBounds());
      } else {
        self.showToast("You need select at least one line route", 3000);
      }
      //self.map.panTo(new L.LatLng(39.7460465, -8.8059954), 11);
    }).addTo(this.map);

    // GET CLOSEST STOPS
    L.easyButton('fa fa-bus', function () {
      let closestStop: any;
      let minMetrs: number = Number.MAX_SAFE_INTEGER;
      if (self.allowLocation == true) {
        if (self.markers.length != 0) {
          self.markersCluster.eachLayer(stop => {
            //console.log("stop on layer", stop);
            if (stop.options.meters <= minMetrs) {
              minMetrs = stop.options.meters;
              closestStop = stop;
            }
          });
          self.map.setView(closestStop.getLatLng(), 19);
          self.markersCluster.eachLayer(function (layer) {
            if (layer.options.id == closestStop.options.id) {
              let popUpOptions =
                {
                  'className': 'custom'
                }
              L.popup(popUpOptions)
                .setLatLng(layer.getLatLng())
                .setContent(layer._popup._content)
                .openOn(self.map);
            }
          });

          self.showToast(closestStop.options.message + " from you!", 3000);
        } else {
          self.showToast("You need select at least one line route", 3000);
        }
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

  async populateCheckBoxs() {
    //console.log("populate", Object.keys(this.stops).length);
    for (var index = 0; index < Object.keys(this.stops).length; index++) {
      let route = this.stops[Object.keys(this.stops)[index]];
      //console.log("route: ", route);
      this.CheckBoxRoutes.push({ id: route, label: route.longName, type: "checkbox", value: route, checked: false });
      this.CheckBoxRoutes.sort(function (a, b) { return (a.label > b.label) ? 1 : ((b.label > a.label) ? -1 : 0); });
    };

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
    this.geolocation.getCurrentPosition().then((resp) => {
      console.log("GeoLocation:", resp);
      self.allowLocation = true;
      /*console.log('Distances:');
      console.dir(self.currentPosition.getLatLng());
      console.dir(data.coords);*/
      if (self.currentPosition.getLatLng().lat != resp.coords.latitude ||
        self.currentPosition.getLatLng().lng != resp.coords.longitude) {
        self.updateCurrentLocation(resp.coords);
        //self.updateClusterGroup();
      }
      //self.debug = self.currentPosition;
      //console.dir(data);
    }).catch((error) => {
      console.log('Error getting location', error);
      self.showToast(error.message, 3000);
      self.allowLocation = false;
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
    //console.log("makers", this.markers);
    if (this.markers.length != 0) {
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
        new L.marker([stop.lat, stop.lon], { icon: this.iconBus, id: stop.id, meters: stop.meters, message: stop.message, title: stop.name })
          .bindPopup(popUp, popUpOptions)
          .on('click', function (e) {
            this.openPopup();
          }).addTo(this.markersCluster);
      });
      this.map.fitBounds(this.markersCluster.getBounds());
    }
    this.map.addLayer(this.markersCluster);
    this.map.closePopup();
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
  }

  async showBusLines() {
    let alert = this.alertCtrl.create({
      title: 'Filter Bus Lines',
      inputs: this.CheckBoxRoutes,
      buttons: [{
        text: 'Ok',
        handler: data => {
          //console.dir(data);
          this.markers = [];
          data.forEach(line => {
            //console.log("data from checkbox:", line);
            line.stops.forEach(stop => {
              //console.log(stop.id);
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


  showPlanning() {
    this.planning.orig = "cenas";
  }

  async showRoute() {
    if (this.planning.orig.latlng != "" && this.planning.dest.latlng != "")
      await this.dataProvider.planningRoute(this.planning.orig.latlng, this.planning.dest.latlng).then((resp) => {
        //this.route = resp;
        let waypoints = [];
        let i = 0;
        resp.plan.itineraries.forEach(element => {
          waypoints[i] = [];
          console.dir(element);
          element.legs.forEach(element2 => {
            element2.steps.forEach(element3 => {
              waypoints[i].push({ lat: element3.lat, lon: element3.lon });
            });
          });
          i++;
        });
        //console.dir(waypoints);

        this.route = L.Routing.control({
          waypoints: waypoints[0],
          routeWhileDragging: true
        }).addTo(this.map);

        L.Routing.control({
          waypoints: waypoints[1],
          routeWhileDragging: true
        }).addTo(this.map);

        L.Routing.control({
          waypoints: waypoints[2],
          routeWhileDragging: true
        }).addTo(this.map);

      });
  }
}
