import { Component, Injectable, ElementRef, trigger, keyframes, animate, transition, style, NgZone } from '@angular/core';

import { Platform, AlertController, NavController, NavParams, ToastController } from 'ionic-angular';

import { Http } from '@angular/http';

import { Geolocation } from '@ionic-native/geolocation';

import { FabContainer } from 'ionic-angular';

import { DatabaseProvider } from '../../providers/database-provider';

import { DataProvider } from '../../providers/data-provider';

import { TranslateService } from '@ngx-translate/core';

import 'rxjs/add/operator/map';
import 'leaflet';
import 'leaflet.markercluster';
import 'leaflet-easybutton';
import 'polyline-encoded';
import 'moment';

declare var L: any;
declare var moment: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  animations: [
    trigger('right', [
      transition('inactive => active', animate(300, keyframes([
        style({ transform: 'none', offset: 0 }),
        style({ transform: 'translate3d(-100%, 0, 0)', offset: 0.5 }),
        style({ transform: 'translate3d(100%, 0, 0)', offset: 0.5 }),
        style({ transform: 'none', offset: 1 }),
      ]))),
    ]),
    trigger('left', [
      transition('inactive => active', animate(300, keyframes([
        style({ transform: 'none', offset: 0 }),
        style({ transform: 'translate3d(100%, 0, 0)', offset: 0.5 }),
        style({ transform: 'translate3d(-100%, 0, 0)', offset: 0.5 }),
        style({ transform: 'none', offset: 1 }),
      ]))),
    ]),
  ]
})
@Injectable()
export class HomePage {

  public stops: any; // PARAGENS
  public markersCluster: any; // CLUSTER
  private markers: any = []; // CLUSTER ON MAP
  private routingControl: any; //CONTROLER OF ROUTING


  private map: any;
  private mapSatellite: any;
  private mapStreet: any;
  private streetMap: boolean = true;
  private currentPosition: any;
  public debug: any;
  private searchControl: boolean = false;
  private searchInput: string = "";
  private searchResults: any = [];
  private searchMarker: any;
  private markerBallonOpened: boolean = false;

  private allowLocation = false;

  public planning: any = [];
  public planningBox: any = [];
  public planningBallonOpened: boolean = false;
  public route: any;
  public container: any;
  public startBtn: any;
  public favBtn: any;
  public destBtn: any;
  public favMarker: any;

  public navigationBox: boolean = false;
  public navigateControl: any;
  public navigateAnimationLeft: string;
  public navigateAnimationRight: string;

  private iconBus = L.icon({
    iconUrl: 'assets/img/busStop.png',
    iconSize: [50, 50],
    //iconAnchor: [-50, 45],
    popupAnchor: [0, -35]
  });

  private iconFav = L.icon({
    iconUrl: 'assets/img/starFull.png',
    iconSize: [75, 75],
    //iconAnchor: [40, 65],
    popupAnchor: [-140, -40],
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
    public platform: Platform, public zone: NgZone, public translate: TranslateService, private elementRef: ElementRef
  ) {
    translate.setDefaultLang('en');
    let browserLang = translate.getBrowserLang();
    this.translate.use(browserLang.match(/en|pt/) ? browserLang : 'en');
    this.planning.orig = [];
    this.planning.dest = [];
    this.routingControl = [];
    this.currentPosition = [];
    this.planningBox.size = 50;
    this.planningBox.button = "down";
    this.streetMap = true;
  }

  toogleLanguage() {
    if (this.translate.currentLang == "en") {
      this.translate.use("pt");
    } else {
      this.translate.use("en");
    }
  }


  async ionViewWillEnter() {
    this.dataProvider.loading = true;
    if (this.map != undefined) {
      this.map._onResize();
    }
    // ROUTE
    if (this.dataProvider.getFavoriteRoute() != undefined) {
      this.cancelRoute(true);
      let origin = this.dataProvider.getFavoriteRoute().origin.split(',');
      let destination = this.dataProvider.getFavoriteRoute().destination.split(',');
      return new Promise((resolve, reject) => {
        this.planningOrigin(origin[0], origin[1]).then(a => {
          this.planningDestination(destination[0], destination[1]).then(b => {
            var group = new L.featureGroup([L.marker([origin[0], origin[1]]), L.marker([destination[0], destination[1]])]);
            this.map.fitBounds(group.getBounds(), { padding: [100, 100] });
            this.dataProvider.setFavoriteRoute(undefined);
            resolve(b);
          });
        })
      })
        .then((b) => {
          this.chooseRoute();
        });
    }
    // PLACE/MARKER  
    if (this.dataProvider.getFavoritePlace() != undefined) {
      if (this.map.hasLayer(this.favMarker)) {
        this.favMarker.remove();
      }
      this.cancelRoute(true);
      let coords = {
        "latlng": {
          "lat": this.dataProvider.getFavoritePlace().coords.split(',')[0],
          "lng": this.dataProvider.getFavoritePlace().coords.split(',')[1]
        }
      };
      this.planningBallonOpened = true;
      this.createBallon("<h6>" + this.dataProvider.getFavoritePlace().description + "</h6><hr>", true);
      this.favMarker = L.marker(coords.latlng, { draggable: false, icon: this.iconFav })
        .bindPopup(this.container)
        .addTo(this.map)
        .openPopup();

      let self = this;
      L.DomEvent.on(this.startBtn, 'click', function () {
        self.planningOrigin(coords.latlng.lat, coords.latlng.lng);
      });

      L.DomEvent.on(this.destBtn, 'click', function () {
        self.planningDestination(coords.latlng.lat, coords.latlng.lng);
      });
      this.map.setView([coords.latlng.lat, coords.latlng.lng]);
      this.dataProvider.setFavoritePlace(undefined);

    }
    this.dataProvider.loading = false;
  }


  async ngOnInit() {
    this.platform.ready().then(() => {
      this.dataProvider.getDataFromServer().then((resp) => {
        this.dataProvider.innit = 100;
        this.stops = resp;
        this.initMap();
        this.dataProvider.populateCheckBoxs();

        //Localization
        let self = this;
        this.map.on('locationerror', function (e) {
          self.allowLocation = false;
          this.translate.get("MISC.DENIED_LOCATION").subscribe((res: string) => { self.showToast(res, 5000); });
        });

        this.getCurrentLocation();
        let watch = this.geolocation.watchPosition()
        watch.subscribe((data) => {
          if (data.coords !== undefined) {
            this.updateCurrentLocation(data.coords);
          }
        });
      });
    });
  }


  initMap(): void {
    this.mapStreet = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Application powered by RD&RP :)',
      maxZoom: 20,
      minZoom: 10,
      id: 'streets-v10',
      accessToken: 'pk.eyJ1IjoicmNkZCIsImEiOiJjajBiMHBsbWgwMDB2MnFud2NrODRocXNjIn0.UWZO6WuB6DPU6AMWt5Mr9A'
    });
    this.mapSatellite = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Application powered by RD&RP :)',
      maxZoom: 20,
      minZoom: 10,
      id: 'satellite-streets-v10',
      accessToken: 'pk.eyJ1IjoicmNkZCIsImEiOiJjajBiMHBsbWgwMDB2MnFud2NrODRocXNjIn0.UWZO6WuB6DPU6AMWt5Mr9A'
    });

    this.map = L.map('mapid', { zoomControl: false })
      .addLayer(this.mapStreet)
      .setView([39.7460465, -8.8059954], 14);
    this.map.locate({ setView: true, maxZoom: 15 });

    this.markersCluster = L.markerClusterGroup();

    this.currentPosition.marker = L.marker(this.map.getCenter());
    this.currentPosition.circle = L.circle(this.map.getCenter());
    if (this.allowLocation) {
      this.currentPosition.marker.addTo(this.map);
      this.currentPosition.circle.addTo(this.map);
    }

    let self = this;
    this.map.on('click', function (e) {
      if (!self.planningBallonOpened && !self.markerBallonOpened) {
        self.planningBallonOpened = true;
        self.translate.get('MAP.TRAVEL_POINT').subscribe((res: string) => {
          self.createBallon("<h6>" + res + "</h6><hr>");
          L.popup()
            .setContent(self.container)
            .setLatLng(e.latlng)
            .openOn(self.map);
          self._onClickMap(e);
        });

      } else {
        self.planningBallonOpened = false;
        self.markerBallonOpened = false;
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
  _onClickMap(e) {
    let self = this;
    L.DomEvent.on(this.startBtn, 'click', function () {
      self.planningOrigin(e.latlng.lat, e.latlng.lng);
    });

    L.DomEvent.on(this.favBtn, 'click', function () {
      let title, placeholder, errorTxt: string;
      self.translate.get('MAP.FAVORITE_PLACE_ALERT.TITLE').subscribe((res: string) => { title = res });
      self.translate.get('MAP.FAVORITE_PLACE_ALERT.PLACEHOLDER').subscribe((res: string) => { placeholder = res });
      self.translate.get('MAP.ERROR').subscribe((res: string) => { errorTxt = res });
      let alerte = self.alertCtrl.create({
        title: title,
        inputs: [
          {
            name: "desc",
            placeholder: placeholder
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
                self.translate.get('MAP.FAVORITE.ERROR_NO_TEXT').subscribe((res: string) => { self.showAlert(res, errorTxt); });
              } else if (data.desc.length > 25) {
                self.translate.get('MAP.FAVORITE.ERROR_LENGTH').subscribe((res: string) => { self.showAlert(res, errorTxt); });
              } else {
                self.dataProvider.createFavoritePlace(data.desc, e.latlng.lat + "," + e.latlng.lng).then(res => {
                  if (res) {
                    self.translate.get('MAP.FAVORITE.SAVED').subscribe((res: string) => { self.showToast(res, 3000); });
                    self.translate.get('MAP.TRAVEL_POINT').subscribe((res: string) => {
                      self.createBallon("<h6>" + res + "</h6><hr>", true);
                    });
                    L.popup()
                      .setContent(self.container)
                      .setLatLng(e.latlng)
                      .openOn(self.map);

                    self._onClickMap(e);
                  } else {
                    self.translate.get('MAP.FAVORITE.ERROR_FAV_EXIST').subscribe((res: string) => { self.showAlert(res, errorTxt); });
                  }
                });
              }
            }
          }
        ]
      });
      alerte.present();
    });

    L.DomEvent.on(this.destBtn, 'click', function () {
      self.planningDestination(e.latlng.lat, e.latlng.lng);
    });
  }

  createBallon(text: string, fav: boolean = false) {
    this.container = L.DomUtil.create('div', 'container');
    this.container.innerHTML = text;
    this.translate.get('MAP.BTN_NAV_START').subscribe((res: string) => {
      this.startBtn = this.createButton(res, this.container);
    });
    this.favBtn = this.createButton('<div class="btnNavFav"><img src="assets/img/' + (fav ? "starFull" : "starEmpty") + '.png" /></div>', this.container);
    this.translate.get('MAP.BTN_NAV_DEST').subscribe((res: string) => {
      this.destBtn = this.createButton(res, this.container);
    });
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
      } else {
        let title, subtitle: string;
        this.translate.get('MAP.ATTENTION').subscribe((res: string) => { title = res; });
        this.translate.get('MAP.SELECT_ON_LINE').subscribe((res: string) => { subtitle = res; });
        let alert = await this.alertCtrl.create({
          title: title,
          subTitle: subtitle,
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
      this.translate.get('MAP.CANT_CALCULE_POSITION').subscribe((res: string) => { this.showToast(res, 3000); });
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

    toast.present();
  }

  async planningOrigin(lat: any, lng: any) {      // ROUTING OF THE MAP
    let originTxt, originInTxt: string;
    return new Promise((resolve, reject) => {
      this.map.removeLayer(this.planning.orig);
      this.cancelRoute(false);
      this.navigateControl = [];
      this.navigationBox = false;
      this.translate.get('MAP.ORIGIN').subscribe((res: string) => { originTxt = res });
      this.translate.get('MAP.ORIGIN_IN').subscribe((res: string) => { originInTxt = res });
      this.planning.orig = L.marker([lat, lng], { draggable: true, icon: this.iconStart })
        .bindPopup(originTxt)
        .addTo(this.map)
        .on('dragend', (e) => {
          this.planningBox.size = 50;
          this.planningBox.button = "down";
          this.cancelRoute(false);
          this.planning.orig.setLatLng([e.target._latlng.lat, e.target._latlng.lng]);
          this.dataProvider.getReverseGeoCoder(e.target._latlng.lat, e.target._latlng.lng).then((resp) => {
            this.planning.orig.text = resp;
            this.planning.orig.bindPopup(originInTxt + resp);
            this.planning.orig.latlng = (e.target._latlng.lat + ',' + e.target._latlng.lng);
          });
        });

      this.dataProvider.getReverseGeoCoder(lat, lng).then((resp) => {
        this.planning.orig.text = resp;
        this.planning.orig.bindPopup(originInTxt + resp);
      });
      this.planning.orig.latlng = (lat + ',' + lng);
      this.map.closePopup();
      resolve(this.planning.orig);
    }).then(() => {
      return this.planning.orig;
    });
  }
  async planningDestination(lat: any, lng: any) {
    let originTxt, originInTxt, destinationTxt, destinationInTxt: string;
    return new Promise((resolve, reject) => {
      this.map.removeLayer(this.planning.dest);
      this.cancelRoute(false);
      this.navigateControl = [];
      this.navigationBox = false;
      this.translate.get('MAP.ORIGIN').subscribe((res: string) => { originTxt = res });
      this.translate.get('MAP.ORIGIN_IN').subscribe((res: string) => { originInTxt = res });
      this.translate.get('MAP.DESTINATION').subscribe((res: string) => { destinationTxt = res });
      this.translate.get('MAP.DESTINATION_IN').subscribe((res: string) => { destinationInTxt = res });

      this.planning.dest = L.marker([lat, lng], { draggable: true, icon: this.iconDest })
        .bindPopup(destinationTxt)
        .addTo(this.map)
        .on('dragend', (e) => {
          this.planningBox.size = 50;
          this.planningBox.button = "down";
          this.cancelRoute(false);
          this.planning.dest.setLatLng([e.target._latlng.lat, e.target._latlng.lng]);
          this.dataProvider.getReverseGeoCoder(e.target._latlng.lat, e.target._latlng.lng).then((resp) => {
            this.planning.dest.text = resp;
            this.planning.dest.bindPopup(destinationInTxt + resp);
            this.planning.dest.latlng = (e.target._latlng.lat + ',' + e.target._latlng.lng);
          });
        });

      if (this.planning.orig.latlng == undefined && this.dataProvider.getFavoriteRoute() == undefined) {
        this.dataProvider.getReverseGeoCoder(this.currentPosition.marker.getLatLng().lat, this.currentPosition.marker.getLatLng().lng).then((resp) => {
          this.planning.orig = L.marker([this.currentPosition.marker.getLatLng().lat, this.currentPosition.marker.getLatLng().lng], { draggable: true, icon: this.iconStart })
            .bindPopup(originTxt)
            .addTo(this.map)
            .on('dragend', (e) => {
              this.planningBox.size = 50;
              this.planningBox.button = "down";
              this.planning.orig.setLatLng([e.target._latlng.lat, e.target._latlng.lng]);
              this.dataProvider.getReverseGeoCoder(e.target._latlng.lat, e.target._latlng.lng).then((resp) => {
                this.planning.orig.text = resp;
                this.planning.orig.bindPopup(originInTxt + resp);
                this.planning.orig.latlng = (e.target._latlng.lat + ',' + e.target._latlng.lng);
              });
            });
          this.planning.orig.text = resp;
          this.planning.orig.bindPopup(originInTxt + resp);
          this.planning.orig.latlng = (this.currentPosition.marker.getLatLng().lat + ',' + this.currentPosition.marker.getLatLng().lng);
          console.log(this.planning.orig.latlng);
        });
      }

      this.dataProvider.getReverseGeoCoder(lat, lng).then((resp) => {
        this.planning.dest.bindPopup(destinationInTxt + resp);
        this.planning.dest.text = resp;
      });
      this.planning.dest.latlng = (lat + ',' + lng);

      this.map.closePopup();
      resolve(this.planning.dest);
    }).then(() => {
      return this.planning.dest;
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
    var radius = (data.accuracy / 2).toFixed(0);
    var currentPosition = [data.latitude, data.longitude];
    this.currentPosition.marker.setLatLng(currentPosition);
    let msg1, msg2: string;
    this.translate.get("MAP.CURRENT_POSITION_RADIUS_1").subscribe((res: string) => { msg1 = res });
    this.translate.get("MAP.CURRENT_POSITION_RADIUS_2").subscribe((res: string) => { msg2 = res });
    this.currentPosition.marker.bindPopup(msg1 + radius + msg2);
    this.currentPosition.circle.setLatLng(currentPosition);
    if (!this.map.hasLayer(this.currentPosition)) {
      this.currentPosition.marker.addTo(this.map);
      this.currentPosition.circle.addTo(this.map);
    }
  }

  updateClusterGroup() {
    this.map.removeLayer(this.markersCluster);
    this.markersCluster = new L.markerClusterGroup({ maxClusterRadius: 50, removeOutsideVisibleBounds: true, disableClusteringAtZoom: 17 });
    if (this.markers.length != 0) {
      this.markers.forEach(stop => {
        if (this.allowLocation == true) {
          stop.meters = this.currentPosition.marker.getLatLng().distanceTo([stop.lat, stop.lon]);
          stop.distance = this.getDistance(stop.meters);
          let distanceTxt: string;
          this.translate.get("MAP.DISTANCE").subscribe((res: string) => { distanceTxt = res });
          stop.message = '<img class="distanceImg" src="assets/img/iconDistance.png" />' + distanceTxt + stop.distance;
        } else {
          stop.message = '';
        }
        let popUp = '<div class="header"><div class="stopImg"><img src="assets/img/android-bus.png" /></div><div class="stopLabel"><b>' + stop.id.split(":")[1] + " - " + stop.name + '</b></div></div><hr>';
        let lineTxt, linesTxt: string;
        this.translate.get("MAP.LINES").subscribe((res: string) => { linesTxt = res });
        this.translate.get("MAP.LINE").subscribe((res: string) => { lineTxt = res });
        popUp += stop.message + '<hr> <div class="linesDiv"> <div class="labelLines"><b>' + linesTxt + ':</b></div>';
        stop.lines.forEach(line => {
          popUp += '<br> <div class="lineItem"> <img class="lineImg" src="assets/img/iconLines.png" />' + lineTxt + line + "</div>";
        });
        popUp += "</div>"
        let popUpOptions =
          {
            'className': 'custom'
          }


        this.createBallon(popUp + "<hr>", (stop.favorite ? true : false));
        let self = this;
        let marker = new L.marker([stop.lat, stop.lon], { icon: this.iconBus, id: stop.id, meters: stop.meters, message: stop.message, title: stop.name })
          .bindPopup(this.container, popUpOptions)
          .on('click', function (e) {
            self.markerBallonOpened = true;
            this.openPopup();
          })
          .addTo(this.markersCluster);

        this._onBallonMarker(marker, stop, popUp, popUpOptions);

      });
      this.map.fitBounds(this.markersCluster.getBounds());
    }
    this.map.addLayer(this.markersCluster);
    this.map.closePopup();
  }

  _onBallonMarker(marker, stop, popUp, popUpOptions) {
    let self = this;
    L.DomEvent.on(this.favBtn, 'click', function () {
      stop.favorite = (stop.favorite ? false : true);
      if (stop.favorite) {
        self.dataProvider.createFavoritePlace(stop.id.split(":")[1] + " - " + stop.name, (stop.lat + "," + stop.lon)).then(res => {
          if (res) {
            this.translate.get("MAP.FAVORITE.SAVED").subscribe((res: string) => { self.showToast(res, 3000); });
            self.createBallon(popUp + "<hr>", stop.favorite);
            marker._popup.setContent(self.container);
            self._onBallonMarker(marker, stop, popUp, popUpOptions);
          } else {
            this.translate.get("MAP.FAVORITE.ERROR_FAV_EXIST").subscribe((res: string) => { self.showToast(res, 3000); });
            return;
          }
        });
      } else {
        let fav = { 'description': stop.id.split(":")[1] + " - " + stop.name, 'coords': (stop.lat + "," + stop.lon) };
        self.dataProvider.removeFavoritePlace(fav).then(res => {
          this.translate.get("MAP.FAVORITE.DELETED").subscribe((res: string) => { self.showToast(res, 3000); });
          self.createBallon(popUp + "<hr>", stop.favorite);
          marker._popup.setContent(self.container);
          self._onBallonMarker(marker, stop, popUp, popUpOptions);
        }).catch(() => {
          this.translate.get("MAP.FAVORITE.ERROR_FAV_DELETING").subscribe((res: string) => { self.showToast(res, 3000); });
          stop.favorite = true;
        });
      }


    });
    L.DomEvent.on(this.startBtn, 'click', function () {
      self.planningOrigin(stop.lat, stop.lon);
    });

    L.DomEvent.on(this.destBtn, 'click', function () {
      self.planningDestination(stop.lat, stop.lon);
    });
  }

  async showBusLines(fab: FabContainer = null) {
    let title, selectAllTxt, selectNoneTxt: string;
    fab != null ? fab.close() : '';

    this.translate.get("MAP.BUSLINES.TITLE").subscribe((res: string) => { title = res });
    this.translate.get("MAP.BUSLINES.SELECT_ALL").subscribe((res: string) => { selectAllTxt = res });
    this.translate.get("MAP.BUSLINES.SELECT_NONE").subscribe((res: string) => { selectNoneTxt = res });
    return new Promise((resolve, reject) => {
      let alert = this.alertCtrl.create({
        title: title,
        inputs: this.dataProvider.CheckBoxRoutes,
        buttons: [{
          text: selectAllTxt,
          handler: data => {
            this.dataProvider.loading = true;
            this.markers = [];
            this.dataProvider.CheckBoxRoutes.forEach(line => {
              line.checked = true;
              line.value.stops.forEach(stop => {
                this.dataProvider.getAllFavoritesPlaces().forEach(fav => {
                  let stopName = (stop.id.split(":")[1] + " - " + stop.name).replace(/'/g, "");
                  if (fav.description == stopName) {
                    stop.favorite = true;
                  }
                });
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
          text: selectNoneTxt,
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
            console.log("planningRoute", resp);
            this.routingControl.itenarary = [];
            this.routingControl.itenarary.showDetails = false;
            resp.plan.itineraries.forEach(itinerary => {
              itinerary.icon = 'ios-add-circle-outline';
              itinerary.duration = moment.unix(itinerary.duration).format("mm");
              itinerary.startTime = moment.unix((itinerary.startTime) / 1000).format("HH:mm");
              itinerary.endTime = moment.unix((itinerary.endTime) / 1000).format("HH:mm");
              itinerary.walkDistance = this.getDistance(itinerary.walkDistance);
              itinerary.sequence = [];
              itinerary.legs.forEach(leg => {
                leg.distance = this.getDistance(leg.distance);
                leg.duration = (leg.duration / 60).toFixed(0);
                if (leg.mode == "WALK") {
                  let dist: number = 0;
                  leg.steps.forEach(step => {
                    dist += step.distance;
                    step.distance = this.getDistance(step.distance);
                    step.direction = [];
                    step.direction.push({ name: "Go " + step.absoluteDirection + " on " + step.streetName, distance: step.distance });
                    step.showDetails = false;
                    leg.icon = 'ios-add-circle-outline';
                  });
                  itinerary.sequence.push({ walk: { distance: this.getDistance(dist) } });
                } else if (leg.mode == "BUS") {
                  itinerary.sequence.push({ bus: { number: leg.route, color: "#" + leg.routeColor, time: leg.duration } });
                  leg.routeColor = "#" + leg.routeColor;
                  leg.direction = [];
                  leg.direction.push({ time: (moment.unix((leg.from.arrival) / 1000).format("HH:mm")), name: leg.from.stopCode + " - " + leg.from.name });
                  leg.intermediateStops.forEach(stops => {
                    leg.direction.push({ time: (moment.unix((stops.departure) / 1000).format("HH:mm")), name: stops.stopCode + " - " + stops.name });
                  });
                  leg.direction.push({ name: leg.to.stopCode + " - " + leg.to.name, time: (moment.unix((leg.to.arrival) / 1000).format("HH:mm")) });
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
          this.translate.get("MISC.NO_NETWORK").subscribe((res: string) => { this.showToast(res, 5000); });
        }
      });
    } else {
      this.translate.get("MAP.ERROR_SELECT_BOTH_POINTS").subscribe((res: string) => { this.showToast(res, 3000); });
    }
    this.dataProvider.loading = false;
  }

  showRoute(route) {
    this.dataProvider.loading = true;
    this.navigationBox = true;
    this.planning.orig.dragging.disable();
    this.planning.dest.dragging.disable();
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

    let takeBusTxt, leftBusTxt: string;
    this.translate.get("MAP.TAKE_BUS").subscribe((res: string) => { takeBusTxt = res });
    this.translate.get("MAP.LEFT_BUS").subscribe((res: string) => { leftBusTxt = res });

    route.legs.forEach(leg => {
      this.routingControl.polyline.coords = this.routingControl.polyline.coords.concat(L.Polyline.fromEncoded(leg.legGeometry.points).getLatLngs());
      if (leg.mode == "BUS") {
        this.routingControl.markers.push(L.circle([leg.from.lat, leg.from.lon], { radius: 20 }).bindPopup(takeBusTxt + leg.from.name));
        this.routingControl.markers.push(L.circle([leg.to.lat, leg.to.lon], { radius: 20 }).bindPopup(leftBusTxt + leg.to.name));
      } else {
        leg.steps.forEach(step => {
          L.Polyline.fromEncoded(leg.legGeometry.points).getLatLngs().forEach(element => {
            this.routingControl.markers.push(L.circle([step.lat, step.lon], { radius: 5 }).bindPopup(step.direction));
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

    this.planningBox.size = -100;
    this.planningBox.button = "up";

    this.map.fitBounds(this.routingControl.polyline.getBounds(), { padding: [50, 50] });

    this.showNavigate(route);
    this.dataProvider.loading = false;
  }

  showNavigate(route) {
    this.navigateControl.sequence = [];
    this.navigateControl.index = 0;
    route.legs.forEach(leg => {
      if (leg.mode == "WALK") {
        leg.steps.forEach(step => {
          this.navigateControl.sequence.push({ mode: leg.mode, step: step });
        });
      }
      if (leg.mode == "BUS") {
        leg.intermediateStops.unshift(leg.from);
        leg.intermediateStops.push(leg.to);
        this.navigateControl.sequence.push({
          mode: leg.mode, from: leg.from, step: leg.intermediateStops, route: leg.route, routeColor: leg.routeColor,
          routeLongName: leg.routeLongName, duration: leg.duration, time: (moment.unix((leg.from.arrival) / 1000).format("HH:mm"))
        });
        this.navigateControl.sequence.push({
          mode: leg.mode, to: leg.to, step: leg.intermediateStops, route: leg.route, routeColor: leg.routeColor,
          routeLongName: leg.routeLongName, duration: leg.duration, time: (moment.unix((leg.to.arrival) / 1000).format("HH:mm"))
        });
      }
    });
    console.log("navigate", this.navigateControl);
    this.navigatePanTo();
  }

  navigateLeft() {
    if (this.navigateControl.index > 0) {
      this.navigateControl.index--;
      this.navigateAnimationLeft = "active";
      this.navigatePanTo();
    }
  }
  navigateRight() {
    if (this.navigateControl.index < this.navigateControl.sequence.length - 1) {
      this.navigateControl.index++;
      this.navigateAnimationRight = "active";
      this.navigatePanTo();
    }
  }

  resetAnimationLeft() {
    this.zone.run(() => {
      this.navigateAnimationLeft = "inactive";
    });
  }
  resetAnimationRight() {
    this.zone.run(() => {
      this.navigateAnimationRight = "inactive";
    });
  }



  navigatePanTo() {
    let nav = this.navigateControl.sequence[this.navigateControl.index];
    let zoom = 19;
    let options = { paddingBottomRight: [0, 200] };
    let latLng = [0, 0];
    let content: string = "";
    if (nav.mode == "WALK") {
      latLng = [nav.step.lat,
      nav.step.lon];
      content = nav.step.relativeDirection + " on " + nav.step.streetName;
      this.map.flyTo(latLng, zoom, options)
    }
    if (nav.mode == "BUS") {
      let takeBusTxt, leftBusTxt: string;
      this.translate.get("MAP.TAKE_BUS").subscribe((res: string) => { takeBusTxt = res });
      this.translate.get("MAP.LEFT_BUS").subscribe((res: string) => { leftBusTxt = res });
      if (nav.to) {
        latLng = [nav.to.lat,
        nav.to.lon];
        content = leftBusTxt + nav.to.name;
        this.map.flyTo(latLng, zoom, options);
      }
      if (nav.from) {
        latLng = [nav.from.lat,
        nav.from.lon];
        content = takeBusTxt + nav.from.name;
        this.map.flyTo(latLng, zoom, options);
      }
    }

    this.navigateControl.marker = L.popup()
      .setLatLng(latLng)
      .setContent(content)
      .openOn(this.map);
    this.navigateControl.fitView = true;
  }

  toogleRoute() {
    if (this.navigateControl.fitView) {
      this.map.fitBounds(this.routingControl.polyline.getBounds(), { paddingTopLeft: [0, 20], paddingBottomRight: [0, 200] });
      this.navigateControl.fitView = false;
    } else {
      this.navigatePanTo();
    }
  }
  zoomStop(stop) {
    let zoom = 19;
    let options = { paddingBottomRight: [0, 200] };
    this.navigateControl.marker = L.popup()
      .setLatLng([stop.lat, stop.lon])
      .setContent(stop.name)
      .openOn(this.map);
    this.map.flyTo([stop.lat, stop.lon], zoom, options);
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
      this.navigateControl = [];
      this.navigationBox = false;
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
      this.streetMap = true;
    } else {
      this.map.removeLayer(this.mapStreet);
      this.map.addLayer(this.mapSatellite);
      this.streetMap = false;
    }
  }

  async addToFavoriteRoute() {
    let titleTxt, placeholderTxt, errorTxt: string;

    this.translate.get("MAP.FAVORITE_ROUTE_ALERT.TITLE").subscribe((res: string) => { titleTxt = res });
    this.translate.get("MAP.FAVORITE_ROUTE_ALERT.PLACEHOLDER").subscribe((res: string) => { placeholderTxt = res });
    this.translate.get('MAP.ERROR').subscribe((res: string) => { errorTxt = res });
    let alerte = await this.alertCtrl.create({
      title: titleTxt,
      inputs: [
        {
          name: "desc",
          placeholder: placeholderTxt
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
              this.translate.get("MAP.FAVORITE.ERROR_NO_TEXT").subscribe((res: string) => { this.showAlert(res, errorTxt); });
            } else if (data.desc.length > 25) {
              this.translate.get("MAP.FAVORITE.ERROR_LENGTH").subscribe((res: string) => { this.showAlert(res, errorTxt); });
            } else {
              this.dataProvider.createFavoriteRoute(data.desc, this.planning.orig.latlng, this.planning.dest.latlng).then(res => {
                if (res) {
                  this.translate.get("MAP.FAVORITE.SAVED").subscribe((res: string) => { this.showToast(res, 5000); });
                } else {
                  this.translate.get("MAP.FAVORITE.ERROR_FAV_EXIST").subscribe((res: string) => { this.showAlert(res, errorTxt); });
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
    if (this.dataProvider.hasNetwork) {
      if (this.searchInput.length > 2) {
        this.dataProvider.getSearchPlace(this.searchInput).then(res => {
          console.log("res", res);
          if (res.length > 0) {
            this.searchResults = res;
          } else {
            this.searchResults = [];
            let noResultsTxt: string;
            this.translate.get("MISC.NO_RESULTS").subscribe((res: string) => { noResultsTxt = res });
            this.searchResults.push({ "name": noResultsTxt, "icon": "assets/img/error.png" });
          }
          console.log("listPlaces", this.searchResults);
        });
      } else {
        this.searchResults = [];
      }
    }
  }

  showPlace(res: any) {
    if (this.map.hasLayer(this.searchMarker)) {
      this.map.removeControl(this.searchMarker);
      this.searchMarker.remove();
    }

    let fav = this.dataProvider.getAllFavoritesPlaces();
    for (let i = 0; i < fav.length; i++) {
      res.name_r = (res.name).replace(/'/g, "");
      if (fav[i].description == res.name_r) {
        res.favorite = true;
      }
    }

    this.createBallon("<h6>" + res.name + "</h6><hr>", (res.favorite ? true : false));

    this.searchMarker = L.marker(res.geometry.location, {
      draggable: false, icon:
      L.icon({
        iconUrl: res.icon,
        iconSize: [35, 35],
        popupAnchor: [0, -15]
      }),
      favorite: res.favorite
    })
      .bindPopup(this.container)
      .addTo(this.map)
      .openPopup()

    this.markerBallonOpened = true;

    this._onShowPlace(res);


    this.map.panTo([res.geometry.location.lat, res.geometry.location.lng]);

    this.toogleSearchBox();
  }

  _onShowPlace(res) {
    let self = this;
    L.DomEvent.on(this.startBtn, 'click', () => {
      self.planningOrigin(res.geometry.location.lat, res.geometry.location.lng);
    });

    L.DomEvent.on(this.favBtn, 'click', () => {
      res.favorite = (res.favorite ? false : true);
      self.createBallon("<h6>" + res.name + "</h6><hr>", res.favorite);
      if (res.favorite) {
        self.dataProvider.createFavoritePlace(res.name, (res.geometry.location.lat + "," + res.geometry.location.lng)).then(res => {
          if (res) {
            this.translate.get("MAP.FAVORITE.SAVED").subscribe((res: string) => { this.showToast(res, 3000); });
          }
        });
      } else {
        self.dataProvider.removeFavoritePlace({ description: res.name, coords: (res.geometry.location.lat + "," + res.geometry.location.lng) }).then(res => {
          this.translate.get("MAP.FAVORITE.DELETED").subscribe((res: string) => { this.showToast(res, 3000); });
        });
      }

      self.searchMarker._popup.setContent(self.container);

      this._onShowPlace(res);

    });

    L.DomEvent.on(this.destBtn, 'click', () => {
      self.planningDestination(res.geometry.location.lat, res.geometry.location.lng);
    });
  }
}
