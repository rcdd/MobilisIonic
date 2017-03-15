import { Component } from '@angular/core';

import { NavController, ToastController } from 'ionic-angular';

import * as L from 'leaflet';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(public navCtrl: NavController, public toastCtrl: ToastController) {
  }

  ngOnInit(): void {
    var iconBus = L.icon({
      iconUrl: 'assets/icon/android-bus.png',
      //iconRetinaUrl: 'my-icon@2x.png',
      iconSize: [35, 35],
      //iconAnchor: [22, 94],
      //popupAnchor: [-3, -76],
      //shadowUrl: 'my-icon-shadow.png',
      //shadowRetinaUrl: 'my-icon-shadow@2x.png',
      //shadowSize: [68, 95],
      //shadowAnchor: [22, 94]
    });


    let map = L.map('mapid')
      .setView([39.7460465, -8.8059954], 14);
    map.locate({ setView: true });

    L.tileLayer('https://api.mapbox.com/styles/v1/rcdd/cj0b89eqw005a2sqh9zew1bew/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      // attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      attribution: 'Application power by RP&RD :)',
      // minZoom: 12.5,
      maxZoom: 18,
      // bounds: bounds,
      bounceAtZoomLimits: false,
      id: 'mapbox.mapbox-traffic-v1',
      accessToken: 'sk.eyJ1IjoicmNkZCIsImEiOiJjajBiOGhzOGUwMDF3MzNteDB1MzJpMTl6In0.1fiOkskHZqGiV20G95ENaA'
    }).addTo(map);

    function onLocationFound(e) {
      var radius = e.accuracy / 2;

      L.marker(e.latlng).addTo(map)
        .bindPopup("You are within " + radius + " meters from this point").openPopup();

      L.circle(e.latlng, radius).addTo(map);
    }

    function onLocationError(e) {
      //this.showToast('User denied localization. For better performance, please allow location.', 3000);
      alert('User denied localization. For better performance, please allow your location.');
    }

    map.on('locationerror', onLocationError);

    map.on('locationfound', onLocationFound);

    L.marker([39.7460465, -8.8059954], { icon: iconBus }).addTo(map);
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
