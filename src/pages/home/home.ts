import { Component } from '@angular/core';

import { AlertController, NavController, ToastController } from 'ionic-angular';

import { Http, Response } from '@angular/http';

import { Geolocation } from 'ionic-native';

// import { busLines } from 'busLines';

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

  private stops: any;
  private routes: any;
  private map: any;
  private currentPosition: any;
  private currentPositionCircle: any;
  public debug: any;
  private markersCluster: any;
  private markers = {};
  private controlSearch: any;
  private allowLocation = false;
  private CheckBoxRoutes: any = [];

  private iconBus = L.icon({
    iconUrl: 'assets/icon/android-bus.png',
    iconSize: [25, 25]
  });


  constructor(public navCtrl: NavController, public toastCtrl: ToastController, public http: Http, public alertCtrl: AlertController) {
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

    /*
        // Listen to cache hits and misses and spam the console
        this.tiles.on('tilecachehit', function (ev) {
          console.log('Cache hit: ', ev.url);
        });
        this.tiles.on('tilecachemiss', function (ev) {
          console.log('Cache miss: ', ev.url);
        });
        this.tiles.on('tilecacheerror', function (ev) {
          console.log('Cache error: ', ev.tile, ev.error);
        });
    */


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
  }

  getBusLines() {
    return this.http.get(`http://194.210.216.191/otp/routers/default/index/routes`)
      .map((res: Response) => res.json()).subscribe(a => {
        this.routes = a;
        console.log("BusLines:")
        console.dir(this.routes);
        this.getStationsFromBusLines();
        this.routes.forEach(rota => {
          this.CheckBoxRoutes.push({ id: rota.id, name: rota.id, label: rota.longName, type: "checkbox", value: rota.id, checked: false });
        });
        // this.CheckBoxRoutes.sort(function (a, b) { return (a.longName > b.longName) ? 1 : ((b.longName > a.longName) ? -1 : 0); });
        //this.updateClusterGroup();
        //this.getCurrentLocation();
      });
  }

  getStationsFromBusLines() {

    this.routes.forEach(route => {
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
    this.controlSearch = new L.Control.Search({
      container: 'findbox',
      position: 'topleft',
      placeholder: 'Search...',
      layer: this.markersCluster,
      initial: false,
      zoom: 20,
      marker: false
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
  /*
    updateClusterGroup(stop: any) {
      /* this.markersCluster = L.markerClusterGroup({ maxClusterRadius: 100, removeOutsideVisibleBounds: true });
   
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
      let marker = new L.marker([stop.lat, stop.lon], { icon: this.iconBus, id: stop.id, title: stop.name })
        .bindPopup(popUp, popUpOptions)
        .on('click', function (e) {
          this.openPopup();
        });
  
      /*});
  
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
      return marker;
    }*/

  showBusLines() {
    let alert = this.alertCtrl.create({
      title: 'Filter Bus Lines',
      inputs: this.CheckBoxRoutes,
      buttons: [{
        text: 'Ok',
        handler: data => {
          for (let marker in this.markers) {
            this.map.removeLayer(this.markers[marker]);
          }
          data.forEach(line => {
            this.map.addLayer(this.markers[line]);
          });
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

  /*  updatemarkersClusterStops() {
      this.LinesStations.forEach(line => {
        if (this.CheckboxFilterLines.includes(line.id)) {
          console.log("Eu estou selecionado", line);
        } else {
          line.checked = false;
        }
      });
  
      //atualiza checkboxList Values
      this.CheckBoxRoutes.forEach(checkBox => {
        if (!this.CheckboxFilterLines.includes(checkBox.id)) {
          checkBox.checked = false;
        } else {
          checkBox.checked = true;
        }
      });
      console.dir(this.LinesStations);
    }*/
}
