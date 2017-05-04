import { Component, Injectable } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { DataProvider } from '../../providers/data-provider';
import { AlertController } from 'ionic-angular';

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html'
})

@Injectable()
export class ContactPage {

  private stops: any[];
  public selectedBusLine: any = [];
  public busLinesToPresent: any;

  constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController,
    public dataProvider: DataProvider,
    public alertCtrl: AlertController) {

    this.busLinesToPresent = dataProvider.CheckBoxRoutes;
    // console.dir(this.busLinesToPresent);
  }

  updateSelectedValue() {
    //console.dir(this.selectedBusLine);
    this.dataProvider.CheckBoxRoutes.forEach(line => {
      if (line.id.id == this.selectedBusLine) {
        this.stops = line.id.stops;
        //console.log(this.stops);
      }
    });
  }

  showToast(stop: any) {
    console.dir(stop);
    let toast = this.toastCtrl.create({
      message: "Name: " + stop.name + "latitude: " + stop.lat + "Longitude: " + stop.lon,
      duration: 3000,
      position: 'top',
      showCloseButton: true
    });
    toast.onDidDismiss(() => {
      //console.log('Dismissed toast');
    });

    toast.present();
    this.dataProvider.getTimeFromStop(stop.id).then(a => {
      let resp = a;
      console.dir(resp);
      let timesL: any[] = [];
      let msg = " Lines:";

      resp.forEach(pat => {
        timesL[pat.pattern.desc] = [];
        msg += " " + pat.pattern.desc + "; ";

        pat.times.forEach(time => {
          timesL[pat.pattern.desc].push({ realtimeArrival: time.realtimeArrival, realtimeDeparture: time.realtimeDeparture });
        });
      });

      console.dir(timesL);
      msg += "<br>TIME-STOP</br>";
      this.showAlert(stop.name, msg);
    });
  }

  showAlert(title: any, msg: any) {
    let alert = this.alertCtrl.create({
      title: title,
      subTitle: msg,
      buttons: ['OK']
    });
    alert.present();
  }
}
