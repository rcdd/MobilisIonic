import { Component } from '@angular/core';

import { Platform, AlertController, NavController, NavParams, ToastController } from 'ionic-angular';

import { Http } from '@angular/http';

import { Geolocation } from '@ionic-native/geolocation';

import { FabContainer } from 'ionic-angular';

import { DatabaseProvider } from '../../providers/database-provider';

import { DataProvider } from '../../providers/data-provider';

import 'rxjs/add/operator/map';
import 'leaflet';
import 'leaflet.markercluster';
import 'leaflet-easybutton';
import 'leaflet-search';
import 'leaflet-knn';
import 'leaflet.featuregroup.subgroup'
import 'leaflet-routing-machine'
import 'leaflet-control-geocoder';
import 'leaflet-google-places-autocomplete';
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
  private searchControl: boolean = false;
  private searchInput: string = "";
  private searchResults: any = [];
  private searchMarker: any;

  private allowLocation = false;


  public planning: any = [];
  public planningBox: any = [];
  public planningBallonOpened: boolean = false;
  public route: any;
  public container: any;
  public startBtn: any;
  public favBtn: any;
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

  async ionViewWillEnter() {
    //console.log("fav", this.dataProvider.favoriteToGo);
    if (this.dataProvider.getFavorite() != undefined) {
      this.cancelRoute(true);
      let origin = this.dataProvider.getFavorite().origin.split(',');
      let destination = this.dataProvider.getFavorite().destination.split(',');
      await this.planningOrigin(origin[0], origin[1]).then(a => {
        return this.planningDestination(destination[0], destination[1]).then(a => {
          // TODO: fitBound of both points
          //this.map.fitBounds({ "lat": origin[0], "lng": origin[1] }, { "lat": destination[0], "lng": destination[1] });
          this.dataProvider.setFavorite(undefined);
          return true;
        });
      });
    }
  }


  async ngOnInit() {
    this.platform.ready().then(() => {
      this.dataProvider.getDataFromServer().then((resp) => {
        this.dataProvider.innit = 100;
        this.stops = resp;
        //console.log("imported stops:", Object.keys(this.stops).length);
        //console.log("imported stops:", this.stops);
        this.initMap();
        this.dataProvider.populateCheckBoxs();

        //Localization
        let self = this;
        this.map.on('locationerror', function (e) {
          self.allowLocation = false;
          self.showToast('You denied localization. For better performance, please allow your location. If already, please restart the app.', 5000);
        });

        this.getCurrentLocation();
        let watch = this.geolocation.watchPosition()
        watch.subscribe((data) => {
          if (data.coords !== undefined) {
            //console.log("data from watchingPosition", data);
            this.updateCurrentLocation(data.coords);
          }
        });
      });
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



    let self = this;

    this.map.on('click', function (e) {
      if (!self.planningBallonOpened) {
        self.planningBallonOpened = true;
        self.createBallon("<h6>Travel Point</h6><hr>");
        L.popup()
          .setContent(self.container)
          .setLatLng(e.latlng)
          .openOn(self.map);


        L.DomEvent.on(self.startBtn, 'click', function () {
          self.planningOrigin(e.latlng.lat, e.latlng.lng);
        });

        L.DomEvent.on(self.destBtn, 'click', function () {
          self.planningDestination(e.latlng.lat, e.latlng.lng);
        });
      } else {
        self.planningBallonOpened = false;
      }
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

  }

  createBallon(text: string, fav: boolean = false) {
    this.container = L.DomUtil.create('div', 'container');
    this.container.innerHTML = text;
    this.startBtn = this.createButton('<div class="btnNavStart"><img src="assets/img/originRoute.png" /><div class="label"> Start </div></div>', this.container);
    this.favBtn = this.createButton('<div class="btnNavFav"><img src="assets/img/' + (fav ? "starFull" : "starEmpty") + '.png" /></div>', this.container);
    this.destBtn = this.createButton('<div class="btnNavEnd"><img class="btnNavEnd" src="assets/img/destinationRoute.png" /><div class="label"> Finish </div></div>', this.container);
  }

  // FIT MARKERS
  fitMarkers(fab: FabContainer = null) {
    fab != null ? fab.close() : '';
    if (this.markers.length != 0) {
      this.map.fitBounds(this.markersCluster.getBounds());
    } else {
      this.map.setView(new L.LatLng(39.7481437, -8.810919), 13);
    }
  }

  // GET CLOSEST STOPS
  async closedStop(fab: FabContainer = null) {
    fab != null ? fab.close() : '';
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
        let alert = await this.alertCtrl.create({
          title: "Atention",
          subTitle: "Please select at least one busline",
          buttons: [{
            text: 'Ok',
            handler: () => {
              this.showBusLines().then(a => {
                this.closedStop();
              });
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

  async planningOrigin(lat: any, lng: any) {      // ROUTING OF THE MAP
    return new Promise((resolve, reject) => {
      this.map.removeLayer(this.planning.orig);
      this.cancelRoute(false);
      this.planning.orig = L.marker([lat, lng], { draggable: true, icon: this.iconStart })
        .bindPopup("Origin")
        .addTo(this.map)
        .on('dragend', (e) => {
          this.planningBox.size = 50;
          this.planningBox.button = "down";
          this.cancelRoute(false);
          this.planning.orig.setLatLng([e.target._latlng.lat, e.target._latlng.lng]);
          this.dataProvider.getReverseGeoCoder(e.target._latlng.lat, e.target._latlng.lng).then((resp) => {
            this.planning.orig.text = resp;
            this.planning.orig.latlng = (e.target._latlng.lat + ',' + e.target._latlng.lng);
          });
        });

      this.dataProvider.getReverseGeoCoder(lat, lng).then((resp) => {
        this.planning.orig.text = resp;
        this.planning.orig.latlng = (lat + ',' + lng);
      });
      this.map.closePopup();
      resolve(this.planning.orig);
    });
  }
  async planningDestination(lat: any, lng: any) {
    return new Promise((resolve, reject) => {
      this.map.removeLayer(this.planning.dest);
      this.cancelRoute(false);
      this.planning.dest = L.marker([lat, lng], { draggable: true, icon: this.iconDest })
        .bindPopup("Destination")
        .addTo(this.map)
        .on('dragend', (e) => {
          this.planningBox.size = 50;
          this.planningBox.button = "down";
          this.cancelRoute(false);
          this.planning.dest.setLatLng([e.target._latlng.lat, e.target._latlng.lng]);
          this.dataProvider.getReverseGeoCoder(e.target._latlng.lat, e.target._latlng.lng).then((resp) => {
            this.planning.dest.text = resp;
            this.planning.dest.latlng = (e.target._latlng.lat + ',' + e.target._latlng.lng);
          });
        });

      if (this.planning.orig.latlng == undefined && this.dataProvider.getFavorite() == undefined) {
        this.dataProvider.getReverseGeoCoder(this.currentPosition.marker.getLatLng().lat, this.currentPosition.marker.getLatLng().lng).then((resp) => {
          this.planning.orig.text = resp;
          this.planning.orig.latlng = (this.currentPosition.marker.getLatLng().lat + ',' + this.currentPosition.marker.getLatLng().lng);
          console.log(this.planning.orig.latlng);
        });
      }

      this.dataProvider.getReverseGeoCoder(lat, lng).then((resp) => {
        this.planning.dest.text = resp;
        this.planning.dest.latlng = (lat + ',' + lng);
      });

      this.map.closePopup();
      resolve(this.planning.dest);
    });
  }

  getCurrentLocation() {
    let self = this;
    this.geolocation.getCurrentPosition().then((resp) => {
      console.log("GeoLocation:", resp);
      self.allowLocation = true;
      if (self.currentPosition.marker.getLatLng().lat != resp.coords.latitude ||
        self.currentPosition.marker.getLatLng().lng != resp.coords.longitude) {
        self.updateCurrentLocation(resp.coords);
      }
    }).catch((error) => {
      console.log('Error getting location', error);
      self.allowLocation = false;
    });
  }

  updateCurrentLocation(data): void {
    //console.log("updateLocation", data);
    var radius = (data.accuracy / 2).toFixed(1);
    var currentPosition = [data.latitude, data.longitude];
    this.currentPosition.marker.setLatLng(currentPosition);
    this.currentPosition.marker.bindPopup("You are within " + radius + " meters from this point");
    this.currentPosition.circle.setLatLng(currentPosition);
  }

  updateClusterGroup() {
    this.map.removeLayer(this.markersCluster);
    this.markersCluster = new L.markerClusterGroup({ maxClusterRadius: 100, removeOutsideVisibleBounds: true });
    if (this.markers.length != 0) {
      this.markers.forEach(stop => {
        if (this.allowLocation == true) {
          stop.meters = this.currentPosition.marker.getLatLng().distanceTo([stop.lat, stop.lon]);
          stop.message = '<img class="distanceImg" src="assets/img/iconDistance.png" /> Distance: ' + this.getDistance(stop.meters);
        } else {
          stop.message = '';
        }
        let popUp = '<div class="header"><div class="stopImg"><img src="assets/img/android-bus.png" /></div><div class="stopLabel"><b>' + stop.id.split(":")[1] + " - " + stop.name + '</b></div></div><hr>';
        popUp += stop.message + '<hr> <div class="linesDiv"> <div class="labelLines"><b>Lines:</b></div>';
        stop.lines.forEach(line => {
          popUp += '<br> <div class="lineItem"> <img class="lineImg" src="assets/img/iconLines.png" />Line ' + line + "</div>";
        });
        popUp += "</div>"
        let popUpOptions =
          {
            'className': 'custom'
          }

        this.createBallon(popUp + "<hr>", (stop.favorite ? true : false));
        let marker = new L.marker([stop.lat, stop.lon], { icon: this.iconBus, id: stop.id, meters: stop.meters, message: stop.message, title: stop.name })
          .bindPopup(this.container, popUpOptions)
          .on('click', function (e) {
            this.openPopup();
          }).addTo(this.markersCluster);

        let self = this;
        L.DomEvent.on(this.startBtn, 'click', function () {
          self.planningOrigin(stop.lat, stop.lon);
        });

        L.DomEvent.on(this.favBtn, 'click', function () {
          stop.favorite = true;
          /*self.createBallon(popUp + "<hr>", (stop.favorite ? true : false));
          new L.marker([stop.lat, stop.lon], { icon: self.iconBus, id: stop.id, meters: stop.meters, message: stop.message, title: stop.name })
            .bindPopup(self.container, popUpOptions)
            .openPopup()
            .addTo(self.markersCluster);*/
        });

        L.DomEvent.on(this.destBtn, 'click', function () {
          self.planningDestination(stop.lat, stop.lon);
        });
      });
      this.map.fitBounds(this.markersCluster.getBounds());
    }
    this.map.addLayer(this.markersCluster);
    this.map.closePopup();
  }

  async showBusLines(fab: FabContainer = null) {
    fab != null ? fab.close() : '';
    return new Promise((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: 'Filter Bus Lines',
        inputs: this.dataProvider.CheckBoxRoutes,
        buttons: [{
          text: 'Select All',
          handler: data => {
            this.dataProvider.loading = true;
            this.markers = [];
            this.dataProvider.CheckBoxRoutes.forEach(line => {
              line.checked = true;
              line.value.stops.forEach(stop => {
                let existMarker: boolean = false;
                this.markers.forEach(marker => {
                  if (marker.id == stop.id) {
                    let existMarkerLine: boolean = false;
                    marker.lines.forEach(marketLine => {
                      if (marketLine == line.id.shortName) {
                        existMarkerLine = true;
                      }
                    });
                    if (existMarkerLine == false) {
                      marker.lines.push(line.id.shortName);
                    }
                    existMarker = true;
                  }
                });
                if (existMarker == false) {
                  stop.lines = [line.id.shortName];
                  this.markers.push(stop);
                }
              });
            });
            this.updateClusterGroup();

            alert.dismiss().then(a => {
              this.dataProvider.loading = false;
              resolve();
            });
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
            this.dataProvider.loading = true;
            this.markers = [];
            data.forEach(line => {
              line.stops.forEach(stop => {
                let existMarker: boolean = false;
                this.markers.forEach(marker => {
                  if (marker.id == stop.id) {
                    let existMarkerLine: boolean = false;
                    marker.lines.forEach(marketLine => {
                      if (marketLine == line.shortName) {
                        existMarkerLine = true;
                      }
                    });
                    if (existMarkerLine == false) {
                      marker.lines.push(line.shortName);
                    }
                    existMarker = true;
                  }
                });
                if (existMarker == false) {
                  stop.lines = [line.shortName];
                  this.markers.push(stop);
                }
              });
            });
            this.updateClusterGroup();

            this.dataProvider.CheckBoxRoutes.forEach(checkBox => {
              data.includes(checkBox.id) ? checkBox.checked = true : checkBox.checked = false;
            });

            alert.dismiss().then(a => {
              this.dataProvider.loading = false;
              resolve();
            });
          }
        }]
      });
      alert.present();
      return true;
    });
  }

  // ####################    ROUTING THINGS  ########################
  async chooseRoute() {
    this.dataProvider.loading = true;
    if (this.planning.orig.latlng != undefined && this.planning.dest.latlng != undefined) {
      console.log(this.planning.orig.latlng);
      console.log(this.planning.dest.latlng);
      await this.dataProvider.planningRoute(this.planning.orig.latlng, this.planning.dest.latlng).then((resp) => {
        if (resp != null) {
          if (resp.error == undefined) {
            this.cancelRoute(false);
            this.routingControl.itenarary = [];
            this.routingControl.itenarary.showDetails = false;
            resp.plan.itineraries.forEach(itinerary => {
              itinerary.icon = 'ios-add-circle-outline';
              itinerary.duration = moment.unix(itinerary.duration).format("HH:mm:ss");
              itinerary.startTime = moment.unix((itinerary.startTime) / 1000).format("HH:mm");
              itinerary.endTime = moment.unix((itinerary.endTime) / 1000).format("HH:mm");
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
                  leg.direction = ("(" + (moment.unix((leg.startTime) / 1000).format("HH:mm")) + "h) Get bus on " + leg.routeLongName.split(":")[0] + " exit on " + leg.to.name);
                  leg.showDetails = false;
                  leg.icon = 'ios-add-circle-outline';
                } else {
                  leg.direction = "UNKNOWN"
                }
              });
              this.routingControl.itenarary.push(itinerary);
            });
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
    this.routingControl.markers.forEach(circle => {
      circle.addTo(this.map);
    });
    this.routingControl.polyline = new L.Polyline(this.routingControl.polyline.coords);
    this.routingControl.polyline.addTo(this.map);

    this.routingControl.itenarary = undefined;
    this.dataProvider.loading = false;

    this.planningBox.size = -100;
    this.planningBox.button = "up";
    console.log("bounds", this.routingControl.polyline.getBounds());
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

  async addToFavoriteRoute() {
    let alerte = await this.alertCtrl.create({
      title: "Make a description for your favorite route.",
      inputs: [
        {
          name: "desc",
          placeholder: "Type a description."
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: data => {
            console.log('Cancel clicked');
            alerte.dismiss();
          }
        },
        {
          text: 'Ok',
          handler: data => {
            if (data.desc == "" || data == undefined || data == null) {
              this.showAlert("You have to type a description", "ERROR");
            } else if (data.desc.length > 25) {
              this.showAlert("Your description exceed length (max.25)", "ERROR").then((a) => {
                this.addToFavoriteRoute();
              });
            } else {
              this.dataProvider.createFavoriteRoute(data.desc, this.planning.orig.latlng, this.planning.dest.latlng).then(res => {
                if (res) {
                  this.showToast("Your favorite route was saved.", 3000);
                } else {
                  this.showAlert("This favorite name already exists", "ERROR");
                }
              });
            }
          }
        }
      ]
    });
    alerte.present();
  }

  async showAlert(msg: string, title: string) {
    return new Promise((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: title,
        subTitle: msg,
        buttons: [{
          text: 'OK',
          role: 'ok',
          handler: data => {
            alert.dismiss();
          }
        }]
      });
      alert.present();
    })
  }

  toogleSearchBox() {
    if (this.searchControl == true) {
      this.searchControl = false; this.searchInput = ""; this.searchResults = []
    } else {
      this.searchControl = true;
    }
  }


  searchPlace() {
    if (this.searchInput.length > 2) {
      this.dataProvider.getSearchPlace(this.searchInput).then(res => {
        console.log("res", res);
        if (res.length > 0) {
          this.searchResults = res;
        } else {
          this.searchResults = [];
          this.searchResults.push({ "name": "NO RESULTS", "icon": "assets/img/error.png" });
        }
        console.log("listPlaces", this.searchResults);
      });
    } else {
      this.searchResults = [];
    }
  }

  showPlace(res: any) {
    if (this.map.hasLayer(this.searchMarker)) {
      this.map.removeLayer(this.searchMarker);
    }

    this.createBallon("<h6>" + res.name + "</h6><hr>");

    this.searchMarker = L.marker(res.geometry.location, {
      draggable: false, icon:
      L.icon({
        iconUrl: res.icon,
        iconSize: [35, 35],
        popupAnchor: [0, -15]
      })
    })
      .bindPopup(this.container)
      .addTo(this.map)
      .openPopup();

    let self = this;
    L.DomEvent.on(this.startBtn, 'click', () => {
      self.planningDestination(res.geometry.location.lat, res.geometry.location.lng);
    });

    L.DomEvent.on(this.destBtn, 'click', () => {
      self.planningOrigin(res.geometry.location.lat, res.geometry.location.lng);
    });

    this.map.panTo([res.geometry.location.lat, res.geometry.location.lng]);

    this.toogleSearchBox();
  }
}
