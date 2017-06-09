import { Component } from '@angular/core';

import { Platform, AlertController, NavController, NavParams, ToastController } from 'ionic-angular';

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
import 'moment';

declare var L: any;
declare var moment: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  public stops: any; // PARAGENS
  public markersCluster: any; // CLUSTER
  private markers: any = []; // CLUSTER ON MAP
  private routingControl: any; //CONTROLER OF ROUTING
  //private busLineBox: boolean = false; //CONTROLER OF ROUTING


  private map: any;
  private mapSatellite: any;
  private mapStreet: any;
  private chooseMap: string = "Satellite";
  private currentPosition: any;
  public debug: any;
  private controlSearch: any;
  private allowLocation = false;


  public planning: any = [];
  public planningBox: any = [];
  public route: any;
  public container: any;
  public startBtn: any;
  public destBtn: any;


  private iconBus = L.icon({
    iconUrl: 'assets/img/busStop.png',
    iconSize: [50, 50],
    //iconAnchor: [-50, 45],
    popupAnchor: [0, -35]
  });

  private iconStart = L.icon({
    iconUrl: 'assets/img/startPin.png',
    iconSize: [75, 75],
    iconAnchor: [40, 65],
    popupAnchor: [0, -50],
  });

  private iconDest = L.icon({
    iconUrl: 'assets/img/destPin.png',
    iconSize: [75, 75],
    iconAnchor: [40, 65],
    popupAnchor: [0, -50],
  });


  constructor(public navCtrl: NavController, private navParams: NavParams,
    public toastCtrl: ToastController, public http: Http,
    public alertCtrl: AlertController, public db: DatabaseProvider,
    public dataProvider: DataProvider, public geolocation: Geolocation,
    public platform: Platform
  ) {
    this.planning.orig = [];
    this.planning.dest = [];
    this.routingControl = [];
    this.currentPosition = [];
    this.planningBox.size = 50;
    this.planningBox.button = "down";
  }


  async ngOnInit() {
    //console.log("Init cenas");
    this.platform.ready().then(() => {
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
      //console.log("Init Done!");
    });
  }


  initMap(): void {
    //let tiles = L.tileLayer('https://api.mapbox.com/styles/v1/rcdd/cj0lffm3h006c2qjretw3henw/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
    this.mapStreet = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Application power by RD&RP :)',
      maxZoom: 20,
      minZoom: 8,
      id: 'streets-v10',
      accessToken: 'pk.eyJ1IjoicmNkZCIsImEiOiJjajBiMHBsbWgwMDB2MnFud2NrODRocXNjIn0.UWZO6WuB6DPU6AMWt5Mr9A',
      //accessToken: 'sk.eyJ1IjoicmNkZCIsImEiOiJjajBiOGhzOGUwMDF3MzNteDB1MzJpMTl6In0.1fiOkskHZqGiV20G95ENaA',
      // CACHE STUFF
      useCache: true,
      //useOnlyCache: true,
      crossOrigin: true,
      saveToCache: true,
      //cacheMaxAge: (7 * 24 * 3600000), // 7days
    });
    this.mapSatellite = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Application power by RD&RP :)',
      maxZoom: 20,
      minZoom: 8,
      id: 'satellite-streets-v10',
      accessToken: 'pk.eyJ1IjoicmNkZCIsImEiOiJjajBiMHBsbWgwMDB2MnFud2NrODRocXNjIn0.UWZO6WuB6DPU6AMWt5Mr9A',
      //accessToken: 'sk.eyJ1IjoicmNkZCIsImEiOiJjajBiOGhzOGUwMDF3MzNteDB1MzJpMTl6In0.1fiOkskHZqGiV20G95ENaA',
      // CACHE STUFF
      useCache: true,
      //useOnlyCache: true,
      crossOrigin: true,
      saveToCache: true,
      //cacheMaxAge: (7 * 24 * 3600000), // 7days
    });

    this.map = L.map('mapid', { zoomControl: false })
      .addLayer(this.mapStreet)
      .setView([39.7460465, -8.8059954], 14);
    this.map.locate({ setView: true, maxZoom: 15 });


    this.markersCluster = L.markerClusterGroup({ maxClusterRadius: 100, removeOutsideVisibleBounds: true });

    this.currentPosition.marker = L.marker(this.map.getCenter()).addTo(this.map);
    this.currentPosition.circle = L.circle(this.map.getCenter()).addTo(this.map);


    this.container = L.DomUtil.create('div', 'container');
    this.startBtn = this.createButton('<img src="assets/img/originRoute.png" />&nbsp Get direction from here', this.container);
    this.destBtn = this.createButton(' <img src="assets/img/destinationRoute.png" />&nbsp Get direction to here', this.container);
    let self = this;

    this.map.on('contextmenu', function (e) {
      L.popup()
        .setContent(self.container)
        .setLatLng(e.latlng)
        .openOn(self.map);

      L.DomEvent.on(self.startBtn, 'click', function () {      // ROUTING OF THE MAP
        self.map.removeLayer(self.planning.orig);
        self.cancelRoute(false);
        self.planning.orig = L.marker(e.latlng, { draggable: true, icon: self.iconStart })
          .bindPopup("Origin")
          .addTo(self.map)
          .on('dragend', (e) => {
            //console.log("dragOrigin", e);
            self.planningBox.size = 50;
            self.planningBox.button = "down";
            self.cancelRoute(false);
            self.dataProvider.getReverseGeoCoder(e.target._latlng.lat, e.target._latlng.lng).then((resp) => {
              self.planning.orig.text = resp;
              self.planning.orig.latlng = (e.target._latlng.lat + ',' + e.target._latlng.lng);
            });
          });

        self.dataProvider.getReverseGeoCoder(e.latlng.lat, e.latlng.lng).then((resp) => {
          self.planning.orig.text = resp;
          self.planning.orig.latlng = (e.latlng.lat + ',' + e.latlng.lng);
        });
        self.map.closePopup();
      });

      L.DomEvent.on(self.destBtn, 'click', function () {
        self.map.removeLayer(self.planning.dest);
        self.cancelRoute(false);
        self.planning.dest = L.marker(e.latlng, { draggable: true, icon: self.iconDest })
          .bindPopup("Destination")
          .addTo(self.map)
          .on('dragend', (e) => {
            //console.log("dragDest", e);
            self.planningBox.size = 50;
            self.planningBox.button = "down";
            self.cancelRoute(false);
            self.dataProvider.getReverseGeoCoder(e.target._latlng.lat, e.target._latlng.lng).then((resp) => {
              self.planning.dest.text = resp;
              self.planning.dest.latlng = (e.target._latlng.lat + ',' + e.target._latlng.lng);
            });
          });
        //console.log("originData", self.planning.orig.latlng);
        if (self.planning.orig.latlng == undefined) {
          self.dataProvider.getReverseGeoCoder(self.currentPosition.marker.getLatLng().lat, self.currentPosition.marker.getLatLng().lng).then((resp) => {
            self.planning.orig.text = resp;
            self.planning.orig.latlng = (self.currentPosition.marker.getLatLng().lat + ',' + self.currentPosition.marker.getLatLng().lng);
          });
        }

        self.dataProvider.getReverseGeoCoder(e.latlng.lat, e.latlng.lng).then((resp) => {
          self.planning.dest.text = resp;
          self.planning.dest.latlng = (e.latlng.lat + ',' + e.latlng.lng);
        });


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
            self.getCurrentLocation();
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
            self.getCurrentLocation();
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
            self.getCurrentLocation();
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

  // FIT MARKERS
  fitMarkers() {
    if (this.markers.length != 0) {
      this.map.fitBounds(this.markersCluster.getBounds());
    } else {
      this.map.setView(new L.LatLng(39.7481437, -8.810919), 13);
    }
  }

  // GET CLOSEST STOPS
  closedStop() {
    let closestStop: any;
    let minMetrs: number = Number.MAX_SAFE_INTEGER;
    if (this.allowLocation == true) {
      if (this.markers.length != 0) {
        this.markersCluster.eachLayer(stop => {
          //console.log("stop on layer", stop);
          if (stop.options.meters <= minMetrs) {
            minMetrs = stop.options.meters;
            closestStop = stop;
          }
        });
        this.map.setView(closestStop.getLatLng(), 19);
        let self = this;
        this.markersCluster.eachLayer(function (layer) {
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
        this.showToast(closestStop.options.message + " from you!", 3000);
      } else {
        let alert = this.alertCtrl.create({
          title: "Atention",
          subTitle: "Please select at least one busline",
          buttons: [{
            text: 'Ok',
            handler: () => {
              this.showBusLines();
            }
          }]
        });
        alert.present();
      }
    } else {
      this.showToast("We can't calculate your position", 3000);
    }

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
      //self.showToast(error.message, 3000);
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
        if (this.allowLocation == true) {
          stop.meters = this.currentPosition.marker.getLatLng().distanceTo([stop.lat, stop.lon]);
          stop.message = "Distance: " + this.getDistance(stop.meters);
        } else {
          stop.message = '';
        }
        let popUp = '<h6>' + stop.name + '</h6><hr>' + stop.message + '<br>Lines:';
        stop.lines.forEach(line => {
          popUp += '<br>Line ' + line;
        });
        //popUp += "<br>" + this.container;
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
    //this.busLineBox = true;

    let alert = this.alertCtrl.create({
      title: 'Filter Bus Lines',
      inputs: this.dataProvider.CheckBoxRoutes,
      buttons: [{
        text: 'Select All',
        handler: data => {
          this.dataProvider.CheckBoxRoutes.forEach(checkBox => {
            checkBox.checked = true;
          });
          this.showBusLines();
        }
      }, {
        text: 'Select None',
        handler: data => {
          this.dataProvider.CheckBoxRoutes.forEach(checkBox => {
            checkBox.checked = false;
          });
          this.showBusLines();
        }
      },
      {
        text: 'Cancel',
        role: 'cancel',
        handler: data => {
          console.log('Cancel clicked');
        }
      }, {
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
      }]
    });
    alert.present();

  }

  // ####################    BEAUTIFUL THINGS  ########################
  async chooseRoute() {
    this.dataProvider.loading = true;
    if (this.planning.orig.latlng != undefined && this.planning.dest.latlng != undefined) {
      await this.dataProvider.planningRoute(this.planning.orig.latlng, this.planning.dest.latlng).then((resp) => {
        if (resp != null) {
          if (resp.error == undefined) {
            this.cancelRoute(false);
            //console.log("PlanningData", resp);
            this.routingControl.itenarary = [];
            this.routingControl.itenarary.showDetails = false;
            //this.routingControl.icon = 'ios-add-circle-outline';
            resp.plan.itineraries.forEach(itinerary => {
              itinerary.icon = 'ios-add-circle-outline';
              itinerary.duration = moment.unix(itinerary.duration).format("HH:mm:ss");
              itinerary.startTime = moment.unix((itinerary.startTime) / 1000).format("DD/MM HH:mm");
              itinerary.endTime = moment.unix((itinerary.endTime) / 1000).format("DD/MM HH:mm");
              itinerary.walkDistance = this.getDistance(itinerary.walkDistance);
              itinerary.legs.forEach(leg => {
                leg.distance = this.getDistance(leg.distance);
                if (leg.mode == "WALK") {
                  leg.steps.forEach(step => {
                    step.distance = this.getDistance(step.distance);
                    step.direction = "Go " + step.absoluteDirection + " on " + step.streetName + " about " + step.distance;
                    step.showDetails = false;
                    leg.icon = 'ios-add-circle-outline';
                  });
                } else if (leg.mode == "BUS") {
                  leg.direction = ("Get bus on " + leg.routeLongName + " at " + moment.unix((leg.startTime) / 1000).format("HH:mm") + "h and exit on " + leg.to.name);
                  leg.showDetails = false;
                  leg.icon = 'ios-add-circle-outline';
                } else {
                  leg.direction = "UNKNOWN"
                }
              });
              this.routingControl.itenarary.push(itinerary);
            });
            //console.log("Itenararies", this.routingControl.itenarary);
          } else {
            this.showToast(resp.error.msg, 5000);
          }
        } else {
          this.showToast("No network!", 5000);
        }
      });
    } else {
      this.showToast("You need to select origin and destinations points", 3000);
    }
    this.dataProvider.loading = false;
  }

  showRoute(route) {
    this.dataProvider.loading = true;
    console.log("Route", route);
    if (this.map.hasLayer(this.routingControl.polyline)) {
      this.map.removeControl(this.routingControl.polyline);
    }
    if (this.routingControl.markers != undefined) {
      this.routingControl.markers.forEach(circle => {
        if (this.map.hasLayer(circle)) {
          this.map.removeControl(circle);
        }
      });
    }

    this.routingControl.polyline = [];
    this.routingControl.polyline.coords = [];
    this.routingControl.markers = [];

    route.legs.forEach(leg => {
      //console.log("geometry->encoded", leg.legGeometry.points);
      //console.log("geometry->decoded", L.Polyline.fromEncoded(leg.legGeometry.points));
      //console.log("geometry->LatLng", L.Polyline.fromEncoded(leg.legGeometry.points).getLatLngs());
      this.routingControl.polyline.coords = this.routingControl.polyline.coords.concat(L.Polyline.fromEncoded(leg.legGeometry.points).getLatLngs());
      if (leg.mode == "BUS") {
        this.routingControl.markers.push(L.circle([leg.from.lat, leg.from.lon], { radius: 20 }).bindPopup("Take bus on " + leg.from.name));
        this.routingControl.markers.push(L.circle([leg.to.lat, leg.to.lon], { radius: 20 }).bindPopup("Exit on " + leg.to.name));
      } else {
        leg.steps.forEach(step => {
          L.Polyline.fromEncoded(leg.legGeometry.points).getLatLngs().forEach(element => {
            this.routingControl.markers.push(L.circle([step.lat, step.lon], { radius: 10 }).bindPopup(step.direction));
          });
        });
      }

    });
    //console.log("polyMarkersAll", this.routingControl.markers);
    this.routingControl.markers.forEach(circle => {
      circle.addTo(this.map);
    });
    //console.log("PolyLine", this.routingControl.polyline.coords);
    this.routingControl.polyline = new L.Polyline(this.routingControl.polyline.coords);
    this.routingControl.polyline.addTo(this.map);

    this.routingControl.itenarary = undefined;
    this.dataProvider.loading = false;
    //console.log("routingMarkers", this.routingControl.markers);
    //console.log("routingPolyline", this.routingControl.polyline);

    this.planningBox.size = -100;
    this.planningBox.button = "up";
    this.map.fitBounds(this.routingControl.polyline.getBounds(), { padding: L.point(10, 10) });
  }

  cancelRoute(all: boolean) {
    if (this.routingControl.route != undefined) {
      for (var i = 0; i < Object.keys(this.routingControl.route).length; i++) {
        this.routingControl.route[i].remove();
      }
    }
    if (this.map.hasLayer(this.routingControl.polyline)) {
      this.map.removeControl(this.routingControl.polyline);
    }

    if (this.routingControl.markers != undefined) {
      this.routingControl.markers.forEach(circle => {
        if (this.map.hasLayer(circle)) {
          this.map.removeControl(circle);
        }
      });
    }

    if (all) {

      if (this.routingControl.markers != undefined) {
        this.routingControl.markers.forEach(circle => {
          if (this.map.hasLayer(circle)) {
            this.map.removeControl(circle);
          }
        });
      }
      if (this.map.hasLayer(this.planning.orig)) {
        this.planning.orig.remove();
      }
      if (this.map.hasLayer(this.planning.dest)) {
        this.planning.dest.remove();
      }
      this.planning.orig = [];
      this.planning.dest = [];
    }

    this.routingControl.itenarary = undefined;
  }

  toggleDetails(data) {
    if (data.showDetails) {
      data.showDetails = false;
      data.icon = 'ios-add-circle-outline';
    } else {
      this.routingControl.itenarary.forEach(element => {
        if (element != data) {
          element.showDetails = false;
          element.icon = 'ios-add-circle-outline';
        }
      });
      data.showDetails = true;
      data.icon = 'ios-remove-circle-outline';

    }
  }
  toggleSubDetails(data, array) {
    if (data.showDetails) {
      data.showDetails = false;
      data.icon = 'ios-add-circle-outline';
    } else {
      array.forEach(element => {
        /* console.log("data", data);
         console.log("array", element);*/
        if (element != data) {
          element.showDetails = false;
          element.icon = 'ios-add-circle-outline';
        }
      });
      data.showDetails = true;
      data.icon = 'ios-remove-circle-outline';

    }
  }

  tooglePlaning() {
    //console.log("planningSize", this.planningBox);
    if (this.planningBox.size == 50) {
      this.planningBox.size = -100;
      this.planningBox.button = "up";
    } else {
      this.planningBox.size = 50;
      this.planningBox.button = "down";
    }
  }

  getDistance(meters: any) {
    return ((meters > 1000) ? ((meters / 1000).toFixed(1) + ' Kms') : (meters.toFixed(0) + 'm'));
  }

  toogleMapTile() {
    if (this.map.hasLayer(this.mapSatellite)) {
      this.map.removeLayer(this.mapSatellite);
      this.map.addLayer(this.mapStreet);
      this.chooseMap = "Satellite";
    } else {
      this.map.removeLayer(this.mapStreet);
      this.map.addLayer(this.mapSatellite);
      this.chooseMap = "Street";
    }
  }
}
