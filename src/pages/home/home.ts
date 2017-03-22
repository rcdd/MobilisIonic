import { Component } from '@angular/core';

import { NavController, ToastController } from 'ionic-angular';

import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/map';
import 'leaflet';
import 'leaflet.markercluster';

declare var L: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  private stops: any;
  private map: any;

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
    this.map.on('locationfound', function (e) {
      var radius = e.accuracy / 2;
      L.marker(e.latlng).addTo(self.map)
        .bindPopup("You are within " + radius + " meters from this point").openPopup();
      L.circle(e.latlng, radius).addTo(self.map);
    });
  }

  initMap(): void {

    let tiles = L.tileLayer('https://api.mapbox.com/styles/v1/rcdd/cj0b89eqw005a2sqh9zew1bew/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Application power by RD&RP :)',
      maxZoom: 18,
      id: 'mapbox.mapbox-traffic-v1',
      accessToken: 'sk.eyJ1IjoicmNkZCIsImEiOiJjajBiOGhzOGUwMDF3MzNteDB1MzJpMTl6In0.1fiOkskHZqGiV20G95ENaA'
    });

    this.map = L.map('mapid')
      .addLayer(tiles)
      .setView([39.7460465, -8.8059954], 14);
    this.map.locate({ setView: true });


  }


  getStopsStations() {
    return this.http.get(`http://194.210.216.191/otp/routers/default/index/stops`)
      .map((res: Response) => res.json()).subscribe(a => {
        this.stops = a;
        //console.log(this.stops);
        let markers = L.markerClusterGroup();
        this.stops.forEach(stop => {
          markers.addLayer(L.marker([stop.lat, stop.lon], { icon: this.iconBus, title: stop.name })
            .bindPopup(stop.name)
            .on('click', function (e) {
              this.openPopup();
            }));
        });

        this.map.addLayer(markers);
        this.map.fitBounds(markers.getBounds());
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

}
