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
import 'leaflet-control-geocoder';
import 'polyline-encoded';

declare var L: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  public stops: any; // PARAGENS
  public markersCluster: any; // CLUSTER
  private markers: any = []; // CLUSTER ON MAP
  private routingControl: any; //CONTROLER OF ROUTING

  private map: any;
  private currentPosition: any;
  public debug: any;
  private controlSearch: any;
  private allowLocation = false;


  public planning: any = [];
  public route: any;

  private iconBus = L.icon({
    iconUrl: 'assets/icon/busStop.png',
    iconSize: [50, 50],
    popupAnchor: [0, -25]
  });

  private iconStart = L.icon({
    iconUrl: 'assets/icon/startPin.png',
    iconSize: [75, 75],
    iconAnchor: [40, 65],
    popupAnchor: [0, -50],
  });

  private iconDest = L.icon({
    iconUrl: 'assets/icon/destPin.png',
    iconSize: [75, 75],
    iconAnchor: [40, 65],
    popupAnchor: [0, -50],
  });


  constructor(public navCtrl: NavController, private navParams: NavParams,
    public toastCtrl: ToastController, public http: Http,
    public alertCtrl: AlertController, public db: DatabaseProvider,
    public dataProvider: DataProvider, public geolocation: Geolocation
  ) {
    this.planning.orig = [];
    this.planning.dest = [];
    this.routingControl = [];
    this.currentPosition = [];
  }


  async ngOnInit() {
    console.log("Init cenas");
    this.dataProvider.getDataFromServer().then((resp) => {
      this.dataProvider.innit = 100;
      this.stops = resp;
      //console.log("imported stops:", Object.keys(this.stops).length);
      //console.log("imported stops:", this.stops);
      this.initMap();
      this.dataProvider.populateCheckBoxs();
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
      minZoom: 8,
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

    this.currentPosition.marker = L.marker(this.map.getCenter()).addTo(this.map);
    this.currentPosition.circle = L.circle(this.map.getCenter()).addTo(this.map);


    // ROUTING CONTROL
    /* this.routingControl = L.Routing.control({
       //serviceUrl: 'http://194.210.216.191/otp/routers/default',
       routeWhileDragging: true,
       reverseWaypoints: true,
       //itinerary: L.Routing.itinerary([39.7365272,-8.822886], [39.7350394,-8.8232237], [39.7331818,-8.8226327]),
       // geocoder: L.Control.Geocoder.nominatim(),
       waypointNameFallback: function (latLng) {
         function zeroPad(n) {
           n = Math.round(n);
           return n < 10 ? '0' + n : n;
         }
         function sexagesimal(p, pos, neg) {
           var n = Math.abs(p),
             degs = Math.floor(n),
             mins = (n - degs) * 60,
             secs = (mins - Math.floor(mins)) * 60,
             frac = Math.round((secs - Math.floor(secs)) * 100);
           return (n >= 0 ? pos : neg) + degs + '°' +
             zeroPad(mins) + '\'' +
             zeroPad(secs) + '.' + zeroPad(frac) + '"';
         }
 
         return sexagesimal(latLng.lat, 'N', 'S') + ' ' + sexagesimal(latLng.lng, 'E', 'W');
       }
     });*/

    var self = this;
    this.map.on('contextmenu', function (e) {
      var container = L.DomUtil.create('div'),
        startBtn = self.createButton('Start from here', container),
        destBtn = self.createButton('Go to', container);

      L.popup()
        .setContent(container)
        .setLatLng(e.latlng)
        .openOn(self.map);

      L.DomEvent.on(startBtn, 'click', function () {      // ROUTING OF THE MAP
        self.map.removeLayer(self.planning.orig);
        self.planning.orig = L.marker(e.latlng, { draggable: true, icon: self.iconStart })
          .bindPopup("Origin")
          .addTo(self.map)
          .on('dragend', (e) => {
            console.log("dragOrigin", e);
            self.cancelRoute(false);
            self.planning.orig.latlng = e.target._latlng.lat + "," + e.target._latlng.lng;
          });
        self.planning.orig.latlng = e.latlng.lat + ',' + e.latlng.lng;
        //self.map.removeControl(self.routingControl);
        //self.routingControl.addTo(self.map);
        //self.routingControl.spliceWaypoints(0, 1, e.latlng);

        self.map.closePopup();
      });

      L.DomEvent.on(destBtn, 'click', function () {
        self.map.removeLayer(self.planning.dest);
        self.planning.dest = L.marker(e.latlng, { draggable: true, icon: self.iconDest })
          .bindPopup("Destino")
          .addTo(self.map)
          .on('dragend', (e) => {
            console.log("dragDest", e);
            self.cancelRoute(false);
            self.planning.dest.latlng = e.target._latlng.lat + "," + e.target._latlng.lng;
          });
        self.planning.dest.latlng = e.latlng.lat + ',' + e.latlng.lng;
        //self.map.removeControl(self.routingControl);
        //self.routingControl.addTo(self.map);
        //self.routingControl.spliceWaypoints(self.routingControl.getWaypoints().length - 1, 1, e.latlng);

        self.map.closePopup();
      });

    });

    // CONTROLS OF THE MAP
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
              //console.log("ButtonLocation", e);
              this.setView(e.latlng, 17);
              let data = { latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy: e.accuracy };
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
              let data = { latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy: e.accuracy };
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
              let data = { latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy: e.accuracy };
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
        self.map.setView(new L.LatLng(39.7481437, -8.810919), 13);
      }
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

  createButton(label, container) {
    var btn = L.DomUtil.create('button', '', container);
    btn.setAttribute('type', 'button');
    btn.innerHTML = label;
    return btn;
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
      //console.log('Distances:');
      // console.dir(self.currentPosition.getLatLng());
      //console.log("Location", resp);
      if (self.currentPosition.marker.getLatLng().lat != resp.coords.latitude ||
        self.currentPosition.marker.getLatLng().lng != resp.coords.longitude) {
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
    console.log("updateLocation", data);
    var radius = (data.accuracy / 2).toFixed(1);
    var currentPosition = [data.latitude, data.longitude];
    this.currentPosition.marker.setLatLng(currentPosition);
    this.currentPosition.marker.bindPopup("You are within " + radius + " meters from this point");
    this.currentPosition.circle.setLatLng(currentPosition);
  }

  updateClusterGroup() {
    this.map.removeLayer(this.markersCluster);
    this.markersCluster = new L.markerClusterGroup({ maxClusterRadius: 100, removeOutsideVisibleBounds: true });
    //console.log("makers", this.markers);
    if (this.markers.length != 0) {
      this.markers.forEach(stop => {
        let dist: any;
        if (this.allowLocation == true) {
          stop.meters = this.currentPosition.marker.getLatLng().distanceTo([stop.lat, stop.lon]);
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
        let popUp = '<h6>' + stop.name + '</h6><hr>' + dist + 'Lines:';
        stop.lines.forEach(line => {
          popUp += '<br>Line ' + line;
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
      inputs: this.dataProvider.CheckBoxRoutes,
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

          this.dataProvider.CheckBoxRoutes.forEach(checkBox => {
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

  // ####################    TO MUCH TO DO HERE!!!!!!!!!! ########################
  async showRoute() {
    this.dataProvider.loading = true;
    if (this.planning.orig.latlng != undefined && this.planning.dest.latlng != undefined) {
      await this.dataProvider.planningRoute(this.planning.orig.latlng, this.planning.dest.latlng).then((resp) => {
        if (resp.error == undefined) {
          this.cancelRoute(false);
          //this.route = resp;
          let waypoints = [];
          let legGeometry = [];
          let i = 0;
          resp.plan.itineraries.forEach(element => {
            waypoints[i] = [];
            legGeometry[i] = [];
            console.dir(element);
            element.legs.forEach(element2 => {
              legGeometry[i].push(element2.legGeometry.points);
              element2.steps.forEach(element3 => {
                waypoints[i].push({ lat: element3.lat, lon: element3.lon });
              });
            });
            i++;
          });
          //console.dir(waypoints);

          //console.log("geometry", legGeometry[1]);
          let j = 0;
          let poly = [];
          this.routingControl.route = [];
          legGeometry.forEach(element => {
            poly[j] = [];
            element.forEach(element2 => {
              //console.log("geometry->encoded", element);
              //console.log("geometry->decoded", L.Polyline.fromEncoded(element));
              //console.log("geometry->LatLng", L.Polyline.fromEncoded(element).getLatLngs());
              //if (j != 1) {
              //}
              poly[j] = poly[j].concat(L.Polyline.fromEncoded(element2).getLatLngs());
            });
            console.log("PolyEach" + [j], poly[j]);
            this.routingControl.route[j] = new L.Polyline(poly[j], {
              color: (j == 0 ? 'red' : j == 1 ? 'green' : j == 2 ? 'blue' : 'black'),
            }).addTo(this.map);
            j++;
          });

          console.log("poly", this.routingControl.route);

        } else {
          this.showToast(resp.error.msg, 5000);
        }
      });
    } else {
      this.showToast("You need to select origin and destinations points", 3000);
    }
    this.dataProvider.loading = false;
  }

  cancelRoute(all: boolean) {
    /*if (this.routingControl.route != undefined) {
      this.map.removeControl(this.routingControl.route);
      this.routingControl.route = undefined;
    }*/
    console.log("routes:", this.routingControl.route)
    if (this.routingControl.route != undefined) {
      for (var i = 0; i < Object.keys(this.routingControl.route).length; i++) {
        this.routingControl.route[i].remove();
      }
    }
    this.routingControl = [];
    if (all) {
      if (this.map.hasLayer(this.planning.orig)) {
        this.planning.orig.remove();
      }
      if (this.map.hasLayer(this.planning.dest)) {
        this.planning.dest.remove();
      }
      this.planning.orig = [];
      this.planning.dest = [];
    }
  }
}
