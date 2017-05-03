import { Component, Injectable } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/map';
import { DataProvider } from '../../providers/data-provider';

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html'
})

@Injectable()
export class ContactPage {

  private stops: any[];
  public selectedBusLine: any = [];
  public busLinesToPresent: any;

  constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController, public dataProvider: DataProvider) {
    this.busLinesToPresent = dataProvider.CheckBoxRoutes;
    console.dir(this.busLinesToPresent);
  }

  updateSelectedValue() {
    console.dir(this.selectedBusLine);
    this.dataProvider.CheckBoxRoutes.forEach(line => {
      if (line.id.id == this.selectedBusLine) {
        this.stops = line.id.stops;
        //console.log(this.stops);
      }
    });
  }

  showToast(stop: any) {
    let toast = this.toastCtrl.create({
      message: "Name: "+stop.name+"latitude: "+stop.lat+"Longitude: "+stop.lon,
      duration: 3000,
      position: 'top',
      showCloseButton: true
    });
    toast.onDidDismiss(() => {
      //console.log('Dismissed toast');
    });

    toast.present();
  }

}
